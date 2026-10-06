import csv
import io
import os
import re
import secrets
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.middleware.proxy_fix import ProxyFix

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_socketio import SocketIO
from pymongo import MongoClient, ReturnDocument

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

client = MongoClient(os.getenv("MONGO_URI"))
db = client["canteen_db"]

IMAGE_DIR = os.path.join(BASE_DIR, "static", "images")


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def find_image(name):
    base = slug(name)
    for ext in ("jpg", "jpeg", "png", "webp"):
        if os.path.exists(os.path.join(IMAGE_DIR, f"{base}.{ext}")):
            return f"{base}.{ext}"
    return None


@app.route("/")
def home():
    return jsonify({"message": "Canteen backend is running"})


@app.route("/menu")
def get_menu():
    items = list(db.menu_items.find({"available": True}, {"_id": 0}))
    for it in items:
        file = find_image(it["name"])
        it["image_url"] = f"{request.host_url}static/images/{file}" if file else None
    return jsonify(items)


def next_token():
    """Token counter that restarts from 101 every day."""
    day = datetime.now().strftime("%Y-%m-%d")
    doc = db.counters.find_one_and_update(
        {"_id": day}, {"$inc": {"seq": 1}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    return 100 + doc["seq"]


def order_json(o):
    return {
        "id": str(o["_id"]),
        "token": o["token"],
        "type": o["type"],
        "items": o["items"],
        "total": o["total"],
        "payment": o["payment"],
        "status": o["status"],
        "created_at": o["created_at"].isoformat(),
        "time": o["created_at"].strftime("%I:%M %p"),
    }


@app.route("/orders", methods=["POST"])
def create_order():
    data = request.get_json(force=True)
    order_type = data.get("type")
    method = data.get("method")
    if order_type not in ("dine-in", "takeaway") or method not in ("upi", "card", "counter"):
        return jsonify({"error": "Invalid order type or payment method"}), 400

    lines, total = [], 0
    for l in data.get("items", []):
        qty = int(l.get("qty", 0))
        menu_item = db.menu_items.find_one({"name": l.get("name"), "available": True})
        if not menu_item or qty < 1 or qty > 50:
            return jsonify({"error": f"Invalid item: {l.get('name')}"}), 400

        extra = 0
        for opt in l.get("options", []):
            match = next((c for c in menu_item.get("customizations", []) if c["name"] == opt), None)
            if not match:
                return jsonify({"error": f"Invalid option: {opt}"}), 400
            extra += match["price"]

        unit = menu_item["price"] + extra
        total += unit * qty
        lines.append({"name": menu_item["name"], "options": l.get("options", []), "qty": qty, "unit": unit})

    if not lines:
        return jsonify({"error": "Cart is empty"}), 400

    paid = method in ("upi", "card")
    order = {
        "token": next_token(),
        "type": order_type,
        "items": lines,
        "total": total,
        "payment": {"method": method, "status": "paid" if paid else "pending"},
        "status": "preparing" if paid else "awaiting_payment",
        "created_at": datetime.now(),
    }
    db.orders.insert_one(order)
    socketio.emit("orders_changed")

    return jsonify({
        "id": str(order["_id"]),
        "token": order["token"], "type": order_type, "items": lines, "total": total,
        "payment": order["payment"], "status": order["status"],
        "time": order["created_at"].strftime("%I:%M %p"),
    }), 201


@app.route("/orders/active")
def active_orders():
    cursor = db.orders.find(
        {"status": {"$in": ["awaiting_payment", "preparing", "ready"]}}
    ).sort("created_at", 1)
    return jsonify([order_json(o) for o in cursor])


@app.route("/orders/<oid>")
def get_order(oid):
    try:
        o = db.orders.find_one({"_id": ObjectId(oid)})
    except Exception:
        o = None
    if not o:
        return jsonify({"error": "Order not found"}), 404
    data = order_json(o)
    data["ahead"] = 0
    if o["status"] == "preparing":
        data["ahead"] = db.orders.count_documents(
            {"status": "preparing", "created_at": {"$lt": o["created_at"]}}
        )
    return jsonify(data)


@app.route("/orders/<oid>/status", methods=["PATCH"])
def update_status(oid):
    status = (request.get_json(force=True) or {}).get("status")
    if status not in ("preparing", "ready", "completed"):
        return jsonify({"error": "Invalid status"}), 400
    result = db.orders.update_one({"_id": ObjectId(oid)}, {"$set": {"status": status}})
    if result.matched_count == 0:
        return jsonify({"error": "Order not found"}), 404
    socketio.emit("orders_changed")
    return jsonify({"ok": True})


@app.route("/orders/<oid>/confirm-payment", methods=["POST"])
def confirm_payment(oid):
    result = db.orders.update_one(
        {"_id": ObjectId(oid), "payment.status": "pending"},
        {"$set": {"payment.status": "paid", "status": "preparing"}},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Order not found or already paid"}), 404
    socketio.emit("orders_changed")
    return jsonify({"ok": True})

# ====================== ADMIN ======================
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "canteen123")
admin_tokens = set()


def admin_only(f):
    @wraps(f)
    def wrapper(*a, **k):
        if request.headers.get("X-Admin-Token") not in admin_tokens:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*a, **k)
    return wrapper


@app.route("/admin/login", methods=["POST"])
def admin_login():
    pw = (request.get_json(force=True) or {}).get("password")
    if pw != ADMIN_PASSWORD:
        return jsonify({"error": "Wrong password"}), 401
    token = secrets.token_hex(16)
    admin_tokens.add(token)
    return jsonify({"token": token})


def item_json(it):
    file = find_image(it["name"])
    return {
        "id": str(it["_id"]),
        "name": it["name"],
        "category": it["category"],
        "price": it.get("price"),
        "emoji": it.get("emoji", ""),
        "available": it.get("available", False),
        "customizations": it.get("customizations", []),
        "image_url": f"{request.host_url}static/images/{file}" if file else None,
    }


def parse_options(text):
    """'Extra Cheese:10, No Onion' -> [{'name': 'Extra Cheese', 'price': 10}, ...]"""
    out = []
    for part in (text or "").split(","):
        part = part.strip()
        if not part:
            continue
        name, _, price = part.partition(":")
        price = price.strip()
        out.append({"name": name.strip(), "price": int(price) if price.isdigit() else 0})
    return out


@app.route("/admin/menu")
@admin_only
def admin_menu():
    items = db.menu_items.find().sort([("category", 1), ("name", 1)])
    return jsonify([item_json(i) for i in items])


@app.route("/admin/menu", methods=["POST"])
@admin_only
def admin_add_item():
    f = request.form
    name = f.get("name", "").strip()
    category = f.get("category", "").strip()
    if not name or not category:
        return jsonify({"error": "Name and category are required"}), 400
    try:
        price = int(f.get("price", ""))
        if price < 0:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Enter a valid price"}), 400
    if db.menu_items.find_one({"name": re.compile(f"^{re.escape(name)}$", re.I)}):
        return jsonify({"error": "A dish with this name already exists"}), 409

    doc = {
        "name": name, "category": category, "price": price,
        "emoji": f.get("emoji", "").strip() or "🍽️",
        "image": "", "available": True,
        "customizations": parse_options(f.get("options")),
    }
    res = db.menu_items.insert_one(doc)

    img = request.files.get("image")
    if img and img.filename:
        ext = img.filename.rsplit(".", 1)[-1].lower()
        if ext in ("jpg", "jpeg", "png", "webp"):
            os.makedirs(IMAGE_DIR, exist_ok=True)
            img.save(os.path.join(IMAGE_DIR, f"{slug(name)}.{ext}"))

    return jsonify(item_json(db.menu_items.find_one({"_id": res.inserted_id}))), 201


@app.route("/admin/menu/<iid>", methods=["PATCH"])
@admin_only
def admin_edit_item(iid):
    data = request.get_json(force=True) or {}
    item = db.menu_items.find_one({"_id": ObjectId(iid)})
    if not item:
        return jsonify({"error": "Item not found"}), 404

    upd = {}
    if "price" in data:
        try:
            upd["price"] = int(data["price"])
            if upd["price"] < 0:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({"error": "Enter a valid price"}), 400
    if "available" in data:
        upd["available"] = bool(data["available"])
    if not upd:
        return jsonify({"error": "Nothing to update"}), 400
    if upd.get("available") and upd.get("price", item.get("price")) is None:
        return jsonify({"error": "Set a price first"}), 400

    db.menu_items.update_one({"_id": item["_id"]}, {"$set": upd})
    return jsonify({"ok": True})


@app.route("/admin/menu/<iid>", methods=["DELETE"])
@admin_only
def admin_delete_item(iid):
    r = db.menu_items.delete_one({"_id": ObjectId(iid)})
    return jsonify({"deleted": r.deleted_count})


@app.route("/admin/stats")
@admin_only
def admin_stats():
    days = min(max(int(request.args.get("days", 7)), 1), 90)
    start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    match = {"$match": {"created_at": {"$gte": start}, "payment.status": "paid"}}

    def agg(*stages):
        return list(db.orders.aggregate([match, *stages]))

    line_total = {"$multiply": ["$items.unit", "$items.qty"]}

    t = agg({"$group": {"_id": None, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}})
    totals = t[0] if t else {"orders": 0, "revenue": 0}

    per_day = {r["_id"]: r for r in agg({"$group": {
        "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
        "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}})}
    daily = []
    for i in range(days):
        d = start + timedelta(days=i)
        r = per_day.get(d.strftime("%Y-%m-%d"), {})
        daily.append({"day": d.strftime("%d %b"), "revenue": r.get("revenue", 0), "orders": r.get("orders", 0)})

    top = agg({"$unwind": "$items"},
              {"$group": {"_id": "$items.name", "sold": {"$sum": "$items.qty"}, "revenue": {"$sum": line_total}}},
              {"$sort": {"sold": -1}}, {"$limit": 8})

    hours = {r["_id"]: r["orders"] for r in agg(
        {"$group": {"_id": {"$hour": "$created_at"}, "orders": {"$sum": 1}}})}
    lo, hi = min([7, *hours]), max([19, *hours])
    by_hour = [{"hour": f"{h}:00", "orders": hours.get(h, 0)} for h in range(lo, hi + 1)]

    by_payment = agg({"$group": {"_id": "$payment.method", "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}})
    by_cat = agg({"$unwind": "$items"},
                 {"$lookup": {"from": "menu_items", "localField": "items.name", "foreignField": "name", "as": "m"}},
                 {"$unwind": "$m"},
                 {"$group": {"_id": "$m.category", "revenue": {"$sum": line_total}}},
                 {"$sort": {"revenue": -1}})

    return jsonify({
        "orders": totals["orders"],
        "revenue": totals["revenue"],
        "active": db.orders.count_documents({"status": {"$in": ["awaiting_payment", "preparing", "ready"]}}),
        "daily": daily,
        "top": [{"name": r["_id"], "sold": r["sold"], "revenue": r["revenue"]} for r in top],
        "by_hour": by_hour,
        "by_payment": [{"name": r["_id"].upper(), "value": r["revenue"]} for r in by_payment],
        "by_category": [{"name": r["_id"], "value": r["revenue"]} for r in by_cat],
    })


@app.route("/admin/export")
@admin_only
def admin_export():
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Token", "Date", "Time", "Type", "Payment", "Status", "Items", "Total"])
    for o in db.orders.find().sort("created_at", -1):
        items = "; ".join(f"{l['qty']}x {l['name']}" for l in o["items"])
        w.writerow([o["token"], o["created_at"].strftime("%Y-%m-%d"), o["created_at"].strftime("%H:%M"),
                    o["type"], o["payment"]["method"], o["status"], items, o["total"]])
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=orders.csv"})

if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)