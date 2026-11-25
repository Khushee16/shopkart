<?php
/**
 * ShopKart — products.php
 * ------------------------
 * Serves the product catalog as JSON.
 *
 * NOTE: This is plain, dependency-free PHP. It runs on any cheap shared
 * PHP host (upload this whole project folder and visit products.php).
 * It does NOT run on GitHub Pages, which serves only static files — there,
 * the frontend falls back to the embedded catalog in products.js.
 * The Node/Express server (server/server.js) offers the same data at
 * GET /api/products.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$products = [
    ['id' => 'aria-headphones', 'name' => 'Aria Wireless Headphones', 'category' => 'Audio', 'price' => 129, 'rating' => 4.8, 'reviews' => 214, 'badge' => 'Bestseller', 'featured' => true, 'seed' => 'aria-headphones',
     'desc' => 'Over-ear comfort with 40-hour battery life, active noise cancellation, and memory-foam earcups you\'ll forget you\'re wearing.'],
    ['id' => 'pulse-smartwatch', 'name' => 'Pulse Smartwatch', 'category' => 'Wearables', 'price' => 199, 'rating' => 4.7, 'reviews' => 186, 'badge' => 'New', 'featured' => true, 'seed' => 'pulse-smartwatch',
     'desc' => 'Heart-rate, sleep, and 90+ workout modes on a bright always-on display. 10-day battery, 5ATM water resistance.'],
    ['id' => 'ember-lamp', 'name' => 'Ember Desk Lamp', 'category' => 'Home', 'price' => 59, 'rating' => 4.6, 'reviews' => 98, 'badge' => '', 'featured' => false, 'seed' => 'ember-desk-lamp',
     'desc' => 'A warm, flicker-free glow with stepless dimming and three color temperatures. Aluminum build, touch controls.'],
    ['id' => 'nomad-backpack', 'name' => 'Nomad Backpack', 'category' => 'Accessories', 'price' => 89, 'rating' => 4.9, 'reviews' => 342, 'badge' => 'Bestseller', 'featured' => true, 'seed' => 'nomad-backpack',
     'desc' => '22L weatherproof commuter pack with a padded 16-inch laptop sleeve, magnetic buckles, and a hidden AirTag pocket.'],
    ['id' => 'volt-speaker', 'name' => 'Volt Bluetooth Speaker', 'category' => 'Audio', 'price' => 79, 'rating' => 4.5, 'reviews' => 157, 'badge' => '', 'featured' => false, 'seed' => 'volt-speaker',
     'desc' => 'Room-filling 360° sound, 24-hour playtime, and IPX7 waterproofing. Pair two for true wireless stereo.'],
    ['id' => 'halo-bulbs', 'name' => 'Halo Smart Bulbs (4-pack)', 'category' => 'Home', 'price' => 49, 'rating' => 4.4, 'reviews' => 121, 'badge' => 'Sale', 'featured' => false, 'seed' => 'halo-bulbs',
     'desc' => '16 million colors, schedules, and sunrise simulation. Works with all major voice assistants — no hub required.'],
    ['id' => 'orbit-band', 'name' => 'Orbit Fitness Band', 'category' => 'Wearables', 'price' => 99, 'rating' => 4.6, 'reviews' => 203, 'badge' => '', 'featured' => true, 'seed' => 'orbit-band',
     'desc' => 'Featherlight tracker with SpO2, stress monitoring, and 14-day battery. Swim-proof and endlessly customizable.'],
    ['id' => 'canvas-sleeve', 'name' => 'Canvas Laptop Sleeve', 'category' => 'Accessories', 'price' => 39, 'rating' => 4.7, 'reviews' => 176, 'badge' => '', 'featured' => false, 'seed' => 'canvas-sleeve',
     'desc' => 'Waxed canvas with a soft flannel lining and a front pocket for chargers. Fits 13–14 inch laptops snugly.'],
];

echo json_encode(['products' => $products], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
