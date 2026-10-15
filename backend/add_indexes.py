import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
db = MongoClient(os.getenv("MONGO_URI"))["canteen_db"]

db.menu_items.create_index("name", unique=True)
db.menu_items.create_index([("category", ASCENDING), ("available", ASCENDING)])
db.orders.create_index([("created_at", DESCENDING)])
db.orders.create_index([("status", ASCENDING), ("created_at", ASCENDING)])
db.orders.create_index("token")

for coll in ("menu_items", "orders"):
    print("\n" + coll)
    for name, info in db[coll].index_information().items():
        print("  ", name, info["key"])