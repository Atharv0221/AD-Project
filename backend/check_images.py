import os, re
from dotenv import load_dotenv
from pymongo import MongoClient

base = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base, ".env"))
db = MongoClient(os.getenv("MONGO_URI"))["canteen_db"]
folder = os.path.join(base, "static", "images")
files = os.listdir(folder)

def slug(n):
    return re.sub(r"[^a-z0-9]+", "_", n.lower()).strip("_")

for it in db.menu_items.find({"available": True}):
    s = slug(it["name"])
    ok = any(f.lower().startswith(s + ".") for f in files)
    print(("OK       " if ok else "MISSING  ") + it["name"] + "  ->  " + s)