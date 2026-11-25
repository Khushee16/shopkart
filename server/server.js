/**
 * ShopKart — Node.js / Express API
 * ---------------------------------
 * Endpoints:
 *   GET  /api/health    -> { ok: true, service: "shopkart", time: ... }
 *   GET  /api/products  -> { products: [...] }  (same catalog as products.js / products.php)
 *   POST /api/checkout  -> validates the order, stores it in
 *                          server/data/orders.json, returns { ok: true, orderId }
 *
 * Static serving: this server also serves the storefront itself from the
 * project root (../), so `npm start` gives you the whole demo — pages plus
 * API — on http://localhost:3000.
 *
 * No database server: orders live in a JSON file. This is a learning /
 * portfolio piece, not production infrastructure — there is no auth,
 * no payment processing, and no rate limiting.
 *
 * Run:  npm install && npm start        (port 3000, or set PORT)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");
const PROJECT_ROOT = path.join(__dirname, "..");

app.use(express.json());

/* ------------------------------------------------------------------ */
/* Catalog — kept in sync with products.js and products.php            */
/* ------------------------------------------------------------------ */
const PRODUCTS = [
  { id: "aria-headphones", name: "Aria Wireless Headphones", category: "Audio", price: 129, rating: 4.8, reviews: 214, badge: "Bestseller", featured: true, seed: "aria-headphones",
    desc: "Over-ear comfort with 40-hour battery life, active noise cancellation, and memory-foam earcups you'll forget you're wearing." },
  { id: "pulse-smartwatch", name: "Pulse Smartwatch", category: "Wearables", price: 199, rating: 4.7, reviews: 186, badge: "New", featured: true, seed: "pulse-smartwatch",
    desc: "Heart-rate, sleep, and 90+ workout modes on a bright always-on display. 10-day battery, 5ATM water resistance." },
  { id: "ember-lamp", name: "Ember Desk Lamp", category: "Home", price: 59, rating: 4.6, reviews: 98, badge: "", featured: false, seed: "ember-desk-lamp",
    desc: "A warm, flicker-free glow with stepless dimming and three color temperatures. Aluminum build, touch controls." },
  { id: "nomad-backpack", name: "Nomad Backpack", category: "Accessories", price: 89, rating: 4.9, reviews: 342, badge: "Bestseller", featured: true, seed: "nomad-backpack",
    desc: "22L weatherproof commuter pack with a padded 16-inch laptop sleeve, magnetic buckles, and a hidden AirTag pocket." },
  { id: "volt-speaker", name: "Volt Bluetooth Speaker", category: "Audio", price: 79, rating: 4.5, reviews: 157, badge: "", featured: false, seed: "volt-speaker",
    desc: "Room-filling 360° sound, 24-hour playtime, and IPX7 waterproofing. Pair two for true wireless stereo." },
  { id: "halo-bulbs", name: "Halo Smart Bulbs (4-pack)", category: "Home", price: 49, rating: 4.4, reviews: 121, badge: "Sale", featured: false, seed: "halo-bulbs",
    desc: "16 million colors, schedules, and sunrise simulation. Works with all major voice assistants — no hub required." },
  { id: "orbit-band", name: "Orbit Fitness Band", category: "Wearables", price: 99, rating: 4.6, reviews: 203, badge: "", featured: true, seed: "orbit-band",
    desc: "Featherlight tracker with SpO2, stress monitoring, and 14-day battery. Swim-proof and endlessly customizable." },
  { id: "canvas-sleeve", name: "Canvas Laptop Sleeve", category: "Accessories", price: 39, rating: 4.7, reviews: 176, badge: "", featured: false, seed: "canvas-sleeve",
    desc: "Waxed canvas with a soft flannel lining and a front pocket for chargers. Fits 13–14 inch laptops snugly." }
];
const KNOWN_IDS = new Set(PRODUCTS.map((p) => p.id));

/* ------------------------------------------------------------------ */
/* Order storage (JSON file, no database)                              */
/* ------------------------------------------------------------------ */
function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function appendOrder(order) {
  fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
  const orders = readOrders();
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2) + "\n", "utf8");
  return order;
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "shopkart", time: new Date().toISOString() });
});

app.get("/api/products", (req, res) => {
  res.json({ products: PRODUCTS });
});

app.post("/api/checkout", (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const address = String(body.address || "").trim();
  const city = String(body.city || "").trim();
  const zip = String(body.zip || "").trim();
  const items = body.items;

  // Validation mirrors checkout.php and the frontend form.
  if (!name) return res.status(400).json({ ok: false, error: "Name is required." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "A valid email address is required." });
  }
  if (!address) return res.status(400).json({ ok: false, error: "Street address is required." });
  if (!city) return res.status(400).json({ ok: false, error: "City is required." });
  if (!zip) return res.status(400).json({ ok: false, error: "ZIP / postal code is required." });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "Cart is empty." });
  }

  const cleanItems = [];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid cart item." });
    }
    const id = String(item.id || "");
    const qty = Number(item.qty);
    if (!KNOWN_IDS.has(id)) {
      return res.status(400).json({ ok: false, error: "Unknown product id: " + id });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 9) {
      return res.status(400).json({ ok: false, error: "Quantity for " + id + " must be between 1 and 9." });
    }
    cleanItems.push({ id, qty });
  }

  const orderId = "SK-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const order = {
    orderId,
    name,
    email,
    address,
    city,
    zip,
    items: cleanItems,
    subtotal: typeof body.subtotal === "number" ? body.subtotal : null,
    createdAt: new Date().toISOString(),
    source: "node"
  };

  try {
    appendOrder(order);
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Could not store the order." });
  }
  res.json({ ok: true, orderId });
});

/* Static storefront (project root) — serves index.html, shop.html, etc. */
app.use(express.static(PROJECT_ROOT));

app.listen(PORT, () => {
  console.log("ShopKart server running at http://localhost:" + PORT);
  console.log("Storefront: http://localhost:" + PORT + "/");
  console.log("Health:     http://localhost:" + PORT + "/api/health");
});
