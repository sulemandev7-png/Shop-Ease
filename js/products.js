/* =========================================================
   ShopEase - products.js
   Product code for two pages:

   products.html (Shop page)
     - loads products.json
     - filters by category, search text and sort order
     - draws product cards

   product.html?id=4 (Product detail page)
     - shows one product with quantity picker
     - shows "You may also like" cards

   "Add to cart" buttons use addToCart() from cart.js.
   ========================================================= */

// Friendly names for the category codes used in products.json
const CATEGORY_NAMES = {
  home: 'Home & Living',
  tech: 'Tech',
  wellness: 'Wellness',
  accessories: 'Accessories'
};

let allProducts = [];   // filled from products.json

// What the visitor has chosen on the Shop page
const filters = {
  category: 'all',
  search: '',
  sort: 'featured'
};


/* =========================================================
   START: decide which page we are on
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-grid')) {
    initShop();          // we are on products.html
  }
  if (document.getElementById('product-detail')) {
    initProductPage();   // we are on product.html
  }
});

// Load products.json once. Returns true if it worked.
async function loadProducts() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    allProducts = await response.json();
    return true;
  } catch (error) {
    console.error('Failed to load products.json:', error.message);
    return false;
  }
}

// Message shown if products.json can't be loaded
const LOAD_ERROR_HTML = `
  <div class="empty-state">
    <h3>Couldn't load products</h3>
    <p>products.json could not be loaded. Open the site through a web server
       (not by double-clicking the file).</p>
  </div>`;


/* =========================================================
   SHARED: product card + "Add to cart" click handling
   ========================================================= */

// HTML for one product card.
// (Data comes from our own products.json, so innerHTML is fine here.)
function productCardHTML(p) {
  const link = 'product.html?id=' + p.id;

  const badge = p.badge
    ? `<span class="product-badge ${p.badge === 'Sale' ? 'is-sale' : ''}">${p.badge}</span>`
    : '';

  const oldPrice = p.oldPrice
    ? `<s class="price-old">${formatPrice(p.oldPrice)}</s>`
    : '';

  // The image links to the detail page too. tabindex="-1" stops keyboard
  // users from tabbing to the same link twice (the title link is enough).
  return `
    <article class="product-card">
      <a class="product-media" href="${link}" tabindex="-1" aria-hidden="true" style="background:${p.color}">
        ${badge}
        <img src="${p.image}" alt="" loading="lazy">
      </a>
      <div class="product-body">
        <div class="product-top">
          <span class="product-cat">${CATEGORY_NAMES[p.category]}</span>
          <span class="product-rating" aria-label="Rated ${p.rating} out of 5">★ ${p.rating}</span>
        </div>
        <h3><a href="${link}">${p.name}</a></h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-foot">
          <div class="price">${formatPrice(p.price)} ${oldPrice}</div>
          <button type="button" class="btn btn-primary btn-sm add-btn" data-id="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>`;
}

// Used by BOTH pages: if the click was on an "Add to cart" button,
// add that product (qty 1) and show feedback.
function handleAddButtonClick(event) {
  const button = event.target.closest('.add-btn');
  if (!button) return;

  const product = findProduct(Number(button.dataset.id));
  addToCart(product, 1);                      // from cart.js
  showToast(product.name + ' added to cart'); // from main.js
  flashAdded(button, 'Add to cart');
}

// Briefly turn a button green with "Added ✓", then change it back
function flashAdded(button, originalText) {
  button.textContent = 'Added ✓';
  button.classList.add('is-added');
  setTimeout(function () {
    button.textContent = originalText;
    button.classList.remove('is-added');
  }, 1200);
}

function findProduct(id) {
  return allProducts.find(function (p) { return p.id === id; });
}


/* =========================================================
   SHOP PAGE (products.html)
   ========================================================= */
async function initShop() {
  const grid = document.getElementById('product-grid');

  // Read "?category=tech" from the address bar (links from the home page use this)
  const params = new URLSearchParams(window.location.search);
  const categoryFromUrl = params.get('category');
  if (categoryFromUrl && CATEGORY_NAMES[categoryFromUrl]) {
    filters.category = categoryFromUrl;
  }

  const loaded = await loadProducts();
  if (!loaded) {
    grid.innerHTML = LOAD_ERROR_HTML;
    document.getElementById('result-count').textContent = '';
    return;
  }

  setupShopControls();
  renderProducts();
}

function setupShopControls() {
  // Category "chips"
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      filters.category = chip.dataset.category;

      // Keep the address bar in sync so the link can be shared
      const newUrl = filters.category === 'all'
        ? 'products.html'
        : 'products.html?category=' + filters.category;
      history.replaceState(null, '', newUrl);

      renderProducts();
    });
  });

  // Search box: filter as the user types
  document.getElementById('search').addEventListener('input', function (event) {
    filters.search = event.target.value.trim().toLowerCase();
    renderProducts();
  });

  // Sort dropdown
  document.getElementById('sort').addEventListener('change', function (event) {
    filters.sort = event.target.value;
    renderProducts();
  });

  // One click listener on the grid handles every button inside it
  // ("event delegation"), because the cards are re-created on each filter.
  document.getElementById('product-grid').addEventListener('click', function (event) {
    if (event.target.closest('#clear-filters')) {
      resetFilters();
      return;
    }
    handleAddButtonClick(event);
  });
}

function resetFilters() {
  filters.category = 'all';
  filters.search = '';
  filters.sort = 'featured';
  document.getElementById('search').value = '';
  document.getElementById('sort').value = 'featured';
  history.replaceState(null, '', 'products.html');
  renderProducts();
}

// Which products to show, in which order
function getVisibleProducts() {
  // 1. Keep only products that match the category and search text
  const list = allProducts.filter(function (p) {
    const categoryOk = filters.category === 'all' || p.category === filters.category;
    const text = (p.name + ' ' + p.description).toLowerCase();
    const searchOk = text.includes(filters.search);
    return categoryOk && searchOk;
  });

  // 2. Sort (filter() made a new array, so sorting doesn't touch allProducts)
  if (filters.sort === 'price-low') {
    list.sort(function (a, b) { return a.price - b.price; });
  } else if (filters.sort === 'price-high') {
    list.sort(function (a, b) { return b.price - a.price; });
  } else if (filters.sort === 'rating') {
    list.sort(function (a, b) { return b.rating - a.rating; });
  }
  // "featured" = keep the order from products.json

  return list;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('result-count');
  const products = getVisibleProducts();

  // Highlight the active category chip
  document.querySelectorAll('.chip').forEach(function (chip) {
    const isActive = chip.dataset.category === filters.category;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', isActive);
  });

  countEl.textContent = 'Showing ' + products.length + ' of ' + allProducts.length + ' products';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try a different search or category.</p>
        <button type="button" class="btn btn-outline" id="clear-filters">Clear filters</button>
      </div>`;
    return;
  }

  // Build one card per product and put them all in the grid
  grid.innerHTML = products.map(productCardHTML).join('');
}


/* =========================================================
   PRODUCT DETAIL PAGE (product.html?id=4)
   ========================================================= */
async function initProductPage() {
  const box = document.getElementById('product-detail');

  const loaded = await loadProducts();
  if (!loaded) {
    box.innerHTML = LOAD_ERROR_HTML;
    return;
  }

  // Which product? Read "?id=4" from the address bar.
  const params = new URLSearchParams(window.location.search);
  const product = findProduct(Number(params.get('id')));

  // Missing or wrong id -> friendly "not found" message
  if (!product) {
    box.innerHTML = `
      <div class="empty-state">
        <h3>Product not found</h3>
        <p>This product doesn't exist or is no longer available.</p>
        <a href="products.html" class="btn btn-primary">Back to the shop</a>
      </div>`;
    document.getElementById('related').hidden = true;
    return;
  }

  // Browser tab title + breadcrumb
  document.title = product.name + ' | ShopEase';
  const crumbCat = document.getElementById('crumb-category');
  crumbCat.textContent = CATEGORY_NAMES[product.category];
  crumbCat.href = 'products.html?category=' + product.category;
  document.getElementById('crumb-name').textContent = product.name;

  box.innerHTML = productDetailHTML(product);
  setupDetailButtons(product);
  renderRelated(product);
}

// "★★★★☆" from a rating like 4.4
function starsText(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function productDetailHTML(p) {
  const badge = p.badge
    ? `<span class="product-badge ${p.badge === 'Sale' ? 'is-sale' : ''}">${p.badge}</span>`
    : '';

  // On sale: show old price and "Save 25%"
  let saleHTML = '';
  if (p.oldPrice) {
    const percent = Math.round((1 - p.price / p.oldPrice) * 100);
    saleHTML = `
      <s class="price-old">${formatPrice(p.oldPrice)}</s>
      <span class="save-tag">Save ${percent}%</span>`;
  }

  // Bullet list from the "features" array in products.json
  const featuresHTML = (p.features || []).map(function (f) {
    return '<li>' + f + '</li>';
  }).join('');

  return `
    <div class="detail-media" style="background:${p.color}">
      ${badge}
      <img src="${p.image}" alt="${p.name}">
    </div>

    <div class="detail-info">
      <span class="product-cat">${CATEGORY_NAMES[p.category]}</span>
      <h1>${p.name}</h1>

      <div class="detail-rating" aria-label="Rated ${p.rating} out of 5">
        <span class="stars">${starsText(p.rating)}</span>
        <span>${p.rating} out of 5</span>
      </div>

      <div class="detail-price">
        <span class="price">${formatPrice(p.price)}</span>
        ${saleHTML}
      </div>

      <p class="detail-desc">${p.description}</p>
      <ul class="detail-features">${featuresHTML}</ul>

      <div class="detail-buy">
        <div class="qty qty-lg" aria-label="Quantity">
          <button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>
          <span id="detail-qty">1</span>
          <button type="button" data-step="1" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="btn btn-primary detail-add" id="detail-add">Add to cart</button>
      </div>

      <ul class="detail-perks">
        <li>Free shipping on orders over $50</li>
        <li>30-day easy returns</li>
        <li>Ships in 1-2 business days</li>
      </ul>
    </div>`;
}

function setupDetailButtons(product) {
  let qty = 1;
  const MAX_QTY = 10;
  const qtyEl = document.getElementById('detail-qty');

  // The − and + buttons have data-step="-1" / "1"
  document.querySelectorAll('.qty-lg button').forEach(function (button) {
    button.addEventListener('click', function () {
      qty = qty + Number(button.dataset.step);
      qty = Math.max(1, Math.min(MAX_QTY, qty)); // keep between 1 and 10
      qtyEl.textContent = qty;
    });
  });

  const addButton = document.getElementById('detail-add');
  addButton.addEventListener('click', function () {
    addToCart(product, qty); // from cart.js
    showToast(qty + ' x ' + product.name + ' added to cart');
    flashAdded(addButton, 'Add to cart');
  });
}

// "You may also like": same category first, then others. Max 4.
function renderRelated(product) {
  const grid = document.getElementById('related-grid');

  const sameCategory = allProducts.filter(function (p) {
    return p.category === product.category && p.id !== product.id;
  });
  const others = allProducts.filter(function (p) {
    return p.category !== product.category;
  });

  const related = sameCategory.concat(others).slice(0, 4);
  grid.innerHTML = related.map(productCardHTML).join('');

  grid.addEventListener('click', handleAddButtonClick);
}
