# ShopKart — Mini E-Commerce Storefront

A small demo storefront for fictional everyday tech: browse eight products,
filter and sort the catalog, quick-view details, open a product page, manage
a cart, and check out. Built as a **self-directed portfolio piece** — it is
not client work, and there are no clients, testimonials, or usage stats
behind it. All products, prices, and reviews are invented for the demo.

## What it does

- **Home** (`index.html`) — hero, store perks, featured products, shop-by-category tiles
- **Shop** (`shop.html`) — full catalog with category filter pills, live search, and price/rating sorting; accepts `?cat=Audio` etc.
- **Product detail** (`product.html?id=aria-headphones`) — full description, quantity stepper, add-to-cart, buy-now, related products
- **Cart & checkout** (`cart.html`) — line items with quantity controls, free-shipping progress ($50 threshold), and a checkout form
- Quick-view modal and slide-in cart drawer (Bootstrap offcanvas) on every page
- Cart persisted in `localStorage`; scroll-reveal animations and hover states throughout
- Photos via picsum.photos seeds

## Stack

HTML · CSS (custom properties, on top of Bootstrap 5) · Bootstrap 5 (CDN) ·
vanilla JavaScript · PHP (dependency-free) · Node.js / Express

| Layer | Files | Runs where |
| ----- | ----- | ---------- |
| Frontend | `index.html`, `shop.html`, `product.html`, `cart.html`, `products.js`, `app.js`, `style.css` | Any static host (GitHub Pages included) |
| PHP backend | `checkout.php`, `products.php`, `data/orders.json` | Any cheap shared PHP host — **not** GitHub Pages |
| Node/Express API | `server/server.js`, `server/package.json`, `server/README-SERVER.md`, `server/data/orders.json` | Anywhere Node runs; `npm start` on port 3000 |

## How the frontend talks to a backend

The frontend tries backends in order and is honest about which one answered:

1. **Node/Express API** — `GET <apiBase>/api/products` and `POST <apiBase>/api/checkout`.
   `apiBase` is set in one place, `SHOPKART_CONFIG.apiBase` in `products.js`
   (default `""` = same origin, i.e. `/api/...`).
2. **PHP backend** — `products.php` / `checkout.php` (only answers on a PHP host).
3. **No backend** — the catalog falls back to the embedded data in
   `products.js`, and checkout shows a clearly labelled demo state:
   *"Demo mode — no backend connected. No order was placed, stored, or
   emailed."* A submission is never faked.

The footer on every page states which catalog source is live
(API / PHP / built-in demo data).

## Run it locally

### Static only (no backend)

```bash
# from the project root — any static server works
python3 -m http.server 8000
# open http://localhost:8000 — catalog from built-in data, checkout in demo mode
```

Opening the files directly (`file://`) also works, with the same demo-mode
behaviour. (On `file://` the API fetch fails outright and the fallback kicks in.)

### With the Node/Express API (recommended)

```bash
cd server
npm install   # Express only, no database server
npm start     # http://localhost:3000 — storefront + API together
```

Full setup, endpoints, and curl examples: [`server/README-SERVER.md`](server/README-SERVER.md).
Orders land in `server/data/orders.json`.

### With the PHP backend

Upload this whole folder to any PHP host (shared hosting works — no
dependencies, no database). Visit the site there and the frontend will use
`products.php` / `checkout.php`; orders land in `data/orders.json`.
To test locally you need PHP installed (`php -S localhost:8080` from the
project root).

## API reference (Node and PHP behave the same)

- `GET /api/products` (Node) / `products.php` — `{ "products": [...] }`
- `POST /api/checkout` (Node) / `checkout.php` — JSON body
  `{ name, email, address, city, zip, items: [{ id, qty }] }`
  → `{ "ok": true, "orderId": "SK-…" }`, or HTTP 400 `{ "ok": false, "error": "…" }`
  for a missing/invalid field, an empty cart, an unknown product id, or a
  quantity outside 1–9.

## A note on the backends

The PHP and Node/Express pieces are **learning/expansion work** added to
practise backend basics — routing, validation, and storing orders in a JSON
file. They are not professional client experience, and neither is production
infrastructure: no auth, no payments, no rate limiting. The storefront
itself is a frontend portfolio piece first; the backends exist so the
checkout flow can be real instead of mocked.

## Live demo

https://khushee16.github.io/shopkart/ — static hosting, so it runs in demo
mode: full catalog and cart work, checkout shows the labelled demo state.
