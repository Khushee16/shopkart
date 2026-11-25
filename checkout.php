<?php
/**
 * ShopKart — checkout.php
 * ------------------------
 * Handles checkout POSTs. Plain, dependency-free PHP — no framework, no
 * database server. Orders are appended to data/orders.json (a JSON file).
 *
 * NOTE: This runs on any cheap shared PHP host (upload this whole project
 * folder and the frontend will POST here). It does NOT run on GitHub Pages,
 * which serves only static files — there, the frontend shows a clearly
 * labelled demo state instead of pretending an order was placed.
 * The Node/Express server (server/server.js) offers the same behaviour at
 * POST /api/checkout, storing orders in server/data/orders.json.
 *
 * Accepts JSON bodies (what the frontend sends) or form-encoded POSTs.
 * Returns JSON: {"ok": true, "orderId": "SK-..."} on success,
 * or {"ok": false, "error": "..."} with HTTP 400 on invalid input.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed. POST an order to this endpoint.']);
    exit;
}

function fail($message) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

// Read the order: JSON body first, form-encoded POST as a fallback.
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || empty($data)) {
    $data = $_POST;
}
if (!is_array($data)) {
    fail('Could not read the order.');
}

$name    = trim((string)($data['name'] ?? ''));
$email   = trim((string)($data['email'] ?? ''));
$address = trim((string)($data['address'] ?? ''));
$city    = trim((string)($data['city'] ?? ''));
$zip     = trim((string)($data['zip'] ?? ''));
$items   = $data['items'] ?? null;

// --- Validation (mirrors the Node/Express API and the frontend) ---
if ($name === '')            fail('Name is required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('A valid email address is required.');
if ($address === '')         fail('Street address is required.');
if ($city === '')            fail('City is required.');
if ($zip === '')             fail('ZIP / postal code is required.');
if (!is_array($items) || count($items) === 0) fail('Cart is empty.');

$knownIds = ['aria-headphones', 'pulse-smartwatch', 'ember-lamp', 'nomad-backpack',
             'volt-speaker', 'halo-bulbs', 'orbit-band', 'canvas-sleeve'];
$cleanItems = [];
foreach ($items as $item) {
    if (!is_array($item)) fail('Invalid cart item.');
    $id  = (string)($item['id'] ?? '');
    $qty = (int)($item['qty'] ?? 0);
    if (!in_array($id, $knownIds, true)) fail('Unknown product id: ' . $id);
    if ($qty < 1 || $qty > 9) fail('Quantity for ' . $id . ' must be between 1 and 9.');
    $cleanItems[] = ['id' => $id, 'qty' => $qty];
}

// --- Store the order ---
$orderId = 'SK-' . strtoupper(substr(md5(uniqid('', true)), 0, 8));
$order = [
    'orderId'   => $orderId,
    'name'      => $name,
    'email'     => $email,
    'address'   => $address,
    'city'      => $city,
    'zip'       => $zip,
    'items'     => $cleanItems,
    'subtotal'  => isset($data['subtotal']) ? (float)$data['subtotal'] : null,
    'createdAt' => gmdate('c'),
    'source'    => 'php',
];

$dir  = __DIR__ . '/data';
$file = $dir . '/orders.json';
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not create the orders directory.']);
    exit;
}

$fp = fopen($file, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not open the orders file.']);
    exit;
}
if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not lock the orders file.']);
    exit;
}
$contents = stream_get_contents($fp);
$orders = json_decode($contents, true);
if (!is_array($orders)) $orders = [];
$orders[] = $order;
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'orderId' => $orderId]);
