import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
db = MongoClient(os.getenv("MONGO_URI"))["canteen_db"]

menu = {m["name"]: m for m in db.menu_items.find()}
fixed = 0
for o in db.orders.find({"items.item_id": {"$exists": False}}):
    for ln in o["items"]:
        m = menu.get(ln["name"])
        if m:
            ln["item_id"] = m["_id"]
            ln["category"] = m["category"]
    db.orders.update_one({"_id": o["_id"]}, {"$set": {"items": o["items"]}})
    fixed += 1
print("Orders updated:", fixed)