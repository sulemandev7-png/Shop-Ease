/* =========================================================
   ShopEase - cart.js
   The shopping cart, saved in the browser's localStorage.
   (No database: each visitor's cart lives in their own browser,
   so it works no matter which EC2 server answers the request.)

   Loaded on EVERY page so the header cart count is always right.
   On cart.html it also draws the full cart.

   A cart is an array of items like:
     { id: 4, name: "Studio Wireless Headphones", price: 89,
       image: "images/cat-tech.svg", color: "#e1e7f3", qty: 2 }
   ========================================================= */

const CART_KEY = 'shopease-cart';   // name of the localStorage entry
const FREE_SHIPPING_MIN = 50;       // free shipping from $50
const SHIPPING_COST = 5.99;


/* ---------- Reading and saving ---------- */

// Get the cart array from localStorage (or an empty array).
function getCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    // Storage blocked or data broken: start with an empty cart.
    return [];
  }
}

// Save the cart array and refresh the header count.
function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn('Could not save cart:', error.message);
  }
  updateCartCount();
}


/* ---------- Changing the cart ---------- */

// Add a product (qty defaults to 1). If it's already in the cart,
// increase its quantity instead of adding a second row.
function addToCart(product, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(function (item) { return item.id === product.id; });

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: product.color,
      qty: qty
    });
  }
  saveCart(cart);
}

// Change quantity by +1 or -1. Reaching 0 removes the item.
function changeQty(id, change) {
  let cart = getCart();
  const item = cart.find(function (i) { return i.id === id; });
  if (!item) return;

  item.qty += change;
  if (item.qty <= 0) {
    cart = cart.filter(function (i) { return i.id !== id; });
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter(function (item) { return item.id !== id; });
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}


/* ---------- Totals ---------- */

// Total number of items (2 mugs + 1 lamp = 3)
function getCartCount() {
  return getCart().reduce(function (sum, item) { return sum + item.qty; }, 0);
}

// Total price before shipping
function getCartSubtotal() {
  return getCart().reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}

// Update the little number next to "Cart" in the header
function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    countEl.textContent = getCartCount();
  }
}


/* ---------- cart.html: draw the cart ---------- */

function renderCartPage() {
  const itemsBox = document.getElementById('cart-items');
  if (!itemsBox) return; // not on the cart page

  const cart = getCart();
  const layout = document.getElementById('cart-layout');
  const emptyBox = document.getElementById('cart-empty');

  // Empty cart: show the "empty" message instead of the list
  if (cart.length === 0) {
    layout.hidden = true;
    emptyBox.hidden = false;
    return;
  }
  layout.hidden = false;
  emptyBox.hidden = true;

  // One row per item. data-action / data-id tell the click handler what to do.
  itemsBox.innerHTML = cart.map(function (item) {
    return `
      <li class="cart-item">
        <div class="cart-thumb" style="background:${item.color}">
          <img src="${item.image}" alt="">
        </div>
        <div class="cart-info">
          <h3><a href="product.html?id=${item.id}">${item.name}</a></h3>
          <span class="cart-unit">${formatPrice(item.price)} each</span>
        </div>
        <div class="qty" aria-label="Quantity">
          <button type="button" data-action="decrease" data-id="${item.id}" aria-label="Remove one">&minus;</button>
          <span>${item.qty}</span>
          <button type="button" data-action="increase" data-id="${item.id}" aria-label="Add one">+</button>
        </div>
        <strong class="cart-line-total">${formatPrice(item.price * item.qty)}</strong>
        <button type="button" class="cart-remove" data-action="remove" data-id="${item.id}" aria-label="Remove ${item.name}">&times;</button>
      </li>`;
  }).join('');

  // Order summary numbers
  const subtotal = getCartSubtotal();
  const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_COST;

  document.getElementById('summary-subtotal').textContent = formatPrice(subtotal);
  document.getElementById('summary-shipping').textContent = shipping === 0 ? 'Free' : formatPrice(shipping);
  document.getElementById('summary-total').textContent = formatPrice(subtotal + shipping);

  // "Add $X more for free shipping" message + progress bar
  const note = document.getElementById('shipping-note');
  const bar = document.getElementById('shipping-bar');
  if (shipping === 0) {
    note.textContent = 'You get free shipping!';
  } else {
    note.textContent = 'Add ' + formatPrice(FREE_SHIPPING_MIN - subtotal) + ' more for free shipping.';
  }
  bar.style.width = Math.min(100, (subtotal / FREE_SHIPPING_MIN) * 100) + '%';
}

// Set up the buttons on cart.html (runs once)
function setupCartPage() {
  const itemsBox = document.getElementById('cart-items');
  if (!itemsBox) return;

  // ONE click listener for the whole list ("event delegation"),
  // instead of one listener per button.
  itemsBox.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === 'increase') changeQty(id, 1);
    if (action === 'decrease') changeQty(id, -1);
    if (action === 'remove') removeFromCart(id);

    renderCartPage(); // redraw with new numbers
  });

  // Demo checkout: no payment, just clear the cart and say thanks.
  document.getElementById('checkout-btn').addEventListener('click', function () {
    const orderNumber = 'SE-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('order-number').textContent = orderNumber;

    clearCart();
    document.getElementById('cart-layout').hidden = true;
    document.getElementById('order-success').hidden = false;
    window.scrollTo(0, 0);
  });

  renderCartPage();
}


/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', function () {
  updateCartCount();
  setupCartPage();
});

// If the cart changes in ANOTHER tab, update this tab too.
window.addEventListener('storage', function (event) {
  if (event.key === CART_KEY) {
    updateCartCount();
    renderCartPage();
  }
});
