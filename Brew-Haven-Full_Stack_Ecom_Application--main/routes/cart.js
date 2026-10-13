'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const menuRouter = require('./menu');
const { protect } = require('../middleware/auth');

function rejectAdminCart(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return res.status(403).json({ error: 'The cart is not available for administrator accounts.' });
  }
  next();
}

const router = express.Router();
const dataPath = path.join(__dirname, '../data/carts.json');

/** @type {Array<{ userId: number, items: Array<{ menuItemId: number, quantity: number }> }>} */
let carts = [];

function loadCarts() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    carts = JSON.parse(raw);
    if (!Array.isArray(carts)) carts = [];
  } catch {
    carts = [];
  }
}

function saveCarts() {
  fs.writeFileSync(dataPath, JSON.stringify(carts, null, 4), 'utf-8');
}

function cartForUser(userId) {
  let row = carts.find(c => c.userId === userId);
  if (!row) {
    row = { userId, items: [] };
    carts.push(row);
    saveCarts();
  }
  return row;
}

function enrichItems(items) {
  let subtotal = 0;
  const lines = [];

  for (const line of items) {
    const menuItem = menuRouter.findMenuItemById(line.menuItemId);
    if (!menuItem) {
      lines.push({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        unavailable: true,
        lineTotal : 0,
      });
      continue;
    }
    const qty = Math.max(0, parseInt(line.quantity, 10) || 0);
    const lineTotal = Math.round(menuItem.price * qty * 100) / 100;
    subtotal += lineTotal;
    lines.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      quantity: qty,
      lineTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  return { items: lines , subtotal };
}

loadCarts();

router.use(protect);
router.use(rejectAdminCart);
router.use((req, res, next) => {
  loadCarts();
  next();
});

router.get('/', (req, res) => {
  const row = cartForUser(req.user.id);
  const filtered = row.items.filter(i => menuRouter.findMenuItemById(i.menuItemId));
  if (filtered.length !== row.items.length) {
    row.items = filtered;
    saveCarts();
  }
  const { items, subtotal } = enrichItems(row.items);
  res.status(200).json({ items, subtotal });
});

router.post('/items', (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  const mid = parseInt(menuItemId, 10);
  if (Number.isNaN(mid)) {
    return res.status(400).json({ error: 'Invalid menu item.' });
  }
  const menuItem = menuRouter.findMenuItemById(mid);
  if (!menuItem) {
    return res.status(404).json({ error: 'Menu item not found.' });
  }
  const qty = parseInt(quantity, 10);
  if (Number.isNaN(qty) || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 99.' });
  }

  const row = cartForUser(req.user.id);
  const existing = row.items.find(i => i.menuItemId === mid);
  if (existing) {
    const next = Math.min(99, existing.quantity + qty);
    existing.quantity = next;
  } else {
    row.items.push({ menuItemId: mid, quantity: qty });
  }
  saveCarts();

  const { items, subtotal } = enrichItems(row.items);
  res.status(200).json({ message: 'Cart updated.', items, subtotal });
});

router.patch('/items/:menuItemId', (req, res) => {
  const mid = parseInt(req.params.menuItemId, 10);
  if (Number.isNaN(mid)) {
    return res.status(400).json({ error: 'Invalid menu item.' });
  }
  const { quantity } = req.body;
  const qty = parseInt(quantity, 10);
  if (Number.isNaN(qty) || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 99.' });
  }
  if (!menuRouter.findMenuItemById(mid)) {
    return res.status(404).json({ error: 'Menu item not found.' });
  }

  const row = cartForUser(req.user.id);
  const line = row.items.find(i => i.menuItemId === mid);
  if (!line) {
    return res.status(404).json({ error: 'Item is not in your cart.' });
  }
  line.quantity = qty;
  saveCarts();

  const { items, subtotal } = enrichItems(row.items);
  res.status(200).json({ message: 'Cart updated.', items, subtotal });
});

router.delete('/items/:menuItemId', (req, res) => {
  const mid = parseInt(req.params.menuItemId, 10);
  if (Number.isNaN(mid)) {
    return res.status(400).json({ error: 'Invalid menu item.' });
  }

  const row = cartForUser(req.user.id);
  const before = row.items.length;
  row.items = row.items.filter(i => i.menuItemId !== mid);
  if (row.items.length === before) {
    return res.status(404).json({ error: 'Item is not in your cart.' });
  }
  saveCarts();

  const { items, subtotal } = enrichItems(row.items);
  res.status(200).json({ message: 'Item removed.', items, subtotal });
});

router.delete('/', (req, res) => {
  const row = cartForUser(req.user.id);
  row.items = [];
  saveCarts();
  res.status(200).json({ message: 'Cart cleared.', items: [], subtotal: 0 });
});

module.exports = router;
