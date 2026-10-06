import os
import re
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from pymongo import MongoClient, ReturnDocument

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)
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


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)