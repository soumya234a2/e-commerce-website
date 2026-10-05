/* Haat - e-commerce demo (HTML, CSS, vanilla JavaScript)
   Structure: data -> storage -> cart logic -> billing -> rendering -> events */
"use strict";

/* ===================== 1. Data ===================== */
const PRODUCTS = [
  { id: 1,  name: "Wireless Earbuds",        category: "Electronics",    price: 1499, mrp: 2999, rating: 4.4, icon: "🎧", tile: "#e3e8ff" },
  { id: 2,  name: "Smart Fitness Watch",     category: "Electronics",    price: 2799, mrp: 4999, rating: 4.2, icon: "⌚", tile: "#dff3ec" },
  { id: 3,  name: "Power Bank 10000 mAh",    category: "Electronics",    price: 899,  mrp: 1499, rating: 4.5, icon: "🔋", tile: "#fdf0cf" },
  { id: 4,  name: "Bluetooth Speaker",       category: "Electronics",    price: 1299, mrp: 2199, rating: 4.3, icon: "🔊", tile: "#fde3df" },
  { id: 5,  name: "Cotton Kurta",            category: "Fashion",        price: 799,  mrp: 1299, rating: 4.1, icon: "👘", tile: "#f4e1f3" },
  { id: 6,  name: "Running Shoes",           category: "Fashion",        price: 1899, mrp: 2999, rating: 4.6, icon: "👟", tile: "#dcecf9" },
  { id: 7,  name: "Everyday Backpack",       category: "Fashion",        price: 999,  mrp: 1799, rating: 4.3, icon: "🎒", tile: "#e8efd9" },
  { id: 8,  name: "Steel Water Bottle",      category: "Home & Kitchen", price: 349,  mrp: 599,  rating: 4.4, icon: "🧴", tile: "#dff3f6" },
  { id: 9,  name: "Non-stick Frying Pan",    category: "Home & Kitchen", price: 699,  mrp: 1199, rating: 4.0, icon: "🍳", tile: "#fdebd3" },
  { id: 10, name: "LED Desk Lamp",           category: "Home & Kitchen", price: 549,  mrp: 999,  rating: 4.2, icon: "💡", tile: "#fff5c9" },
  { id: 11, name: "Learn Python the Easy Way", category: "Books",        price: 399,  mrp: 599,  rating: 4.7, icon: "📘", tile: "#dfe6fb" },
  { id: 12, name: "Data Structures Handbook",  category: "Books",        price: 449,  mrp: 699,  rating: 4.5, icon: "📗", tile: "#e0f0dd" }
];

const CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.category))];

const COUPONS = {
  SAVE10:  { label: "10% off",              type: "percent", value: 10 },
  FLAT200: { label: "₹200 off above ₹1,500", type: "flat",    value: 200, minSubtotal: 1500 }
};

const TAX_RATE = 0.18;            // GST
const FREE_DELIVERY_ABOVE = 999;  // after discount
const DELIVERY_FEE = 49;

const STORAGE_KEYS = { cart: "haat_cart_v1", coupon: "haat_coupon_v1" };

/* ===================== 2. State ===================== */
const state = {
  cart: {},            // { productId: quantity }
  coupon: "",          // applied coupon code or ""
  category: "All",
  query: "",
  sort: "featured"
};

/* ===================== 3. Helpers ===================== */
const $ = (selector) => document.querySelector(selector);

function formatINR(amount) {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2
  }).format(amount);
}
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const getProduct = (id) => PRODUCTS.find(p => p.id === id);
function discountPercent(p) { return Math.round((1 - p.price / p.mrp) * 100); }

let toastTimer;
function showToast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ===================== 4. Storage (localStorage) ===================== */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
    localStorage.setItem(STORAGE_KEYS.coupon, state.coupon);
  } catch (error) { /* storage blocked: the cart still works for this visit */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "{}");
    // keep only valid products with sensible quantities
    Object.keys(saved).forEach((id) => {
      const qty = Number(saved[id]);
      if (getProduct(Number(id)) && Number.isInteger(qty) && qty > 0) {
        state.cart[id] = Math.min(qty, 10);
      }
    });
    const coupon = localStorage.getItem(STORAGE_KEYS.coupon) || "";
    state.coupon = COUPONS[coupon] ? coupon : "";
  } catch (error) {
    state.cart = {};
    state.coupon = "";
  }
}

/* ===================== 5. Cart logic ===================== */
const MAX_QTY = 10;

function addToCart(id) {
  const current = state.cart[id] || 0;
  if (current >= MAX_QTY) {
    showToast(`You can buy up to ${MAX_QTY} of one item.`);
    return;
  }
  state.cart[id] = current + 1;
  update();
  showToast(`${getProduct(id).name} added to cart`);
  const count = $("#cartCount");
  count.classList.remove("bump");
  void count.offsetWidth;        // restart animation
  count.classList.add("bump");
}

function changeQty(id, delta) {
  const next = (state.cart[id] || 0) + delta;
  if (next <= 0) return removeFromCart(id);
  if (next > MAX_QTY) { showToast(`You can buy up to ${MAX_QTY} of one item.`); return; }
  state.cart[id] = next;
  update();
}

function removeFromCart(id) {
  delete state.cart[id];
  update();
}

function clearCart() {
  state.cart = {};
  state.coupon = "";
  update();
}

function getCartItems() {
  return Object.keys(state.cart).map((id) => {
    const product = getProduct(Number(id));
    return { product, qty: state.cart[id], lineTotal: product.price * state.cart[id] };
  });
}

const cartItemCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);

/* ===================== 6. Billing ===================== */
function calculateDiscount(subtotal, code) {
  const coupon = COUPONS[code];
  if (!coupon) return 0;
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) return 0;
  const raw = coupon.type === "percent" ? subtotal * coupon.value / 100 : coupon.value;
  return round2(Math.min(raw, subtotal));
}

function calculateBill(items, code) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = calculateDiscount(subtotal, code);
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * TAX_RATE);
  const delivery = items.length === 0 || taxable >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = round2(taxable + tax + delivery);
  return { subtotal, discount, tax, delivery, total };
}

function applyCoupon(rawCode) {
  const code = rawCode.trim().toUpperCase();
  const msg = $("#couponMsg");
  msg.className = "coupon-msg";

  if (!code) { msg.textContent = "Enter a coupon code."; msg.classList.add("bad"); return; }
  const coupon = COUPONS[code];
  if (!coupon) { msg.textContent = "That code is not valid."; msg.classList.add("bad"); return; }

  const { subtotal } = calculateBill(getCartItems(), "");
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    msg.textContent = `${code} needs a cart of at least ${formatINR(coupon.minSubtotal)}.`;
    msg.classList.add("bad");
    return;
  }
  state.coupon = code;
  update();
}

function removeCoupon() {
  state.coupon = "";
  $("#couponInput").value = "";
  update();
}

/* ===================== 7. Rendering ===================== */
function getVisibleProducts() {
  const q = state.query.trim().toLowerCase();
  let list = PRODUCTS.filter((p) =>
    (state.category === "All" || p.category === state.category) &&
    (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );
  const sorters = {
    "price-asc":  (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "rating":     (a, b) => b.rating - a.rating
  };
  if (sorters[state.sort]) list = [...list].sort(sorters[state.sort]);
  return list;
}

function renderChips() {
  $("#categoryChips").innerHTML = CATEGORIES.map((c) =>
    `<button type="button" class="chip" data-category="${c}" aria-pressed="${c === state.category}">${c}</button>`
  ).join("");
}

function renderProducts() {
  const list = getVisibleProducts();
  $("#productGrid").innerHTML = list.map((p) => `
    <article class="card">
      <div class="card-art" style="--tile:${p.tile}" aria-hidden="true">
        <span class="card-badge">${discountPercent(p)}% off</span>${p.icon}
      </div>
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <div class="card-rating"><b>${p.rating.toFixed(1)}</b> out of 5</div>
        <div class="price-row">
          <span class="price">${formatINR(p.price)}</span>
          <span class="mrp">${formatINR(p.mrp)}</span>
        </div>
        <button type="button" class="btn btn-primary" data-add="${p.id}" aria-label="Add ${p.name} to cart">Add to cart</button>
      </div>
    </article>`).join("");

  $("#resultCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  $("#emptyState").hidden = list.length !== 0;
  $("#productGrid").hidden = list.length === 0;
}

function renderCart() {
  const items = getCartItems();
  const body = $("#cartBody");
  const foot = $("#cartFoot");

  $("#cartCount").textContent = cartItemCount();

  if (items.length === 0) {
    body.innerHTML = `<div class="cart-empty"><strong>Your cart is empty</strong>Add a product from the list to see your bill here.</div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;

  body.innerHTML = items.map(({ product: p, qty, lineTotal }) => `
    <div class="line" data-line="${p.id}">
      <div class="line-art" style="--tile:${p.tile}" aria-hidden="true">${p.icon}</div>
      <div>
        <div class="line-title">${p.name}</div>
        <div class="line-unit">${formatINR(p.price)} each</div>
        <div class="qty" role="group" aria-label="Quantity of ${p.name}">
          <button type="button" data-dec="${p.id}" aria-label="Decrease quantity">−</button>
          <span aria-live="polite">${qty}</span>
          <button type="button" data-inc="${p.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="line-side">
        <div class="line-total">${formatINR(lineTotal)}</div>
        <button type="button" class="remove" data-remove="${p.id}" aria-label="Remove ${p.name}">Remove</button>
      </div>
    </div>`).join("");

  renderBill(items);
}

function renderBill(items) {
  const bill = calculateBill(items, state.coupon);
  const coupon = COUPONS[state.coupon];
  const rows = [
    ["Subtotal", formatINR(bill.subtotal), ""]
  ];
  if (state.coupon && bill.discount > 0) {
    rows.push([`Discount (${state.coupon})`, "− " + formatINR(bill.discount), "discount"]);
  }
  rows.push([`GST (${Math.round(TAX_RATE * 100)}%)`, formatINR(bill.tax), ""]);
  rows.push(["Delivery", bill.delivery === 0 ? "Free" : formatINR(bill.delivery), ""]);
  rows.push(["Total payable", formatINR(bill.total), "total"]);

  $("#billBox").innerHTML = rows.map(([label, value, cls]) =>
    `<div class="bill-row ${cls}"><dt>${label}</dt><dd>${value}</dd></div>`).join("");

  // coupon message follows the real state of the cart
  const msg = $("#couponMsg");
  if (state.coupon && coupon) {
    if (bill.discount > 0) {
      msg.className = "coupon-msg ok";
      msg.innerHTML = `${state.coupon} applied: ${coupon.label}. <button type="button" class="remove" id="removeCoupon">Remove</button>`;
    } else {
      msg.className = "coupon-msg bad";
      msg.innerHTML = `${state.coupon} needs a cart of at least ${formatINR(coupon.minSubtotal)}. <button type="button" class="remove" id="removeCoupon">Remove</button>`;
    }
  } else if (!msg.classList.contains("bad")) {
    msg.className = "coupon-msg";
    msg.textContent = "";
  }
}

/* one function to refresh everything that depends on the cart */
function update() {
  if (state.coupon && Object.keys(state.cart).length === 0) state.coupon = "";
  saveState();
  renderCart();
  const checkoutOpen = !$("#checkoutModal").hidden;
  if (checkoutOpen) $("#modalTotal").textContent = formatINR(calculateBill(getCartItems(), state.coupon).total);
}

/* ===================== 8. Drawer and modals ===================== */
let lastFocused = null;

function openCart() {
  lastFocused = document.activeElement;
  $("#overlay").hidden = false;
  const drawer = $("#cartDrawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  $("#closeCart").focus();
}

function closeCart() {
  $("#overlay").hidden = true;
  const drawer = $("#cartDrawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  if (lastFocused) lastFocused.focus();
}

function openCheckout() {
  if (getCartItems().length === 0) return;
  $("#modalTotal").textContent = formatINR(calculateBill(getCartItems(), state.coupon).total);
  clearFormErrors();
  $("#checkoutModal").hidden = false;
  $("#fName").focus();
}

function closeCheckout() { $("#checkoutModal").hidden = true; }

/* ===================== 9. Checkout validation ===================== */
function clearFormErrors() {
  document.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}

function setFieldError(id, message) {
  $(`[data-error-for="${id}"]`).textContent = message;
  $("#" + id).classList.add("invalid");
}

function validateCheckout(data) {
  clearFormErrors();
  let firstBad = null;
  const fail = (id, msg) => { setFieldError(id, msg); firstBad = firstBad || id; };

  if (data.name.trim().length < 2) fail("fName", "Enter your full name.");
  if (!/^[6-9]\d{9}$/.test(data.phone.trim())) fail("fPhone", "Enter a valid 10-digit mobile number.");
  if (data.address.trim().length < 10) fail("fAddress", "Enter your full delivery address (at least 10 characters).");

  if (firstBad) $("#" + firstBad).focus();
  return !firstBad;
}

function placeOrder(data) {
  const bill = calculateBill(getCartItems(), state.coupon);
  const orderId = "HT" + Date.now().toString().slice(-8);
  const items = cartItemCount();

  clearCart();
  closeCheckout();
  closeCart();

  $("#successText").textContent =
    `Thank you, ${data.name.trim().split(" ")[0]}. Your order ${orderId} for ${items} item${items === 1 ? "" : "s"} ` +
    `(${formatINR(bill.total)}, paid by ${data.payment}) will be delivered to your address. This is a demo, so no real order was placed.`;
  $("#successModal").hidden = false;
  $("#closeSuccess").focus();
}

/* ===================== 10. Events ===================== */
function bindEvents() {
  // product grid: add to cart (event delegation)
  $("#productGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) addToCart(Number(btn.dataset.add));
  });

  // category chips
  $("#categoryChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-category]");
    if (!chip) return;
    state.category = chip.dataset.category;
    renderChips();
    renderProducts();
  });

  // search (live) and sort
  $("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; renderProducts(); });
  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); $("#products").scrollIntoView(); });
  $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
  $("#resetFilters").addEventListener("click", () => {
    state.category = "All"; state.query = ""; state.sort = "featured";
    $("#searchInput").value = ""; $("#sortSelect").value = "featured";
    renderChips(); renderProducts();
  });

  // cart drawer
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", closeCart);

  $("#cartBody").addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const rem = e.target.closest("[data-remove]");
    if (inc) changeQty(Number(inc.dataset.inc), 1);
    else if (dec) changeQty(Number(dec.dataset.dec), -1);
    else if (rem) removeFromCart(Number(rem.dataset.remove));
  });

  $("#couponForm").addEventListener("submit", (e) => {
    e.preventDefault();
    applyCoupon($("#couponInput").value);
    $("#couponInput").value = "";
  });
  $("#cartFoot").addEventListener("click", (e) => {
    if (e.target.id === "removeCoupon") removeCoupon();
  });

  // checkout
  $("#checkoutBtn").addEventListener("click", openCheckout);
  $("#cancelCheckout").addEventListener("click", closeCheckout);
  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {
      name: form.get("name") || "", phone: form.get("phone") || "",
      address: form.get("address") || "", payment: form.get("payment") || "UPI"
    };
    if (validateCheckout(data)) { placeOrder(data); e.target.reset(); }
  });
  $("#closeSuccess").addEventListener("click", () => { $("#successModal").hidden = true; });

  // Escape closes the top-most layer
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#successModal").hidden) $("#successModal").hidden = true;
    else if (!$("#checkoutModal").hidden) closeCheckout();
    else if ($("#cartDrawer").classList.contains("open")) closeCart();
  });
}

/* ===================== 11. Start ===================== */
function init() {
  loadState();
  renderChips();
  renderProducts();
  update();
  bindEvents();
}

// Expose the pure billing helpers so they can be unit-tested in Node.
if (typeof module !== "undefined") {
  module.exports = { calculateBill, calculateDiscount, formatINR, PRODUCTS, COUPONS };
}
if (typeof document !== "undefined") init();
