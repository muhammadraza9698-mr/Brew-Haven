# Brew Haven

A full-stack web application for an artisan coffee shop: public menu browsing, customer cart and checkout with delivery details, and an admin area for **inventory** management and **order visibility**. Built with Node.js and Express on the backend, served as a single-page application on the frontend.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

---

## Features

- **Authentication** — JWT-based sessions via `httpOnly` cookies; bcrypt password hashing
- **Role-based access**
  - **Customers** — Browse the menu, search items, add to cart, checkout with delivery address and optional notes, place orders
  - **Admins** — Manage **inventory** (add, **edit**, remove items); **View orders** for all customers (order number, line items with quantities, delivery address); no cart or checkout
- **REST API** — Menu CRUD, cart, and orders with input validation
- **SPA routing** — Hash-based client-side navigation (`#/login`, `#/register`, `#/menu`, `#/cart`, `#/checkout`, `#/orders` for admins)
- **Rate limiting** — Auth and API endpoints are individually rate-limited
- **Security** — Helmet, CORS, and `SameSite=Strict` cookie policy

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Auth | JSON Web Tokens + bcryptjs |
| Security | helmet, cors, express-rate-limit |
| Frontend | Vanilla JS (no bundler) |
| Data | JSON files + in-memory stores (see [Data persistence](#data-persistence)) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-username/brew-haven.git
cd brew-haven
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
PORT=3000
JWT_SECRET=your-secure-random-secret-here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

> **Important:** Use a strong, randomly generated value for `JWT_SECRET` in production.

### Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Open `http://localhost:3000` in your browser.

## Default Admin Account

A seeded admin account is created on startup for development:

| Field | Value |
|---|---|
| Email | `admin@brewhaven.com` |
| Password | `admin123` |

> Update or remove this in `routes/auth.js` before deploying.

## User interface notes

- **Customers** see the main nav link **Menu**, plus **Cart** and **Checkout** when logged in.
- **Admins** see **Inventory** (same route as `#/menu`, relabeled in the UI), **View orders** (`#/orders`), and no cart or checkout links.
- Admins can **Edit** any inventory item inline (name, price, category, description) or **Remove** it (two-step confirmation on the button).

## Project Structure

```
brew-haven/
├── server.js           # App entry point
├── .env                # Environment variables
├── data/
│   ├── menu.json       # Menu seed data (loaded at startup)
│   ├── carts.json      # Per-user cart lines (persisted on cart changes)
│   └── orders.json     # Placed orders (persisted when an order is created)
├── middleware/
│   └── auth.js         # JWT verification; `requireAdmin`
├── routes/
│   ├── auth.js         # Authentication routes
│   ├── menu.js         # Menu CRUD + `findMenuItemById` for cart/orders
│   ├── cart.js         # Authenticated customer cart (admins blocked)
│   └── orders.js       # Place order, list own orders, admin list all
└── public/             # Static frontend (SPA)
    ├── index.html
    ├── style.css
    └── app.js
```

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create a new account |
| `POST` | `/api/auth/login` | Public | Login and receive session cookie |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/auth/me` | Required | Get current user info |

### Menu

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/menu` | Public | List items (`?search=`, `?category=`; `category` omit or `all` for every category) |
| `GET` | `/api/menu/:id` | Public | Get one item |
| `POST` | `/api/menu` | Admin | Create item (`name`, `price`, `description`, `category`) |
| `PATCH` | `/api/menu/:id` | Admin | Update fields: `name` (min 2 chars), `price`, `description` (non-empty), `category` (`hot` \| `cold` \| `special`) |
| `DELETE` | `/api/menu/:id` | Admin | Delete item |

### Cart (customers only)

All routes require authentication. **Administrator accounts receive `403`** on every cart endpoint.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cart` | Customer | Current cart with priced lines and `subtotal`; stale menu IDs are dropped |
| `POST` | `/api/cart/items` | Customer | Body: `{ "menuItemId": number, "quantity": number }` (quantity 1–99; merges with existing line) |
| `PATCH` | `/api/cart/items/:menuItemId` | Customer | Body: `{ "quantity": number }` |
| `DELETE` | `/api/cart/items/:menuItemId` | Customer | Remove line |
| `DELETE` | `/api/cart` | Customer | Clear cart |

### Orders

All routes require authentication.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders/all` | Admin | All orders, newest first |
| `GET` | `/api/orders` | Customer | Current user’s orders only (`403` for admin) |
| `POST` | `/api/orders` | Customer | Place order from server cart; **admin `403`**. Body below. |

**`POST /api/orders` body (customer)**

| Field | Required | Notes |
|---|---|---|
| `deliveryStreet` | Yes | 5–200 characters |
| `deliveryCity` | Yes | 2–100 characters |
| `deliveryState` | No | Max 50 characters |
| `deliveryPostalCode` | No | Max 20 characters |
| `orderNotes` | No | Max 500 characters |

Totals and line prices are computed from the **live menu** at checkout. On success the user’s cart is cleared and an order is appended to `data/orders.json`.

**Order object (stored and returned)**

Includes: `id`, `userId`, `userName`, `userEmail`, `items` (each with `menuItemId`, `name`, `price`, `category`, `quantity`, `lineTotal`), `subtotal`, `delivery` (`street`, `city`, optional `state`, `postalCode`), optional `orderNotes`, `status` (e.g. `pending`), `createdAt` (ISO string).

### Request / response examples

**Login**

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@brewhaven.com", "password": "admin123" }
```

```json
{
  "message": "Welcome back!",
  "user": { "id": 1, "name": "Admin", "email": "admin@brewhaven.com", "role": "admin" }
}
```

**Add menu item (admin)**

```http
POST /api/menu
Content-Type: application/json
Cookie: token=…

{ "name": "Vanilla Latte", "price": 5.75, "description": "…", "category": "hot" }
```

**Update menu item (admin)**

```http
PATCH /api/menu/3
Content-Type: application/json
Cookie: token=…

{ "name": "Vanilla Latte", "price": 5.95, "description": "…", "category": "hot" }
```

**Place order (customer)**

```http
POST /api/orders
Content-Type: application/json
Cookie: token=…

{
  "deliveryStreet": "123 Main St, Apt 4",
  "deliveryCity": "Springfield",
  "deliveryState": "IL",
  "deliveryPostalCode": "62701",
  "orderNotes": "Ring doorbell twice"
}
```

```json
{
  "message": "Order placed successfully.",
  "order": { "id": 1, "subtotal": 12.5, "delivery": { "street": "…", "city": "…" }, "items": [ … ] }
}
```

## Data persistence

| Store | File | Behavior |
|---|---|---|
| Menu | `data/menu.json` | Loaded into memory at server start. Create/update/delete in the API **do not** write back to `menu.json`; changes are lost on restart unless you add file persistence or a database. |
| Carts | `data/carts.json` | Read from disk at the start of each cart request; written when cart lines change. Keeps per-user `{ userId, items: [{ menuItemId, quantity }] }` rows. |
| Orders | `data/orders.json` | Appended when a customer places an order; admin `GET /api/orders/all` reloads from disk before responding. |

For production, consider replacing or augmenting these stores with a real database and optional write-through for the menu.

## License

MIT
