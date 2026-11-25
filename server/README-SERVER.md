# ShopKart — Node.js / Express API

The backend for the ShopKart demo storefront. One dependency (Express), no
database server — orders are stored in a JSON file (`server/data/orders.json`).

> This is a **learning / expansion piece** built to practise backend basics
> (routing, validation, JSON file storage). It is not professional client
> experience and not production infrastructure: there is no auth, no payment
> processing, and no rate limiting.

## Endpoints

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET | `/api/health` | `{ ok: true, service: "shopkart", time }` |
| GET | `/api/products` | The 8-product catalog as JSON (same data as `products.js` / `products.php`) |
| POST | `/api/checkout` | Validates name / email / address / city / ZIP / cart items, stores the order, returns `{ ok: true, orderId }` |

The server also serves the storefront itself (the project root) as static
files, so one command gives you pages + API together.

## Setup & run

```bash
cd server
npm install   # installs Express only
npm start     # serves the store at http://localhost:3000
```

Open http://localhost:3000 — the footer on every page will say
"Catalog served live from the Node/Express API" once the API answers.

Change the port with `PORT=4000 npm start`.

## Try it with curl

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/products
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","address":"1 Main St","city":"Glassboro","zip":"08028","items":[{"id":"aria-headphones","qty":1}]}'
```

Invalid orders get HTTP 400 with `{"ok": false, "error": "..."}` — e.g. a bad
email, an empty cart, an unknown product id, or a quantity outside 1–9.

## Where orders go

`server/data/orders.json` — one JSON array, one entry per order, including an
`orderId` like `SK-...`, the customer details, items, and a timestamp.
(The PHP backend writes to a separate `data/orders.json` in the project root.)

## How the frontend finds this API

`products.js` holds `SHOPKART_CONFIG.apiBase` — `""` by default, meaning
"same origin" (`/api/...`). The frontend tries the API first and falls back
to the embedded catalog in `products.js` when the API is not running (for
example on GitHub Pages). See the main README for the full picture.
