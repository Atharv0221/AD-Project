# Smart Self-Ordering Canteen Management System

A self-ordering kiosk for a college canteen, inspired by McDonald's ordering screens. Students order, customise, pay and track their food on one screen. Canteen staff manage orders in a kitchen view, and the admin gets a sales dashboard with charts.

Built with **React (Vite)**, **Python (Flask + Flask-SocketIO)** and **MongoDB Atlas**.

## Features

**Student kiosk**
- Welcome screen with language choice (English, Hindi, Marathi)
- Dine-In or Takeaway
- Menu with category sidebar and real cafeteria photos
- Customisation sheet (for example No Sugar, Extra Pav) with live price
- Cart with quantity changes and a total
- Payment: UPI (demo QR), Card (demo) or Pay at counter
- Token number, then **live order tracking** (Preparing, Ready, Collected) with a sound alert when ready

**Kitchen screen** (`/kitchen`)
- Orders in three columns: Awaiting payment, Preparing, Ready
- Confirm cash payment, mark ready, mark collected
- Waiting time per order, live updates

**Admin panel** (`/admin`, password protected)
- Dashboard: revenue, paid orders, average order, active orders
- Charts: sales trend, top sellers, peak hours, revenue by payment method and by category
- Menu manager: edit prices, mark sold out, delete, search
- Add a dish with photo and customisation options
- Export all orders to CSV

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Vite, Recharts, Lucide icons, plain CSS |
| Backend | Python, Flask, Flask-CORS, Flask-SocketIO |
| Database | MongoDB Atlas (PyMongo) |
| Real time | Socket.IO, with a polling backup |

## Project structure

```
AD Project/
├── backend/
│   ├── app.py              # all API routes
│   ├── seed_menu.py        # loads the cafeteria menu into MongoDB
│   ├── demo_queries.py     # prints example MongoDB queries
│   ├── check_images.py     # finds menu items with no photo
│   ├── static/images/      # food photos (tea.jpg, vada_pav.jpg ...)
│   ├── .env                # secrets (not in Git)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/          # Welcome, DiningChoice, Menu, Cart, Payment,
        │                   # Token, Kitchen, Admin
        ├── context.jsx     # shared state (language, cart, order type)
        ├── i18n.js         # translations
        └── *.css
```

## Setup

### Requirements
- Python 3.10 or newer
- Node.js (LTS)
- A free MongoDB Atlas cluster

### 1. Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install flask flask-cors pymongo flask-socketio python-dotenv
```

Create `backend/.env`:

```
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
ADMIN_PASSWORD=choose-a-password
```

Load the menu, then start the server:

```powershell
python seed_menu.py
python app.py
```

The API runs at `http://localhost:5000`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### 3. Photos

Put food photos in `backend/static/images/`. The file name is the dish name in lowercase with underscores, for example `vada_pav.jpg`. A dish without a photo shows its emoji instead. Run `python check_images.py` to see which dishes have no photo.

## Pages

| Address | Who uses it |
|---|---|
| `/` | Student kiosk |
| `/kitchen` | Canteen staff |
| `/admin` | Canteen manager |

## Database design

**menu_items**
```json
{ "name": "Vada Pav", "category": "Breakfast", "price": 20, "emoji": "🍔",
  "available": true,
  "customizations": [{ "name": "Extra Pav", "price": 5 }] }
```

**orders**
```json
{ "token": 101, "type": "dine-in",
  "items": [{ "name": "Vada Pav", "options": ["Extra Pav"], "qty": 2, "unit": 25 }],
  "total": 50,
  "payment": { "method": "upi", "status": "paid" },
  "status": "preparing", "created_at": "..." }
```

**counters**: one document per day holding the token sequence (`{ "_id": "2026-10-06", "seq": 12 }`).

Order status flow: `awaiting_payment` → `preparing` → `ready` → `completed`.

## API overview

| Method | Route | Purpose |
|---|---|---|
| GET | `/menu` | Available dishes with image URLs |
| POST | `/orders` | Place an order (prices recalculated on the server) |
| GET | `/orders/active` | Unfinished orders for the kitchen |
| GET | `/orders/<id>` | One order, with the number of orders ahead |
| PATCH | `/orders/<id>/status` | Kitchen updates the status |
| POST | `/orders/<id>/confirm-payment` | Cashier confirms cash payment |
| POST | `/admin/login` | Staff login, returns a session token |
| GET / POST | `/admin/menu` | List all dishes, add a dish with photo |
| PATCH / DELETE | `/admin/menu/<id>` | Edit price or availability, delete |
| GET | `/admin/stats?days=7` | Dashboard data (MongoDB aggregations) |
| GET | `/admin/export` | Orders as CSV |

Admin routes need the `X-Admin-Token` header returned by the login route.

## Design decisions

- **Server-side pricing:** the backend reads prices from the database, so the browser cannot change them.
- **Atomic token counter:** `find_one_and_update` with `$inc` and `upsert` stops two students getting the same token.
- **Real time:** Socket.IO pushes an `orders_changed` event, and screens also refresh by polling every 5 to 10 seconds in case the socket drops.
- **Why MongoDB:** dishes with nested customisation lists fit a document model without extra join tables.

## Known limitations

- Payment is a demo simulation. A real version would use a gateway such as Razorpay.
- Admin sessions are kept in memory and reset when the server restarts.
- The kitchen page has no login yet.
- There is no student login or loyalty points yet.

## Possible future work

- Razorpay payment integration
- Student ID login with loyalty points and wallet
- Staff accounts with roles
- Stock counts per dish and low-stock alerts
- Deployment (Vercel for the frontend, Render for the backend)


