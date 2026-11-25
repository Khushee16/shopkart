/* ==========================================================================
   ShopKart — shared app logic (cart, catalog, quick view, checkout)
   Loaded by every page after products.js and the Bootstrap 5 bundle.

   BACKEND STRATEGY (honest by design — nothing is faked):
   - Catalog: app.js tries the Node/Express API (GET <apiBase>/api/products)
     first. If the API is not running (GitHub Pages, file://, plain static
     host), it falls back to the embedded SHOPKART_PRODUCTS data. The page
     works either way; the data source is just different.
   - Checkout: tries POST <apiBase>/api/checkout, then POST checkout.php
     (PHP host). If NEITHER backend answers, checkout shows a clearly
     labelled demo success state — "Demo mode — no backend connected" —
     and explicitly says no order was placed or stored. It never pretends
     a real order was submitted.
   - Set SHOPKART_CONFIG.apiBase in products.js to point at a remote API.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.SHOPKART_CONFIG || {};
  var API_BASE = (CFG.apiBase || "").replace(/\/$/, "");
  var FREE_SHIP = CFG.freeShipThreshold || 50;
  var EMBEDDED = window.SHOPKART_PRODUCTS || [];
  var CATEGORIES = window.SHOPKART_CATEGORIES || ["All"];

  var productsCache = null; // resolved catalog (API, PHP, or embedded)
  var productsSource = "embedded"; // "api" | "php" | "embedded" — shown in the footer note
  var state = { cat: "All", sort: "featured", query: "", cart: loadCart(), qvId: null, qvQty: 1 };
  var page = (document.body && document.body.getAttribute("data-page")) || "home";

  /* ---------- Small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function money(n) { return "$" + Number(n).toFixed(2); }
  function imgUrl(seed, w, h) { return "https://picsum.photos/seed/" + encodeURIComponent(seed) + "/" + w + "/" + h; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function findProduct(id) {
    var list = productsCache || EMBEDDED;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function stars(p) {
    return "★ " + p.rating.toFixed(1) + ' <span class="text-muted-custom">(' + p.reviews + " reviews)</span>";
  }

  /* ---------- Catalog loading: API -> PHP -> embedded ---------- */
  function fetchJson(url) {
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }
  function loadProducts() {
    if (productsCache) return Promise.resolve(productsCache);
    // 1) Node/Express API (same origin by default: /api/products)
    return fetchJson(API_BASE + "/api/products").then(function (data) {
      if (!data || !Array.isArray(data.products)) throw new Error("bad api payload");
      productsCache = data.products;
      productsSource = "api";
      return productsCache;
    }).catch(function () {
      // 2) PHP endpoint (only answers on a PHP host)
      return fetchJson((CFG.phpProducts || "products.php")).then(function (data) {
        if (!data || !Array.isArray(data.products)) throw new Error("bad php payload");
        productsCache = data.products;
        productsSource = "php";
        return productsCache;
      }).catch(function () {
        // 3) Embedded demo data — the honest fallback for static hosting.
        productsCache = EMBEDDED;
        productsSource = "embedded";
        return productsCache;
      });
    });
  }

  /* ---------- Cart persistence ---------- */
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
  function cartQty() { return state.cart.reduce(function (n, i) { return n + i.qty; }, 0); }
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
    renderCartBadge();
    renderCartDrawer();
    var p = findProduct(id);
    if (p) showToast(p.name + " added to cart");
    var btn = $("cartBtn");
    if (btn) { btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); }
  }
  function changeQty(id, dir) {
    state.cart.forEach(function (i) { if (i.id === id) i.qty = Math.min(9, Math.max(1, i.qty + dir)); });
    saveCart(); renderCartBadge(); renderCartDrawer(); renderCartPage();
  }
  function removeLine(id) {
    state.cart = state.cart.filter(function (i) { return i.id !== id; });
    saveCart(); renderCartBadge(); renderCartDrawer(); renderCartPage();
  }

  /* ---------- Shared chrome: cart offcanvas, quick-view modal, toast ---------- */
  function injectChrome() {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="offcanvas offcanvas-end offcanvas-cart" tabindex="-1" id="cartDrawer" aria-labelledby="cartDrawerLabel">' +
        '<div class="offcanvas-header border-bottom">' +
          '<h2 class="offcanvas-title fs-5" id="cartDrawerLabel">Your cart <span id="cartHeadCount" class="text-muted-custom"></span></h2>' +
          '<button type="button" class="btn-close" id="cartClose" aria-label="Close cart"></button>' +
        '</div>' +
        '<div class="offcanvas-body d-flex flex-column">' +
          '<div id="cartItems" class="d-flex flex-column gap-3"></div>' +
          '<div id="cartEmpty" class="text-center py-5">' +
            '<p class="fs-5 fw-bold mb-1">Your cart is empty</p>' +
            '<p class="text-muted-custom">Add something you love to get started.</p>' +
            '<a href="shop.html" class="btn btn-primary mt-2">Browse the shop</a>' +
          '</div>' +
          '<div id="cartFoot" class="mt-auto pt-3 border-top" hidden>' +
            '<div class="mb-2"><div class="d-flex justify-content-between small text-muted-custom"><span id="shipLabel"></span><span id="shipPct"></span></div>' +
            '<div class="progress ship-progress mt-1"><div class="progress-bar" id="shipBar" role="progressbar" style="width:0%"></div></div></div>' +
            '<div class="d-flex justify-content-between align-items-center fs-5 mb-3"><span>Subtotal</span><strong id="cartTotal">$0.00</strong></div>' +
            '<a href="cart.html" class="btn btn-primary btn-lg w-100">Go to checkout</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal fade" id="qvModal" tabindex="-1" aria-hidden="true">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content overflow-hidden">' +
            '<button type="button" class="btn-close position-absolute top-0 end-0 m-3 bg-white rounded-circle p-2" style="z-index:2" id="qvClose" aria-label="Close quick view"></button>' +
            '<img id="qvImg" class="qv-img" src="" alt="" />' +
            '<div class="modal-body p-4">' +
              '<span class="badge bg-primary mb-2" id="qvBadge" hidden></span>' +
              '<h2 class="fs-4 mb-1" id="qvName"></h2>' +
              '<p class="product-rating" id="qvRating"></p>' +
              '<p class="text-muted-custom" id="qvDesc"></p>' +
              '<div class="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-3">' +
                '<span class="detail-price" id="qvPrice"></span>' +
                '<div class="d-flex align-items-center gap-3">' +
                  '<div class="qty-stepper"><button id="qvMinus" aria-label="Decrease quantity">−</button><span id="qvQty">1</span><button id="qvPlus" aria-label="Increase quantity">+</button></div>' +
                  '<button class="btn btn-primary" id="qvAdd">Add to cart</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1080">' +
        '<div id="cartToast" class="toast toast-cart align-items-center" role="status" aria-live="polite">' +
          '<div class="d-flex"><div class="toast-body" id="cartToastBody"></div>' +
          '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>' +
        '</div>' +
      '</div>' +
      '<div class="offcanvas-backdrop fade" id="chromeBackdrop" hidden></div>';
    document.body.appendChild(wrap);
  }

  /* Drawer + modal toggling (works with or without the Bootstrap JS bundle). */
  function showBackdrop() { var b = $("chromeBackdrop"); if (b) { b.hidden = false; requestAnimationFrame(function () { b.classList.add("show"); }); } }
  function hideBackdrop() { var b = $("chromeBackdrop"); if (b) { b.classList.remove("show"); b.hidden = true; } }
  function openCart() {
    renderCartDrawer();
    var d = $("cartDrawer");
    d.classList.add("show"); d.style.visibility = "visible";
    document.body.classList.add("overflow-hidden");
    showBackdrop();
    var c = $("cartClose"); if (c) c.focus();
  }
  function closeCart() {
    var d = $("cartDrawer");
    d.classList.remove("show"); d.style.visibility = "";
    document.body.classList.remove("overflow-hidden");
    hideBackdrop();
  }
  function openQuickView(id) {
    var p = findProduct(id);
    if (!p) return;
    state.qvId = id; state.qvQty = 1;
    $("qvQty").textContent = "1";
    $("qvImg").src = imgUrl(p.seed, 900, 506);
    $("qvImg").alt = p.name;
    var badge = $("qvBadge");
    if (p.badge) { badge.hidden = false; badge.textContent = p.badge; badge.className = "badge mb-2 " + (p.badge === "Sale" ? "bg-danger" : "bg-primary"); }
    else badge.hidden = true;
    $("qvName").textContent = p.name;
    $("qvRating").innerHTML = stars(p);
    $("qvDesc").textContent = p.desc;
    $("qvPrice").textContent = money(p.price);
    var m = $("qvModal");
    m.classList.add("show"); m.style.display = "block";
    document.body.classList.add("overflow-hidden");
    showBackdrop();
    var c = $("qvClose"); if (c) c.focus();
  }
  function closeQuickView() {
    var m = $("qvModal");
    m.classList.remove("show"); m.style.display = "none";
    document.body.classList.remove("overflow-hidden");
    hideBackdrop();
    state.qvId = null;
  }
  function showToast(msg) {
    var body = $("cartToastBody");
    if (!body) return;
    body.textContent = msg;
    var t = $("cartToast");
    if (window.bootstrap && window.bootstrap.Toast) {
      new window.bootstrap.Toast(t, { delay: 2200 }).show();
    } else {
      t.classList.add("show");
      setTimeout(function () { t.classList.remove("show"); }, 2200);
    }
  }

  /* ---------- Product card ---------- */
  function cardHtml(p, i) {
    var badge = p.badge
      ? '<span class="badge-skbadge' + (p.badge === "Sale" ? " sale" : "") + '">' + esc(p.badge) + "</span>"
      : "";
    return (
      '<div class="col-sm-6 col-lg-4 col-xl-3 reveal">' +
        '<article class="card product-card h-100">' +
          '<div class="product-img-wrap">' +
            '<a href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="View ' + esc(p.name) + '">' +
              '<img src="' + imgUrl(p.seed, 600, 450) + '" alt="' + esc(p.name) + '" loading="lazy" />' +
            "</a>" + badge +
          "</div>" +
          '<div class="card-body d-flex flex-column">' +
            '<p class="product-cat">' + esc(p.category) + "</p>" +
            '<h3 class="product-name"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + "</a></h3>" +
            '<p class="product-rating">' + stars(p) + "</p>" +
            '<div class="mt-auto d-flex justify-content-between align-items-center gap-2">' +
              '<span class="product-price">' + money(p.price) + "</span>" +
              '<div class="d-flex gap-2">' +
                '<button class="btn btn-outline-secondary btn-sm" data-qv="' + esc(p.id) + '">Quick view</button>' +
                '<button class="btn btn-primary btn-sm" data-add="' + esc(p.id) + '">Add</button>' +
              "</div>" +
            "</div>" +
          "</div>" +
        "</article>" +
      "</div>"
    );
  }
  function bindCardButtons(root) {
    root.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () { addToCart(b.getAttribute("data-add"), 1); });
    });
    root.querySelectorAll("[data-qv]").forEach(function (b) {
      b.addEventListener("click", function () { openQuickView(b.getAttribute("data-qv")); });
    });
  }
  function observeReveals(root) {
    var els = (root || document).querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 60, 300) + "ms"; io.observe(el); });
  }

  /* ---------- Cart badge + drawer ---------- */
  function renderCartBadge() {
    var n = cartQty();
    var badge = $("cartCount");
    if (badge) badge.textContent = n;
    var head = $("cartHeadCount");
    if (head) head.textContent = n ? "(" + n + ")" : "";
  }
  function renderCartDrawer() {
    var items = $("cartItems"), empty = $("cartEmpty"), foot = $("cartFoot");
    if (!items) return;
    items.innerHTML = "";
    state.cart.forEach(function (line) {
      var p = findProduct(line.id);
      if (!p) return;
      var div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML =
        '<img src="' + imgUrl(p.seed, 200, 200) + '" alt="' + esc(p.name) + '" />' +
        '<div><p class="ci-name">' + esc(p.name) + '</p><p class="ci-price">' + money(p.price) + " each</p></div>" +
        '<div class="d-flex flex-column align-items-end gap-2">' +
          '<div class="ci-qty"><button class="btn btn-outline-secondary" data-dec="' + esc(p.id) + '" aria-label="Decrease quantity">−</button><span>' + line.qty + '</span><button class="btn btn-outline-secondary" data-inc="' + esc(p.id) + '" aria-label="Increase quantity">+</button></div>' +
          '<button class="ci-remove" data-rm="' + esc(p.id) + '">Remove</button>' +
        "</div>";
      items.appendChild(div);
    });
    var has = state.cart.length > 0;
    empty.style.display = has ? "none" : "block";
    foot.hidden = !has;
    var sub = cartSubtotal();
    $("cartTotal").textContent = money(sub);
    var remaining = Math.max(0, FREE_SHIP - sub);
    $("shipLabel").textContent = remaining > 0
      ? "Add " + money(remaining) + " more for free shipping"
      : "You've unlocked free shipping";
    $("shipPct").textContent = Math.min(100, Math.round((sub / FREE_SHIP) * 100)) + "%";
    $("shipBar").style.width = Math.min(100, (sub / FREE_SHIP) * 100) + "%";
    items.querySelectorAll("[data-inc]").forEach(function (b) { b.addEventListener("click", function () { changeQty(b.getAttribute("data-inc"), 1); }); });
    items.querySelectorAll("[data-dec]").forEach(function (b) { b.addEventListener("click", function () { changeQty(b.getAttribute("data-dec"), -1); }); });
    items.querySelectorAll("[data-rm]").forEach(function (b) { b.addEventListener("click", function () { removeLine(b.getAttribute("data-rm")); }); });
  }

  /* ---------- Home page ---------- */
  function renderHome() {
    var grid = $("featuredGrid");
    if (!grid) return;
    var featured = (productsCache || EMBEDDED).filter(function (p) { return p.featured; }).slice(0, 4);
    grid.innerHTML = featured.map(cardHtml).join("");
    bindCardButtons(grid);
    observeReveals(grid);
    // Category tiles get live counts.
    document.querySelectorAll("[data-cat-count]").forEach(function (el) {
      var cat = el.getAttribute("data-cat-count");
      var n = (productsCache || EMBEDDED).filter(function (p) { return p.category === cat; }).length;
      el.textContent = n + (n === 1 ? " product" : " products");
    });
  }

  /* ---------- Shop page ---------- */
  function getFiltered() {
    var list = (productsCache || EMBEDDED).slice();
    if (state.cat !== "All") list = list.filter(function (p) { return p.category === state.cat; });
    if (state.query) {
      var q = state.query.toLowerCase();
      list = list.filter(function (p) { return (p.name + " " + p.category + " " + p.desc).toLowerCase().indexOf(q) !== -1; });
    }
    switch (state.sort) {
      case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
      case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
      case "rating-desc": list.sort(function (a, b) { return b.rating - a.rating; }); break;
    }
    return list;
  }
  function renderShop() {
    var grid = $("grid");
    if (!grid) return;
    var list = getFiltered();
    grid.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : '<div class="col-12"><div class="alert alert-light border text-center py-5">No products match that search. Try a different word or category.</div></div>';
    bindCardButtons(grid);
    observeReveals(grid);
    var rc = $("resultCount");
    if (rc) rc.textContent = list.length === 1 ? "1 product" : list.length + " products";
  }
  function renderPills() {
    var wrap = $("catPills");
    if (!wrap) return;
    wrap.innerHTML = "";
    CATEGORIES.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "pill" + (state.cat === c ? " active" : "");
      b.textContent = c;
      b.setAttribute("aria-pressed", state.cat === c ? "true" : "false");
      b.addEventListener("click", function () { state.cat = c; renderPills(); renderShop(); });
      wrap.appendChild(b);
    });
  }
  function initShop() {
    var params = new URLSearchParams(window.location.search);
    var cat = params.get("cat");
    if (cat && CATEGORIES.indexOf(cat) !== -1) state.cat = cat;
    renderPills();
    var sort = $("sortSelect");
    if (sort) sort.addEventListener("change", function () { state.sort = sort.value; renderShop(); });
    var search = $("searchInput");
    if (search) search.addEventListener("input", function () { state.query = search.value.trim(); renderShop(); });
    renderShop();
  }

  /* ---------- Product detail page ---------- */
  function initProduct() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    var p = id ? findProduct(id) : null;
    var wrap = $("productDetail");
    if (!wrap) return;
    if (!p) {
      wrap.innerHTML = '<div class="alert alert-warning">That product doesn\'t exist. <a href="shop.html">Back to the shop</a>.</div>';
      return;
    }
    document.title = p.name + " — ShopKart";
    var related = (productsCache || EMBEDDED).filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
    wrap.innerHTML =
      '<div class="row g-5">' +
        '<div class="col-md-6 reveal in"><div class="position-relative">' +
          '<img class="detail-img" src="' + imgUrl(p.seed, 900, 675) + '" alt="' + esc(p.name) + '" />' +
          (p.badge ? '<span class="badge-skbadge' + (p.badge === "Sale" ? " sale" : "") + '">' + esc(p.badge) + "</span>" : "") +
        "</div></div>" +
        '<div class="col-md-6 reveal in">' +
          '<p class="product-cat mb-1">' + esc(p.category) + "</p>" +
          '<h1 class="fs-2 mb-2">' + esc(p.name) + "</h1>" +
          '<p class="product-rating fs-5">' + stars(p) + "</p>" +
          '<p class="text-muted-custom">' + esc(p.desc) + "</p>" +
          '<p class="detail-price my-3">' + money(p.price) + "</p>" +
          '<div class="d-flex align-items-center gap-3 flex-wrap">' +
            '<div class="qty-stepper"><button id="pdMinus" aria-label="Decrease quantity">−</button><span id="pdQty">1</span><button id="pdPlus" aria-label="Increase quantity">+</button></div>' +
            '<button class="btn btn-primary btn-lg" id="pdAdd">Add to cart</button>' +
            '<button class="btn btn-outline-secondary btn-lg" id="pdBuy">Buy now</button>' +
          "</div>" +
          '<ul class="spec-list mt-4">' +
            "<li><span>Free shipping</span><strong>On orders over " + money(FREE_SHIP) + "</strong></li>" +
            "<li><span>Returns</span><strong>30 days, no questions</strong></li>" +
            "<li><span>Demo store</span><strong>No real orders are processed</strong></li>" +
          "</ul>" +
        "</div>" +
      "</div>";
    var qty = 1;
    var qEl = $("pdQty");
    $("pdMinus").addEventListener("click", function () { if (qty > 1) { qty--; qEl.textContent = qty; } });
    $("pdPlus").addEventListener("click", function () { if (qty < 9) { qty++; qEl.textContent = qty; } });
    $("pdAdd").addEventListener("click", function () { addToCart(p.id, qty); openCart(); });
    $("pdBuy").addEventListener("click", function () { addToCart(p.id, qty); window.location.href = "cart.html"; });
    var rel = $("relatedGrid");
    if (rel && related.length) {
      rel.innerHTML = related.map(cardHtml).join("");
      bindCardButtons(rel);
      observeReveals(rel);
      var sec = $("relatedSection");
      if (sec) sec.hidden = false;
    }
  }

  /* ---------- Cart page + checkout ---------- */
  function renderCartPage() {
    var wrap = $("cartPageItems");
    if (!wrap) return; // not on the cart page
    var empty = $("cartPageEmpty"), foot = $("cartPageFoot"), formSec = $("checkoutSection");
    var has = state.cart.length > 0;
    wrap.innerHTML = "";
    state.cart.forEach(function (line) {
      var p = findProduct(line.id);
      if (!p) return;
      var div = document.createElement("div");
      div.className = "cart-item mb-3";
      div.innerHTML =
        '<img src="' + imgUrl(p.seed, 200, 200) + '" alt="' + esc(p.name) + '" />' +
        '<div><p class="ci-name">' + esc(p.name) + '</p><p class="ci-price">' + money(p.price) + " each · " + money(p.price * line.qty) + "</p></div>" +
        '<div class="d-flex flex-column align-items-end gap-2">' +
          '<div class="ci-qty"><button class="btn btn-outline-secondary" data-dec="' + esc(p.id) + '" aria-label="Decrease quantity">−</button><span>' + line.qty + '</span><button class="btn btn-outline-secondary" data-inc="' + esc(p.id) + '" aria-label="Increase quantity">+</button></div>' +
          '<button class="ci-remove" data-rm="' + esc(p.id) + '">Remove</button>' +
        "</div>";
      wrap.appendChild(div);
    });
    empty.hidden = has;
    if (foot) foot.hidden = !has;
    if (formSec) formSec.hidden = !has;
    var sub = cartSubtotal();
    var totalEl = $("cartPageTotal");
    if (totalEl) totalEl.textContent = money(sub);
    var shipEl = $("cartPageShip");
    if (shipEl) {
      var remaining = Math.max(0, FREE_SHIP - sub);
      shipEl.textContent = remaining > 0
        ? "Add " + money(remaining) + " more for free shipping."
        : "You've unlocked free shipping.";
      var bar = $("cartPageBar");
      if (bar) bar.style.width = Math.min(100, (sub / FREE_SHIP) * 100) + "%";
    }
    var countEl = $("cartPageCount");
    if (countEl) countEl.textContent = cartQty() + (cartQty() === 1 ? " item" : " items");
  }

  function checkoutPayload(form) {
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      zip: form.zip.value.trim(),
      items: state.cart.map(function (i) { return { id: i.id, qty: i.qty }; }),
      subtotal: cartSubtotal()
    };
  }
  function validatePayload(d) {
    if (!d.name) return "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "Please enter a valid email address.";
    if (!d.address) return "Please enter a street address.";
    if (!d.city) return "Please enter a city.";
    if (!d.zip) return "Please enter a ZIP / postal code.";
    if (!d.items.length) return "Your cart is empty.";
    return null;
  }
  function postOrder(url) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(checkoutPayload($("checkoutForm")))
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.ok || !data.orderId) throw new Error("bad response");
      return data;
    });
  }
  function submitCheckout(e) {
    e.preventDefault();
    var form = $("checkoutForm");
    var data = checkoutPayload(form);
    var err = validatePayload(data);
    var alertBox = $("checkoutAlert");
    if (err) {
      alertBox.hidden = false;
      alertBox.className = "alert alert-danger";
      alertBox.textContent = err;
      return;
    }
    var btn = $("placeOrderBtn");
    btn.disabled = true;
    btn.textContent = "Placing order…";
    // 1) Node/Express API, 2) PHP backend, 3) labelled demo state.
    postOrder(API_BASE + "/api/checkout").catch(function () {
      return postOrder(CFG.phpCheckout || "checkout.php");
    }).then(function (result) {
      showOrderResult({ demo: false, orderId: result.orderId, total: data.subtotal, count: cartQty() });
    }).catch(function () {
      // No backend answered: demo mode — say so plainly, place nothing.
      showOrderResult({ demo: true, total: data.subtotal, count: cartQty() });
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = "Place order";
    });
  }
  function showOrderResult(result) {
    var qty = result.count, sub = result.total;
    var summary = $("orderSummary");
    var demoNote = $("demoNote");
    if (result.demo) {
      summary.textContent = qty + (qty === 1 ? " item" : " items") + " totaling " + money(sub) + ".";
      demoNote.hidden = false;
      demoNote.innerHTML = "<strong>Demo mode — no backend connected.</strong> No order was placed, stored, or emailed. " +
        "Run the Node server (<code>npm start</code> in <code>server/</code>) or host the site on a PHP server " +
        "to place real demo orders.";
    } else {
      summary.textContent = "Order " + result.orderId + " · " + qty + (qty === 1 ? " item" : " items") + " totaling " + money(sub) + ". A confirmation email is on its way (demo only).";
      demoNote.hidden = true;
    }
    state.cart = [];
    saveCart();
    renderCartBadge();
    renderCartDrawer();
    renderCartPage();
    var sec = $("checkoutSection");
    if (sec) sec.hidden = true;
    var success = $("orderSuccess");
    if (success) { success.hidden = false; success.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }

  /* ---------- Footer data-source note ---------- */
  function renderSourceNote() {
    var el = $("dataSourceNote");
    if (!el) return;
    el.textContent = productsSource === "api"
      ? "Catalog served live from the Node/Express API."
      : productsSource === "php"
        ? "Catalog served live from products.php."
        : "Catalog from the built-in demo data (no backend connected).";
  }

  /* ---------- Init ---------- */
  function init() {
    injectChrome();
    renderCartBadge();
    renderCartDrawer();

    var cartBtn = $("cartBtn");
    if (cartBtn) cartBtn.addEventListener("click", openCart);
    var cartClose = $("cartClose");
    if (cartClose) cartClose.addEventListener("click", closeCart);
    var backdrop = $("chromeBackdrop");
    if (backdrop) backdrop.addEventListener("click", function () { closeCart(); closeQuickView(); });
    var qvClose = $("qvClose");
    if (qvClose) qvClose.addEventListener("click", closeQuickView);
    var qvModal = $("qvModal");
    if (qvModal) qvModal.addEventListener("click", function (e) { if (e.target === qvModal) closeQuickView(); });
    var qvMinus = $("qvMinus"), qvPlus = $("qvPlus");
    if (qvMinus) qvMinus.addEventListener("click", function () { if (state.qvQty > 1) { state.qvQty--; $("qvQty").textContent = state.qvQty; } });
    if (qvPlus) qvPlus.addEventListener("click", function () { if (state.qvQty < 9) { state.qvQty++; $("qvQty").textContent = state.qvQty; } });
    var qvAdd = $("qvAdd");
    if (qvAdd) qvAdd.addEventListener("click", function () { if (state.qvId) { addToCart(state.qvId, state.qvQty); closeQuickView(); openCart(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeQuickView(); closeCart(); }
    });

    var form = $("checkoutForm");
    if (form) form.addEventListener("submit", submitCheckout);
    var again = $("shopAgainBtn");
    if (again) again.addEventListener("click", function () { var s = $("orderSuccess"); if (s) s.hidden = true; });

    loadProducts().then(function () {
      renderSourceNote();
      if (page === "home") renderHome();
      else if (page === "shop") initShop();
      else if (page === "product") initProduct();
      else if (page === "cart") renderCartPage();
      observeReveals(document);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
