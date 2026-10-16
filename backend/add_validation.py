import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
db = MongoClient(os.getenv("MONGO_URI"))["canteen_db"]

NUM = ["int", "long", "double"]

ORDERS = {"$jsonSchema": {
    "bsonType": "object",
    "required": ["token", "type", "items", "total", "payment", "status", "created_at"],
    "properties": {
        "token":  {"bsonType": ["int", "long"], "minimum": 101},
        "type":   {"enum": ["dine-in", "takeaway"]},
        "total":  {"bsonType": NUM, "minimum": 0},
        "status": {"enum": ["awaiting_payment", "preparing", "ready", "completed"]},
        "created_at": {"bsonType": "date"},
        "items": {
            "bsonType": "array", "minItems": 1,
            "items": {
                "bsonType": "object",
                "required": ["name", "qty", "unit"],
                "properties": {
                    "item_id":  {"bsonType": "objectId"},
                    "category": {"bsonType": "string"},
                    "name": {"bsonType": "string"},
                    "qty":  {"bsonType": ["int", "long"], "minimum": 1, "maximum": 50},
                    "unit": {"bsonType": NUM, "minimum": 0},
                },
            },
        },
        "payment": {
            "bsonType": "object",
            "required": ["method", "status"],
            "properties": {
                "method": {"enum": ["upi", "card", "counter"]},
                "status": {"enum": ["paid", "pending"]},
            },
        },
    },
}}

MENU = {"$jsonSchema": {
    "bsonType": "object",
    "required": ["name", "category", "available"],
    "properties": {
        "name":      {"bsonType": "string", "minLength": 1},
        "category":  {"bsonType": "string", "minLength": 1},
        "price":     {"bsonType": ["int", "long", "double", "null"], "minimum": 0},
        "available": {"bsonType": "bool"},
        "customizations": {"bsonType": "array"},
    },
}}


def apply(name, validator):
    if name in db.list_collection_names():
        db.command("collMod", name, validator=validator,
                   validationLevel="moderate", validationAction="error")
    else:
        db.create_collection(name, validator=validator)
    print("Validation applied to", name)


apply("orders", ORDERS)
apply("menu_items", MENU)