import os
from dotenv import load_dotenv
from pymongo import MongoClient
import re

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
client = MongoClient(os.getenv("MONGO_URI"))
db = client["canteen_db"]


def item(name, category, price, emoji, custom=None):
    return {
        "name": name,
        "category": category,
        "price": price,                 # None = price not on the board yet
        "emoji": emoji,                 # placeholder until you add real images
        "image": slug(name) + ".jpg",
        "available": price is not None,
        "customizations": custom or [],
    }


no_sugar = {"name": "No Sugar", "price": 0}
less_sugar = {"name": "Less Sugar", "price": 0}
spicy = {"name": "Extra Spicy", "price": 0}
extra_pav = {"name": "Extra Pav", "price": 5}
extra_sambar = {"name": "Extra Sambar", "price": 10}
extra_chutney = {"name": "Extra Chutney", "price": 0}

menu = [
    # ---------- Hot Drinks ----------
    item("Tea", "Hot Drinks", 15, "🍵", [no_sugar, less_sugar]),              # CHECK
    item("Special Tea", "Hot Drinks", 18, "🍵", [no_sugar, less_sugar]),      # CHECK
    item("Black Tea", "Hot Drinks", 20, "🍵", [no_sugar]),
    item("Lemon Tea", "Hot Drinks", 20, "🍋", [no_sugar]),
    item("Green Tea", "Hot Drinks", 20, "🍵"),
    item("Coffee", "Hot Drinks", 25, "☕", [no_sugar, less_sugar]),
    item("Black Coffee", "Hot Drinks", 20, "☕", [no_sugar]),
    item("Strong Coffee", "Hot Drinks", 30, "☕", [no_sugar]),
    item("Hot Chocolate", "Hot Drinks", 45, "🍫"),

    # ---------- Cold Drinks ----------
    item("Masala Tak", "Cold Drinks", 30, "🥛"),
    item("Lassi", "Cold Drinks", None, "🥛"),        # price blank on board
    item("Kokam", "Cold Drinks", None, "🥤"),        # price blank on board

    # ---------- Breakfast ----------
    item("Pohe", "Breakfast", 25, "🍚", [spicy]),                              # CHECK
    item("Upit / Upma", "Breakfast", 25, "🍚", [spicy]),                       # CHECK
    item("Patties", "Breakfast", 20, "🥟"),                                    # CHECK
    item("Vada Pav", "Breakfast", 20, "🍔", [spicy, extra_pav, extra_chutney]),
    item("Idli Sambar", "Breakfast", 50, "🍚", [extra_sambar]),
    item("Medu Vada Sambar", "Breakfast", 50, "🍩", [extra_sambar]),
    item("Batata Vada Sambar", "Breakfast", 60, "🍘", [extra_sambar]),         # CHECK name
    item("Misal Pav", "Breakfast", 60, "🍲", [spicy, extra_pav]),
    item("Pav Bhaji", "Breakfast", None, "🍲", [extra_pav]),                   # price blank
    item("Sabudana Khichdi", "Breakfast", 40, "🍚"),

    # ---------- Lunch ----------
    item("Thalipith", "Lunch", None, "🥞"),                                    # price blank
    item("Rice or Bhaji", "Lunch", 30, "🍛"),                                  # CHECK
    item("Veg Pulao", "Lunch", 60, "🍚"),                                      # CHECK
    item("Dal Rice", "Lunch", 50, "🍛"),
    item("Poli Bhaji", "Lunch", 50, "🍛"),
    item("Puri Bhaji", "Lunch", 70, "🍛"),                                     # CHECK
    item("Full Meal", "Lunch", 90, "🍽️"),
    item("Aloo Paratha", "Lunch", None, "🫓"),                                 # price blank
    item("Methi Paratha", "Lunch", None, "🫓"),                                # price blank
    item("Palak Paratha", "Lunch", None, "🫓"),                                # price blank
    item("Extra Chapati", "Lunch", 10, "🫓"),
]

db.menu_items.delete_many({})       # clears old items so you never get duplicates
db.menu_items.insert_many(menu)
print(f"Inserted {len(menu)} items")