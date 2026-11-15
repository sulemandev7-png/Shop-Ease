/* =========================================================
   ShopEase - main.js
   Shared code that runs on EVERY page:
     1. Mobile menu (hamburger) open / close
     2. Highlight the current page in the menu
     3. Put the current year in the footer
     4. "Served by: hostname / AZ" badge from server-info.json
     5. Small helpers used by other files:
        formatPrice() and showToast()
   ========================================================= */

// Run our setup code once the HTML has finished loading.
document.addEventListener('DOMContentLoaded', function () {
  setupMobileMenu();
  highlightCurrentPage();
  setFooterYear();
  loadServerInfo();
});


/* ---------- 1. Mobile menu ---------- */
function setupMobileMenu() {
  const header = document.querySelector('.site-header');
  const button = document.querySelector('.nav-toggle');
  if (!header || !button) return; // page has no menu

  button.addEventListener('click', function () {
    // toggle() adds the class if missing, removes it if present.
    // It returns true when the class is now ON (menu open).
    const isOpen = header.classList.toggle('nav-open');

    // Tell screen readers whether the menu is open.
    button.setAttribute('aria-expanded', isOpen);
    button.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
}


/* ---------- 2. Highlight current page ---------- */
function highlightCurrentPage() {
  // Example: "/shop/products.html" -> "products.html"
  // An empty name means the site root "/", which is index.html.
  let currentPage = window.location.pathname.split('/').pop();
  if (currentPage === '') {
    currentPage = 'index.html';
  }
  // A product detail page belongs to the Shop section
  if (currentPage === 'product.html') {
    currentPage = 'products.html';
  }

  const links = document.querySelectorAll('.site-nav a');
  links.forEach(function (link) {
    // getAttribute gives the raw href, e.g. "products.html"
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}


/* ---------- 3. Footer year ---------- */
function setFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}


/* ---------- 4. "Served by" badge ----------
   Each EC2 server creates its own server-info.json at boot
   (EC2 user data script). Expected format:

     {
       "hostname": "ip-10-0-1-25.ec2.internal",
       "az": "us-east-1a"
     }

   Because the load balancer sends each request to a different
   server, refreshing the page can show a different hostname/AZ. */
async function loadServerInfo() {
  const badge = document.getElementById('server-badge');
  if (!badge) return;
  const text = badge.querySelector('.server-badge__text');

  try {
    // "?t=..." + "no-store" stop the browser from reusing an old copy,
    // so every refresh really asks the load balancer again.
    const response = await fetch('server-info.json?t=' + Date.now(), { cache: 'no-store' });

    if (!response.ok) {
      // e.g. 404 when the file doesn't exist (running locally)
      throw new Error('HTTP ' + response.status);
    }

    const info = await response.json();

    // Accept a couple of common key names, just in case.
    const host = info.hostname || info.host || 'unknown host';
    const az = info.az || info.availability_zone || 'unknown AZ';

    // textContent (not innerHTML) = safe, never runs HTML from the file
    text.textContent = 'Served by: ' + host + ' / ' + az;
    badge.title = info.instance_id ? 'Instance: ' + info.instance_id : host;
    badge.classList.add('is-live');
  } catch (error) {
    // Running on your PC there is no server-info.json - that's expected.
    text.textContent = 'Served by: local (no server-info.json)';
    badge.classList.add('is-offline');
    console.warn('Could not load server-info.json:', error.message);
  }
}


/* ---------- 5. Shared helpers ---------- */

// 24 -> "$24.00"
function formatPrice(amount) {
  return '$' + amount.toFixed(2);
}

// Show a small message in the corner for ~2 seconds.
// Example: showToast('Mug added to cart');
let toastTimer;
function showToast(message) {
  let toast = document.getElementById('toast');

  // Create the toast element the first time we need it
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  // Restart the timer if a new message arrives quickly
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 2000);
}
