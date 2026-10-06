import os
from dotenv import load_dotenv
from pymongo import MongoClient

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
print("Looking for:", env_path)
print("File exists:", os.path.exists(env_path))

load_dotenv(env_path)
uri = os.getenv("MONGO_URI")
print("URI loaded:", uri is not None)

client = MongoClient(uri, serverSelectionTimeoutMS=8000)
print(client.admin.command("ping"))