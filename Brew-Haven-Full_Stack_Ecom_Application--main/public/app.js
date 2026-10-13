/**
 * Brew Haven — SPA Client
 * Hash-based router: #/login | #/register | #/menu
 * Communicates with Express API over fetch (credentials: 'include' for cookies)
 */
'use strict';

// ── App State ──────────────────────────────────────────────────────────────────
const state = {
  user: null,        // { id, name, email, role }
  menuItems: [],
  loading: false,
};

// ── API Helper ─────────────────────────────────────────────────────────────────
const API = {
  async request(method, url, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },
  get:    (url)       => API.request('GET',    url),
  post:   (url, body) => API.request('POST',   url, body),
  patch:  (url, body) => API.request('PATCH',  url, body),
  delete: (url)       => API.request('DELETE', url),
};

// ── Toast Notifications ────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Auth Check ─────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const data = await API.get('/api/auth/me');
    state.user = data.user;
    return true;
  } catch {
    state.user = null;
    return false;
  }
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
function updateNavbar() {
  const navbar = document.getElementById('navbar');
  const navUser = document.getElementById('navUser');
  const navLogout = document.getElementById('navLogout');
  const navCart = document.getElementById('navCart');
  const navCheckout = document.getElementById('navCheckout');
  const navOrders = document.getElementById('navOrders');
  const navMenu = document.getElementById('navMenu');

  if (state.user) {
    navbar.classList.remove('hidden');
    navUser.textContent = state.user.name;

    const isAdmin = state.user.role === 'admin';
    if (navMenu) navMenu.textContent = isAdmin ? 'Inventory' : 'Menu';
    if (navCart) navCart.classList.toggle('hidden', isAdmin);
    if (navCheckout) navCheckout.classList.toggle('hidden', isAdmin);
    if (navOrders) navOrders.classList.toggle('hidden', !isAdmin);

    navLogout.onclick = async () => {
      try {
        await API.post('/api/auth/logout');
        state.user = null;
        updateNavbar();
        showToast('Logged out successfully. See you next time!', 'info');
        route('#/login');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  } else {
    navbar.classList.add('hidden');
    if (navMenu) navMenu.textContent = 'Menu';
  }
}

// ── Router ─────────────────────────────────────────────────────────────────────
const routes = {
  '#/login':    renderLogin,
  '#/register': renderRegister,
  '#/menu':     renderMenu,
  '#/cart':     renderCart,
  '#/checkout': renderCheckout,
  '#/orders':   renderAdminOrders,
};

function route(hash) {
  window.location.hash = hash || '#/login';
}

async function handleRouteChange() {
  const hash = window.location.hash || '#/login';
  const app  = document.getElementById('app');

  // Show loading state
  app.innerHTML = `
    <div class="loading-screen">
      <div class="spinner"></div>
      <p>Loading…</p>
    </div>`;

  // Verify auth status on every navigation
  const isAuthenticated = await checkAuth();
  updateNavbar();

  // Guard: non-auth pages redirect to menu if already logged in
  if ((hash === '#/login' || hash === '#/register') && isAuthenticated) {
    route('#/menu');
    return;
  }

  // Guard: protected pages require login
  const protectedHashes = ['#/menu', '#/cart', '#/checkout', '#/orders'];
  if (protectedHashes.includes(hash) && !isAuthenticated) {
    route('#/login');
    return;
  }

  if (hash === '#/orders' && state.user && state.user.role !== 'admin') {
    route('#/menu');
    return;
  }

  if ((hash === '#/cart' || hash === '#/checkout') && state.user && state.user.role === 'admin') {
    route('#/menu');
    return;
  }

  const renderer = routes[hash] || renderLogin;
  renderer(app);
}

window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('DOMContentLoaded', handleRouteChange);

// ── Page: Login ────────────────────────────────────────────────────────────────
function renderLogin(app) {
  app.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-panel-left">
        <div class="auth-brand">
          <h1>Brew Haven</h1>
          <p>Artisan Coffee &amp; Beverages</p>
          <div class="auth-brand-divider"></div>
          <div class="auth-brand-taglines">
            <div class="tagline"><span class="tagline-dot"></span>Hand-crafted with premium Arabica beans</div>
            <div class="tagline"><span class="tagline-dot"></span>Sourced from sustainable farms worldwide</div>
            <div class="tagline"><span class="tagline-dot"></span>Roasted fresh every morning</div>
          </div>
        </div>
      </div>
      <div class="auth-panel-right">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          <div class="admin-hint">
            <strong>Demo Admin Account</strong>
            admin@brewhaven.com &nbsp;/&nbsp; admin123
          </div>

          <form id="loginForm" novalidate>
            <div class="form-group">
              <label for="loginEmail">Email Address</label>
              <input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email" required />
              <span class="form-error" id="loginEmailErr"></span>
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password" required />
              <span class="form-error" id="loginPasswordErr"></span>
            </div>
            <button type="submit" class="btn-primary" id="loginBtn">Sign In</button>
          </form>

          <p class="auth-alt">
            Don't have an account? <a href="#/register">Create one</a>
          </p>
        </div>
      </div>
    </div>`;

  const form   = document.getElementById('loginForm');
  const btn    = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    let valid = true;

    if (!email) {
      showFieldError('loginEmailErr', 'Email is required.');
      valid = false;
    }
    if (!password) {
      showFieldError('loginPasswordErr', 'Password is required.');
      valid = false;
    }
    if (!valid) return;

    btn.disabled    = true;
    btn.textContent = 'Signing in…';

    try {
      const data = await API.post('/api/auth/login', { email, password });
      state.user = data.user;
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      route('#/menu');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Sign In';
    }
  });
}

// ── Page: Register ─────────────────────────────────────────────────────────────
function renderRegister(app) {
  app.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-panel-left">
        <div class="auth-brand">
          <h1>Brew Haven</h1>
          <p>Artisan Coffee &amp; Beverages</p>
          <div class="auth-brand-divider"></div>
          <div class="auth-brand-taglines">
            <div class="tagline"><span class="tagline-dot"></span>Hand-crafted with premium Arabica beans</div>
            <div class="tagline"><span class="tagline-dot"></span>Sourced from sustainable farms worldwide</div>
            <div class="tagline"><span class="tagline-dot"></span>Roasted fresh every morning</div>
          </div>
        </div>
      </div>
      <div class="auth-panel-right">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Create Account</h1>
            <p>Join Brew Haven today</p>
          </div>

          <form id="registerForm" novalidate>
            <div class="form-group">
              <label for="regName">Full Name</label>
              <input type="text" id="regName" placeholder="Your name" autocomplete="name" required />
              <span class="form-error" id="regNameErr"></span>
            </div>
            <div class="form-group">
              <label for="regEmail">Email Address</label>
              <input type="email" id="regEmail" placeholder="you@example.com" autocomplete="email" required />
              <span class="form-error" id="regEmailErr"></span>
            </div>
            <div class="form-group">
              <label for="regPassword">Password</label>
              <input type="password" id="regPassword" placeholder="At least 6 characters" autocomplete="new-password" required />
              <span class="form-error" id="regPasswordErr"></span>
            </div>
            <div class="form-group">
              <label for="regConfirm">Confirm Password</label>
              <input type="password" id="regConfirm" placeholder="Repeat password" autocomplete="new-password" required />
              <span class="form-error" id="regConfirmErr"></span>
            </div>
            <button type="submit" class="btn-primary" id="regBtn">Create Account</button>
          </form>

          <p class="auth-alt">
            Already have an account? <a href="#/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>`;

  const form = document.getElementById('registerForm');
  const btn  = document.getElementById('regBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm').value;

    let valid = true;

    if (!name || name.length < 2) {
      showFieldError('regNameErr', 'Name must be at least 2 characters.');
      valid = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showFieldError('regEmailErr', 'Please enter a valid email address.');
      valid = false;
    }
    if (!password || password.length < 6) {
      showFieldError('regPasswordErr', 'Password must be at least 6 characters.');
      valid = false;
    }
    if (password !== confirm) {
      showFieldError('regConfirmErr', 'Passwords do not match.');
      valid = false;
    }
    if (!valid) return;

    btn.disabled    = true;
    btn.textContent = 'Creating account…';

    try {
      const data = await API.post('/api/auth/register', { name, email, password });
      state.user = data.user;
      showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
      route('#/menu');
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Create Account';
    }
  });
}

// ── Page: Menu ─────────────────────────────────────────────────────────────────
async function renderMenu(app) {
  const isAdmin = state.user && state.user.role === 'admin';

  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Brew Haven</h1>
        <p>${isAdmin ? 'Inventory' : 'Artisan Coffee &amp; Beverages'}</p>
      </header>

      <div class="controls">
        <div class="controls-row">
          <input type="text" id="searchBox" class="search-box" placeholder="${isAdmin ? ' Search inventory…' : ' Search for your favorite coffee…'}" />
          ${isAdmin ? `<button class="toggle-form-btn" id="toggleFormBtn">Add New Item</button>` : ''}
        </div>

        ${isAdmin ? `
        <div id="addItemForm" class="add-item-form hidden">
          <h3>Add New Menu Item</h3>
          <form id="menuForm" novalidate>
            <div class="form-group">
              <label for="itemName">Name *</label>
              <input type="text" id="itemName" placeholder="e.g. Vanilla Latte" required />
            </div>
            <div class="form-group">
              <label for="itemPrice">Price ($) *</label>
              <input type="number" id="itemPrice" step="0.01" min="0.01" placeholder="e.g. 4.50" required />
            </div>
            <div class="form-group">
              <label for="itemCategory">Category</label>
              <select id="itemCategory">
                <option value="hot">Hot</option>
                <option value="cold">Cold</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div class="form-group">
              <label for="itemDescription">Description *</label>
              <textarea id="itemDescription" placeholder="Describe this drink…" required></textarea>
            </div>
            <button type="submit" class="btn-primary" style="width:auto;padding:12px 32px;">Add to Menu</button>
          </form>
        </div>` : ''}
      </div>

      <div id="menuContainer" class="menu-grid"></div>
      <div id="noResults" class="no-results hidden">No items found matching your search.</div>
    </div>`;

  // Load menu items
  await loadAndDisplayMenu(isAdmin);

  // Search
  document.getElementById('searchBox').addEventListener('input', (e) => {
    filterItems(e.target.value, isAdmin);
  });

  // Add item form (admin only)
  if (isAdmin) {
    document.getElementById('toggleFormBtn').addEventListener('click', () => {
      document.getElementById('addItemForm').classList.toggle('hidden');
    });

    document.getElementById('menuForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');

      const name        = document.getElementById('itemName').value.trim();
      const price       = document.getElementById('itemPrice').value;
      const description = document.getElementById('itemDescription').value.trim();
      const category    = document.getElementById('itemCategory').value;

      if (!name || !price || !description) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }
      if (parseFloat(price) <= 0) {
        showToast('Price must be greater than $0.', 'error');
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Adding…';

      try {
        const data = await API.post('/api/menu', { name, price, description, category });
        state.menuItems.push(data.item);
        const searchTerm = document.getElementById('searchBox')?.value || '';
        filterItems(searchTerm, isAdmin);
        e.target.reset();
        document.getElementById('addItemForm').classList.add('hidden');
        showToast(`"${data.item.name}" added to the menu!`, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Add to Menu';
      }
    });
  }
}

// ── Page: Cart ─────────────────────────────────────────────────────────────────
async function renderCart(app) {
  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Your Cart</h1>
        <p>Review items before checkout</p>
      </header>

      <div class="controls">
        <p class="auth-alt" style="margin-top:0">
          <a href="#/menu">Continue shopping</a>
          &nbsp;·&nbsp;
          <a href="#/checkout">Checkout</a>
        </p>
        <div id="cartLines"></div>
        <div id="cartEmpty" class="no-results hidden" style="padding:40px 20px;font-family:'Lato',sans-serif;font-size:1.1em;">
          Your cart is empty.
        </div>
        <div id="cartFooter" class="hidden">
          <hr class="divider" />
          <p style="color:var(--brown-dark);font-weight:700;font-size:1.1em;margin-bottom:16px;">
            Subtotal: $<span id="cartSubtotal">0.00</span>
          </p>
          <a href="#/checkout" class="btn-primary" style="display:inline-block;text-align:center;text-decoration:none;width:auto;padding:12px 32px;">Proceed to checkout</a>
        </div>
      </div>
    </div>`;

  const cartLines = document.getElementById('cartLines');
  const emptyEl   = document.getElementById('cartEmpty');
  const footerEl  = document.getElementById('cartFooter');

  try {
    const data = await API.get('/api/cart');

    if (!data.items || data.items.length === 0) {
      emptyEl.classList.remove('hidden');
      footerEl.classList.add('hidden');
      cartLines.innerHTML = '';
      return;
    }

    emptyEl.classList.add('hidden');
    footerEl.classList.remove('hidden');
    document.getElementById('cartSubtotal').textContent = Number(data.subtotal).toFixed(2);

    cartLines.innerHTML = `
      <div class="menu-grid">
        ${data.items.map(item => `
          <div class="menu-item" data-id="${item.menuItemId}">
            <div class="menu-item-header">
              <h3>${escapeHtml(item.name)}</h3>
              <span class="price">$${Number(item.price).toFixed(2)}</span>
            </div>
            <p class="description">Line total: $${Number(item.lineTotal).toFixed(2)}</p>
            <div class="card-footer" style="justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <label for="qty-${item.menuItemId}" class="form-group" style="margin:0;min-width:unset;">
                  <span style="display:block;margin-bottom:6px;">Quantity</span>
                  <input type="number" id="qty-${item.menuItemId}" class="search-box cart-qty" style="max-width:96px;padding:10px 12px;min-width:unset;"
                    min="1" max="99" value="${item.quantity}" data-id="${item.menuItemId}" />
                </label>
              </div>
              <button type="button" class="btn-danger cart-remove" data-id="${item.menuItemId}">Remove</button>
            </div>
          </div>`).join('')}
      </div>`;

    cartLines.querySelectorAll('.cart-qty').forEach(input => {
      input.addEventListener('change', async () => {
        const id  = parseInt(input.dataset.id, 10);
        const qty = parseInt(input.value, 10);
        if (Number.isNaN(qty) || qty < 1 || qty > 99) {
          showToast('Quantity must be between 1 and 99.', 'error');
          input.value = input.defaultValue;
          return;
        }
        input.disabled = true;
        try {
          await API.patch(`/api/cart/items/${id}`, { quantity: qty });
          input.defaultValue = input.value;
          showToast('Cart updated.', 'info');
          await renderCart(app);
        } catch (err) {
          showToast(err.message, 'error');
          input.value = input.defaultValue;
        } finally {
          input.disabled = false;
        }
      });
    });

    cartLines.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        btn.disabled = true;
        try {
          await API.delete(`/api/cart/items/${id}`);
          showToast('Item removed.', 'info');
          await renderCart(app);
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    cartLines.innerHTML = `<p class="no-results" style="padding:24px;">${escapeHtml(err.message)}</p>`;
    emptyEl.classList.add('hidden');
    footerEl.classList.add('hidden');
  }
}

// ── Page: Checkout ─────────────────────────────────────────────────────────────
async function renderCheckout(app) {
  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Checkout</h1>
        <p>Confirm your order</p>
      </header>

      <div class="controls">
        <p class="auth-alt" style="margin-top:0">
          <a href="#/cart">Back to cart</a>
          &nbsp;·&nbsp;
          <a href="#/menu">Menu</a>
        </p>
        <div id="checkoutSummary"></div>
        <div id="checkoutSuccess" class="add-item-form hidden" style="margin-top:20px;">
          <h3>Thank you</h3>
          <p id="checkoutSuccessBody" style="color:var(--text-mid);line-height:1.6;margin-bottom:12px;"></p>
          <p class="auth-alt" style="margin-top:0"><a href="#/menu">Return to menu</a></p>
        </div>
        <form id="checkoutForm" novalidate>
          <div class="form-group">
            <label for="deliveryStreet">Street address *</label>
            <input type="text" id="deliveryStreet" maxlength="200" placeholder="Street, number, suite or apartment" autocomplete="street-address" required />
          </div>
          <div class="form-group">
            <label for="deliveryCity">City *</label>
            <input type="text" id="deliveryCity" maxlength="100" placeholder="City" autocomplete="address-level2" required />
          </div>
          <div class="form-group">
            <label for="deliveryState">State / region (optional)</label>
            <input type="text" id="deliveryState" maxlength="50" placeholder="State or province" autocomplete="address-level1" />
          </div>
          <div class="form-group">
            <label for="deliveryPostalCode">Postal code (optional)</label>
            <input type="text" id="deliveryPostalCode" maxlength="20" placeholder="ZIP or postal code" autocomplete="postal-code" />
          </div>
          <div class="form-group">
            <label for="orderNotes">Order notes (optional)</label>
            <textarea id="orderNotes" maxlength="500" placeholder="Delivery instructions, contact phone, etc." rows="3"></textarea>
          </div>
          <button type="submit" class="btn-primary" id="checkoutSubmitBtn" style="width:auto;padding:12px 32px;">Place order</button>
        </form>
      </div>
    </div>`;

  const summaryEl  = document.getElementById('checkoutSummary');
  const form         = document.getElementById('checkoutForm');
  const successBox   = document.getElementById('checkoutSuccess');
  const successBody  = document.getElementById('checkoutSuccessBody');
  const submitBtn    = document.getElementById('checkoutSubmitBtn');

  async function refreshSummary() {
    const data = await API.get('/api/cart');
    if (!data.items || data.items.length === 0) {
      summaryEl.innerHTML = `
        <p class="auth-alt" style="margin-bottom:20px;">
          Your cart is empty. <a href="#/menu">Browse the menu</a>
        </p>`;
      form.classList.add('hidden');
      return;
    }
    form.classList.remove('hidden');
    successBox.classList.add('hidden');
    summaryEl.innerHTML = `
      <div class="add-item-form" style="margin-bottom:20px;">
        <h3>Order summary</h3>
        <ul style="list-style:none;padding:0;margin:0 0 16px 0;color:var(--text-mid);line-height:1.7;">
          ${data.items
      .map(
        item =>
          `<li style="display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(139,111,71,0.15);padding:8px 0;">
              <span>${escapeHtml(item.name)} × ${item.quantity}</span>
              <span style="font-weight:700;color:var(--brown-dark);">$${Number(item.lineTotal).toFixed(2)}</span>
            </li>`
      )
      .join('')}
        </ul>
        <p style="font-weight:700;color:var(--brown-dark);font-size:1.05em;">
          Subtotal: $${Number(data.subtotal).toFixed(2)}
        </p>
      </div>`;
  }

  try {
    await refreshSummary();
  } catch (err) {
    summaryEl.innerHTML = `<p class="no-results" style="padding:24px;">${escapeHtml(err.message)}</p>`;
    form.classList.add('hidden');
    return;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const notes = document.getElementById('orderNotes').value.trim();
    const deliveryStreet = document.getElementById('deliveryStreet').value.trim();
    const deliveryCity = document.getElementById('deliveryCity').value.trim();
    const deliveryState = document.getElementById('deliveryState').value.trim();
    const deliveryPostalCode = document.getElementById('deliveryPostalCode').value.trim();

    if (deliveryStreet.length < 5) {
      showToast('Please enter a complete street address (at least 5 characters).', 'error');
      return;
    }
    if (deliveryCity.length < 2) {
      showToast('Please enter a valid city.', 'error');
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Placing order…';

    try {
      const result = await API.post('/api/orders', {
        orderNotes: notes,
        deliveryStreet,
        deliveryCity,
        deliveryState,
        deliveryPostalCode,
      });
      showToast(result.message || 'Order placed successfully.', 'success');
      form.classList.add('hidden');
      summaryEl.innerHTML = '';
      successBox.classList.remove('hidden');
      successBody.innerHTML = `
        Your order <strong>#${result.order.id}</strong> has been received.
        Subtotal: <strong>$${Number(result.order.subtotal).toFixed(2)}</strong>.`;
      document.getElementById('orderNotes').value = '';
      document.getElementById('deliveryStreet').value = '';
      document.getElementById('deliveryCity').value = '';
      document.getElementById('deliveryState').value = '';
      document.getElementById('deliveryPostalCode').value = '';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Place order';
    }
  });
}

// ── Page: Admin orders ─────────────────────────────────────────────────────────
function formatDeliveryAddress(order) {
  const d = order.delivery;
  if (!d || typeof d !== 'object') return 'Not recorded';
  const stateZip = [d.state, d.postalCode].filter(Boolean).join(' ').trim();
  const parts = [d.street, d.city, stateZip || null].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Not recorded';
}

async function renderAdminOrders(app) {
  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Orders</h1>
        <p>Customer orders and delivery details</p>
      </header>

      <div class="controls">
        <p class="auth-alt" style="margin-top:0"><a href="#/menu">Back to inventory</a></p>
        <div id="ordersAdminList"></div>
      </div>
    </div>`;

  const list = document.getElementById('ordersAdminList');

  try {
    const data = await API.get('/api/orders/all');
    if (!data.orders || data.orders.length === 0) {
      list.innerHTML =
        '<p class="auth-alt" style="text-align:left;margin:0;color:var(--brown-dark);">No orders yet.</p>';
      return;
    }

    list.innerHTML = data.orders
      .map(order => {
        const itemsRows = (order.items || [])
          .map(
            li => `<tr>
              <td style="padding:8px 10px;color:var(--text-mid);vertical-align:top;">${escapeHtml(li.name)}</td>
              <td style="padding:8px 10px;font-weight:700;color:var(--brown-dark);vertical-align:top;width:100px;">${Number(li.quantity)}</td>
            </tr>`
          )
          .join('');

        let customer = '';
        if (order.userName || order.userEmail) {
          const primary = escapeHtml(order.userName || order.userEmail || '');
          const secondary =
            order.userName && order.userEmail
              ? ` <span style="color:var(--text-mid);">(${escapeHtml(order.userEmail)})</span>`
              : '';
          customer = `<p class="description" style="margin-bottom:10px;">Customer: ${primary}${secondary}</p>`;
        }

        return `
          <div class="add-item-form" style="margin-bottom:20px;">
            <h3>Order #${order.id}</h3>
            ${customer}
            <p class="description" style="margin-bottom:14px;line-height:1.65;">
              <strong style="color:var(--brown-dark);display:block;margin-bottom:4px;">Delivery address</strong>
              ${escapeHtml(formatDeliveryAddress(order))}
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:0.95em;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px 10px;border-bottom:2px solid rgba(139,111,71,0.25);color:var(--brown-dark);">Item name</th>
                  <th style="text-align:left;padding:8px 10px;border-bottom:2px solid rgba(139,111,71,0.25);color:var(--brown-dark);width:110px;">Quantity</th>
                </tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>
          </div>`;
      })
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="no-results" style="padding:24px;">${escapeHtml(err.message)}</p>`;
  }
}

async function loadAndDisplayMenu(isAdmin) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = `
    <div class="loading-screen" style="grid-column:1/-1">
      <div class="spinner"></div>
      <p>Loading menu…</p>
    </div>`;

  try {
    const data = await API.get('/api/menu');
    state.menuItems = data.items;
    displayItems(state.menuItems, isAdmin);
  } catch (err) {
    container.innerHTML = `<p class="no-results">Failed to load menu. ${err.message}</p>`;
  }
}

function filterItems(searchTerm, isAdmin) {
  const term    = searchTerm.toLowerCase();
  const results = state.menuItems.filter(
    item =>
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
  );
  displayItems(results, isAdmin);
}

function displayItems(items, isAdmin) {
  const container = document.getElementById('menuContainer');
  const noResults = document.getElementById('noResults');

  if (items.length === 0) {
    container.innerHTML = '';
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');
  function editItemCategoryValue(it) {
    const c = it.category;
    return c === 'hot' || c === 'cold' || c === 'special' ? c : 'hot';
  }
  container.innerHTML = items.map(item => `
    <div class="menu-item" data-id="${item.id}">
      <div class="menu-item-header">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="price">$${Number(item.price).toFixed(2)}</span>
      </div>
      <p class="description">${escapeHtml(item.description)}</p>
      <div class="card-footer" style="flex-direction:column;align-items:stretch;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;width:100%;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${item.isNew  ? `<span class="badge">New Item</span>` : ''}
            ${item.category ? `<span class="badge-category">${escapeHtml(item.category)}</span>` : ''}
          </div>
          ${isAdmin
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-secondary edit-item-btn" data-id="${item.id}">Edit</button>
              <button type="button" class="btn-danger delete-btn" data-id="${item.id}">Remove</button>
            </div>`
    : `<button type="button" class="btn-secondary add-to-cart-btn" data-id="${item.id}">Add to cart</button>`}
        </div>
        ${isAdmin
    ? `<div class="add-item-form item-edit-panel hidden" data-item-id="${item.id}">
          <h3 style="font-size:1.15em;margin-bottom:14px;">Update item</h3>
          <form class="item-edit-form" data-id="${item.id}" novalidate>
            <div class="form-group">
              <label for="edit-name-${item.id}">Name *</label>
              <input type="text" id="edit-name-${item.id}" class="edit-name" value="${escapeHtml(item.name)}" required />
            </div>
            <div class="form-group">
              <label for="edit-price-${item.id}">Price ($) *</label>
              <input type="number" id="edit-price-${item.id}" class="edit-price" step="0.01" min="0.01" value="${escapeHtml(String(item.price))}" required />
            </div>
            <div class="form-group">
              <label for="edit-category-${item.id}">Category</label>
              <select id="edit-category-${item.id}" class="edit-category">
                <option value="hot"${editItemCategoryValue(item) === 'hot' ? ' selected' : ''}>Hot</option>
                <option value="cold"${editItemCategoryValue(item) === 'cold' ? ' selected' : ''}>Cold</option>
                <option value="special"${editItemCategoryValue(item) === 'special' ? ' selected' : ''}>Special</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-desc-${item.id}">Description *</label>
              <textarea id="edit-desc-${item.id}" class="edit-desc" required>${escapeHtml(item.description)}</textarea>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="submit" class="btn-primary edit-save-btn" style="width:auto;padding:10px 24px;">Save changes</button>
              <button type="button" class="btn-secondary edit-cancel-btn" style="width:auto;padding:10px 24px;">Cancel</button>
            </div>
          </form>
        </div>`
    : ''}
      </div>
    </div>`
  ).join('');

  // Add to cart (non-admin)
  if (!isAdmin) {
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        btn.disabled = true;
        try {
          await API.post('/api/cart/items', { menuItemId: id, quantity: 1 });
          showToast('Added to cart.', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // Attach delete listeners (admin) — single-click confirm, no native dialogs
  if (isAdmin) {
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        // First click: ask for confirmation inline
        if (!btn.dataset.confirming) {
          btn.dataset.confirming = 'true';
          btn.textContent = 'Confirm Remove';
          btn.style.background = '#c0392b';
          btn.style.color = '#fff';
          // Auto-reset after 3s if no second click
          setTimeout(() => {
            if (btn.dataset.confirming) {
              delete btn.dataset.confirming;
              btn.textContent = 'Remove';
              btn.style.background = '';
              btn.style.color = '';
            }
          }, 3000);
          return;
        }

        // Second click: execute deletion
        delete btn.dataset.confirming;
        const id   = parseInt(btn.dataset.id, 10);
        const item = state.menuItems.find(i => i.id === id);

        btn.disabled    = true;
        btn.textContent = '…';
        try {
          await API.delete(`/api/menu/${id}`);
          state.menuItems = state.menuItems.filter(i => i.id !== id);
          const searchTerm = document.getElementById('searchBox')?.value || '';
          filterItems(searchTerm, isAdmin);
          showToast(`"${item?.name}" removed from menu.`, 'info');
        } catch (err) {
          showToast(err.message, 'error');
          btn.disabled    = false;
          btn.textContent = 'Remove';
        }
      });
    });

    container.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.menu-item');
        const panel = card.querySelector('.item-edit-panel');
        const wasHidden = panel.classList.contains('hidden');
        container.querySelectorAll('.item-edit-panel').forEach(p => p.classList.add('hidden'));
        if (wasHidden) panel.classList.remove('hidden');
      });
    });

    container.querySelectorAll('.edit-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.item-edit-panel').classList.add('hidden');
      });
    });

    container.querySelectorAll('.item-edit-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const id = parseInt(form.dataset.id, 10);
        const card = form.closest('.menu-item');
        const name = card.querySelector('.edit-name').value.trim();
        const price = card.querySelector('.edit-price').value;
        const category = card.querySelector('.edit-category').value;
        const description = card.querySelector('.edit-desc').value.trim();

        if (name.length < 2) {
          showToast('Name must be at least 2 characters.', 'error');
          return;
        }
        if (!description) {
          showToast('Description is required.', 'error');
          return;
        }
        if (!price || parseFloat(price) <= 0) {
          showToast('Price must be greater than $0.', 'error');
          return;
        }

        const saveBtn = form.querySelector('.edit-save-btn');
        saveBtn.disabled    = true;
        saveBtn.textContent = 'Saving…';

        try {
          const data = await API.patch(`/api/menu/${id}`, {
            name,
            price,
            description,
            category,
          });
          const idx = state.menuItems.findIndex(i => i.id === id);
          if (idx !== -1) state.menuItems[idx] = data.item;
          const searchTerm = document.getElementById('searchBox')?.value || '';
          filterItems(searchTerm, isAdmin);
          showToast(data.message || 'Item updated.', 'success');
          form.closest('.item-edit-panel').classList.add('hidden');
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          saveBtn.disabled    = false;
          saveBtn.textContent = 'Save changes';
        }
      });
    });
  }
}

// ── Form Helpers ───────────────────────────────────────────────────────────────
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
