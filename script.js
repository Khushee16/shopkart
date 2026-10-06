/* ============ ShopKart — mini e-commerce ============ */
(function () {
  "use strict";

  var PRODUCTS = [
    { id: "aria-headphones", name: "Aria Wireless Headphones", category: "Audio", price: 129, rating: 4.8, reviews: 214, badge: "Bestseller", seed: "aria-headphones",
      desc: "Over-ear comfort with 40-hour battery life, active noise cancellation, and memory-foam earcups you'll forget you're wearing." },
    { id: "pulse-smartwatch", name: "Pulse Smartwatch", category: "Wearables", price: 199, rating: 4.7, reviews: 186, badge: "New", seed: "pulse-smartwatch",
      desc: "Heart-rate, sleep, and 90+ workout modes on a bright always-on display. 10-day battery, 5ATM water resistance." },
    { id: "ember-lamp", name: "Ember Desk Lamp", category: "Home", price: 59, rating: 4.6, reviews: 98, badge: "", seed: "ember-desk-lamp",
      desc: "A warm, flicker-free glow with stepless dimming and three color temperatures. Aluminum build, touch controls." },
    { id: "nomad-backpack", name: "Nomad Backpack", category: "Accessories", price: 89, rating: 4.9, reviews: 342, badge: "Bestseller", seed: "nomad-backpack",
      desc: "22L weatherproof commuter pack with a padded 16-inch laptop sleeve, magnetic buckles, and a hidden AirTag pocket." },
    { id: "volt-speaker", name: "Volt Bluetooth Speaker", category: "Audio", price: 79, rating: 4.5, reviews: 157, badge: "", seed: "volt-speaker",
      desc: "Room-filling 360° sound, 24-hour playtime, and IPX7 waterproofing. Pair two for true wireless stereo." },
    { id: "halo-bulbs", name: "Halo Smart Bulbs (4-pack)", category: "Home", price: 49, rating: 4.4, reviews: 121, badge: "Sale", seed: "halo-bulbs",
      desc: "16 million colors, schedules, and sunrise simulation. Works with all major voice assistants — no hub required." },
    { id: "orbit-band", name: "Orbit Fitness Band", category: "Wearables", price: 99, rating: 4.6, reviews: 203, badge: "", seed: "orbit-band",
      desc: "Featherlight tracker with SpO2, stress monitoring, and 14-day battery. Swim-proof and endlessly customizable." },
    { id: "canvas-sleeve", name: "Canvas Laptop Sleeve", category: "Accessories", price: 39, rating: 4.7, reviews: 176, badge: "", seed: "canvas-sleeve",
      desc: "Waxed canvas with a soft flannel lining and a front pocket for chargers. Fits 13–14 inch laptops snugly." }
  ];
  var CATEGORIES = ["All", "Audio", "Wearables", "Home", "Accessories"];
  var FREE_SHIP_THRESHOLD = 50;

  var state = { cat: "All", sort: "featured", cart: loadCart(), qvId: null, qvQty: 1 };

  var grid = document.getElementById("grid");
  var catPills = document.getElementById("catPills");
  var sortSelect = document.getElementById("sortSelect");
  var resultCount = document.getElementById("resultCount");
  var cartBtn = document.getElementById("cartBtn");
  var cartCount = document.getElementById("cartCount");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartOverlay = document.getElementById("cartOverlay");
  var cartClose = document.getElementById("cartClose");
  var cartItems = document.getElementById("cartItems");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartFoot = document.getElementById("cartFoot");
  var cartTotal = document.getElementById("cartTotal");
  var cartHeadCount = document.getElementById("cartHeadCount");
  var shippingNote = document.getElementById("shippingNote");
  var checkoutBtn = document.getElementById("checkoutBtn");
  var orderSuccess = document.getElementById("orderSuccess");
  var orderSummary = document.getElementById("orderSummary");
  var continueShopping = document.getElementById("continueShopping");

  /* ---------- Persistence ---------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem("shopkart-cart");
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (i) { return i && i.id && i.qty > 0; }) : [];
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem("shopkart-cart", JSON.stringify(state.cart)); } catch (e) { /* unavailable */ }
  }
  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function imgUrl(seed, w, h) { return "https://picsum.photos/seed/" + seed + "/" + w + "/" + h; }
  function money(n) { return "$" + n.toFixed(2); }

  /* ---------- Product grid ---------- */
  function getFiltered() {
    var list = PRODUCTS.filter(function (p) { return state.cat === "All" || p.category === state.cat; });
    switch (state.sort) {
      case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
      case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
      case "rating-desc": list.sort(function (a, b) { return b.rating - a.rating; }); break;
    }
    return list;
  }
  function renderPills() {
    catPills.innerHTML = "";
    CATEGORIES.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "pill" + (state.cat === c ? " active" : "");
      b.textContent = c;
      b.setAttribute("aria-pressed", state.cat === c ? "true" : "false");
      b.addEventListener("click", function () { state.cat = c; renderPills(); renderGrid(); });
      catPills.appendChild(b);
    });
  }
  function renderGrid() {
    var list = getFiltered();
    grid.innerHTML = "";
    list.forEach(function (p, i) {
      var card = document.createElement("article");
      card.className = "product";
      card.style.animationDelay = Math.min(i * 45, 360) + "ms";

      var wrap = document.createElement("div");
      wrap.className = "product-img-wrap";
      var img = document.createElement("img");
      img.src = imgUrl(p.seed, 600, 450);
      img.alt = p.name;
      img.loading = "lazy";
      wrap.appendChild(img);
      if (p.badge) {
        var badge = document.createElement("span");
        badge.className = "badge" + (p.badge === "Sale" ? " sale" : "");
        badge.textContent = p.badge;
        wrap.appendChild(badge);
      }

      var body = document.createElement("div");
      body.className = "product-body";
      var cat = document.createElement("p");
      cat.className = "product-cat";
      cat.textContent = p.category;
      var h3 = document.createElement("h3");
      h3.textContent = p.name;
      var rating = document.createElement("p");
      rating.className = "product-rating";
      rating.innerHTML = "";
      rating.appendChild(document.createTextNode("\u2605 " + p.rating.toFixed(1) + " "));
      var rc = document.createElement("span");
      rc.textContent = "(" + p.reviews + ")";
      rating.appendChild(rc);
      var foot = document.createElement("div");
      foot.className = "product-foot";
      var price = document.createElement("span");
      price.className = "product-price";
      price.textContent = money(p.price);
      var viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-ghost btn-sm";
      viewBtn.textContent = "Quick view";
      viewBtn.addEventListener("click", function () { openQuickView(p.id); });
      var addBtn = document.createElement("button");
      addBtn.className = "btn btn-primary btn-sm";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", function () { addToCart(p.id, 1); });
      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";
      btnRow.appendChild(viewBtn);
      btnRow.appendChild(addBtn);
      foot.appendChild(price);
      foot.appendChild(btnRow);

      body.appendChild(cat);
      body.appendChild(h3);
      body.appendChild(rating);
      body.appendChild(foot);
      card.appendChild(wrap);
      card.appendChild(body);
      grid.appendChild(card);
    });
    resultCount.textContent = list.length === 1 ? "1 product" : list.length + " products";
  }
  sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; renderGrid(); });

  /* ---------- Quick view ---------- */
  var qvBackdrop = document.getElementById("qvBackdrop");
  var qvClose = document.getElementById("qvClose");
  function openQuickView(id) {
    var p = findProduct(id);
    if (!p) return;
    state.qvId = id;
    state.qvQty = 1;
    document.getElementById("qvQty").textContent = "1";
    document.getElementById("qvImg").src = imgUrl(p.seed, 900, 506);
    document.getElementById("qvImg").alt = p.name;
    var badge = document.getElementById("qvBadge");
    if (p.badge) { badge.hidden = false; badge.textContent = p.badge; badge.className = "badge" + (p.badge === "Sale" ? " sale" : ""); }
    else badge.hidden = true;
    document.getElementById("qvName").textContent = p.name;
    var qr = document.getElementById("qvRating");
    qr.innerHTML = "";
    qr.appendChild(document.createTextNode("\u2605 " + p.rating.toFixed(1) + " "));
    var qrc = document.createElement("span");
    qrc.textContent = "(" + p.reviews + " reviews)";
    qr.appendChild(qrc);
    document.getElementById("qvDesc").textContent = p.desc;
    document.getElementById("qvPrice").textContent = money(p.price);
    qvBackdrop.hidden = false;
    document.body.classList.add("locked");
    qvClose.focus();
  }
  function closeQuickView() {
    qvBackdrop.hidden = true;
    document.body.classList.remove("locked");
    state.qvId = null;
  }
  document.getElementById("qvMinus").addEventListener("click", function () {
    if (state.qvQty > 1) { state.qvQty--; document.getElementById("qvQty").textContent = state.qvQty; }
  });
  document.getElementById("qvPlus").addEventListener("click", function () {
    if (state.qvQty < 9) { state.qvQty++; document.getElementById("qvQty").textContent = state.qvQty; }
  });
  document.getElementById("qvAdd").addEventListener("click", function () {
    if (state.qvId) { addToCart(state.qvId, state.qvQty); closeQuickView(); openCart(); }
  });
  qvClose.addEventListener("click", closeQuickView);
  qvBackdrop.addEventListener("click", function (e) { if (e.target === qvBackdrop) closeQuickView(); });

  /* ---------- Cart ---------- */
  function cartQty() {
    return state.cart.reduce(function (n, i) { return n + i.qty; }, 0);
  }
  function cartSubtotal() {
    return state.cart.reduce(function (sum, i) {
      var p = findProduct(i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0);
  }
  function addToCart(id, qty) {
    var line = null;
    state.cart.forEach(function (i) { if (i.id === id) line = i; });
    if (line) line.qty = Math.min(9, line.qty + qty);
    else state.cart.push({ id: id, qty: qty });
    saveCart();
    renderCart();
    cartBtn.classList.remove("bump");
    void cartBtn.offsetWidth;
    cartBtn.classList.add("bump");
  }
  function renderCart() {
    var qty = cartQty();
    cartCount.textContent = qty;
    cartHeadCount.textContent = qty ? "(" + qty + ")" : "";
    cartItems.innerHTML = "";
    state.cart.forEach(function (line) {
      var p = findProduct(line.id);
      if (!p) return;
      var item = document.createElement("div");
      item.className = "cart-item";
      var img = document.createElement("img");
      img.src = imgUrl(p.seed, 200, 200);
      img.alt = p.name;
      var mid = document.createElement("div");
      var nm = document.createElement("p");
      nm.className = "ci-name";
      nm.textContent = p.name;
      var pr = document.createElement("p");
      pr.className = "ci-price";
      pr.textContent = money(p.price) + " each";
      mid.appendChild(nm);
      mid.appendChild(pr);
      var right = document.createElement("div");
      right.className = "ci-right";
      var stepper = document.createElement("div");
      stepper.className = "ci-qty";
      var minus = document.createElement("button");
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease quantity");
      minus.addEventListener("click", function () { changeQty(line.id, -1); });
      var q = document.createElement("span");
      q.textContent = line.qty;
      var plus = document.createElement("button");
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase quantity");
      plus.addEventListener("click", function () { changeQty(line.id, 1); });
      stepper.appendChild(minus);
      stepper.appendChild(q);
      stepper.appendChild(plus);
      var rm = document.createElement("button");
      rm.className = "ci-remove";
      rm.textContent = "Remove";
      rm.addEventListener("click", function () { removeLine(line.id); });
      right.appendChild(stepper);
      right.appendChild(rm);
      item.appendChild(img);
      item.appendChild(mid);
      item.appendChild(right);
      cartItems.appendChild(item);
    });
    var has = state.cart.length > 0;
    cartEmpty.style.display = has ? "none" : "block";
    cartFoot.hidden = !has;
    orderSuccess.hidden = true;
    var sub = cartSubtotal();
    cartTotal.textContent = money(sub);
    shippingNote.textContent = sub >= FREE_SHIP_THRESHOLD
      ? "You've unlocked free shipping."
      : "Add " + money(FREE_SHIP_THRESHOLD - sub) + " more for free shipping.";
  }
  function changeQty(id, dir) {
    state.cart.forEach(function (i) {
      if (i.id === id) i.qty = Math.min(9, Math.max(1, i.qty + dir));
    });
    saveCart();
    renderCart();
  }
  function removeLine(id) {
    state.cart = state.cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }
  function openCart() {
    renderCart();
    cartOverlay.hidden = false;
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    cartClose.focus();
  }
  function closeCart() {
    cartOverlay.hidden = true;
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
  }
  cartBtn.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!qvBackdrop.hidden) closeQuickView();
      else if (cartDrawer.getAttribute("aria-hidden") === "false") closeCart();
    }
  });
  checkoutBtn.addEventListener("click", function () {
    var qty = cartQty();
    var sub = cartSubtotal();
    orderSummary.textContent = qty + (qty === 1 ? " item" : " items") + " totaling " + money(sub) + ". A confirmation email is on its way (demo only).";
    state.cart = [];
    saveCart();
    renderCart();
    cartFoot.hidden = true;
    cartEmpty.style.display = "none";
    orderSuccess.hidden = false;
  });
  continueShopping.addEventListener("click", function () {
    orderSuccess.hidden = true;
    closeCart();
  });

  /* ---------- Init ---------- */
  renderPills();
  renderGrid();
  renderCart();
})();
