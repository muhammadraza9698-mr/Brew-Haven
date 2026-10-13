'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const menuRouter = require('./menu');
const { protect, requireAdmin } = require('../middleware/auth');

function parseDelivery(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Delivery address is required.' };
  }
  const street = typeof body.deliveryStreet === 'string' ? body.deliveryStreet.trim() : '';
  const city = typeof body.deliveryCity === 'string' ? body.deliveryCity.trim() : '';
  const state = typeof body.deliveryState === 'string' ? body.deliveryState.trim().slice(0, 50) : '';
  const postalCode = typeof body.deliveryPostalCode === 'string'
    ? body.deliveryPostalCode.trim().slice(0, 20)
    : '';

  if (street.length < 5 || street.length > 200) {
    return { error: 'Street address must be between 5 and 200 characters.' };
  }
  if (city.length < 2 || city.length > 100) {
    return { error: 'City must be between 2 and 100 characters.' };
  }

  return {
    delivery: {
      street,
      city,
      state: state || undefined,
      postalCode: postalCode || undefined,
    },
  };
}

const router = express.Router();
const ordersPath = path.join(__dirname, '../data/orders.json');
const cartsPath = path.join(__dirname, '../data/carts.json');

/** @type {Array<object>} */
let orders = [];

function loadOrders() {
  try {
    const raw = fs.readFileSync(ordersPath, 'utf-8');
    orders = JSON.parse(raw);
    if (!Array.isArray(orders)) orders = [];
  } catch {
    orders = [];
  }
}

function saveOrders() {
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 4), 'utf-8');
}

function loadCartsRaw() {
  try {
    const raw = fs.readFileSync(cartsPath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveCartsRaw(carts) {
  fs.writeFileSync(cartsPath, JSON.stringify(carts, null, 4), 'utf-8');
}

function nextOrderId() {
  if (orders.length === 0) return 1;
  return orders.reduce((max, o) => Math.max(max, o.id || 0), 0) + 1;
}

loadOrders();

router.use(protect);

router.get('/all', requireAdmin, (req, res) => {
  loadOrders();
  const sorted = [...orders].sort((a, b) => (b.id || 0) - (a.id || 0));
  res.status(200).json({ count: sorted.length, orders: sorted });
});

router.get('/', (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Use the admin orders view to list all orders.' });
  }
  loadOrders();
  const mine = orders.filter(o => o.userId === req.user.id);
  res.status(200).json({ count: mine.length, orders: mine });
});

router.post('/', (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Administrator accounts cannot place orders.' });
  }

  const parsed = parseDelivery(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const { delivery } = parsed;

  const carts = loadCartsRaw();
  const row = carts.find(c => c.userId === req.user.id);

  if (!row || !row.items || row.items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  let notes = '';
  if (req.body && typeof req.body.orderNotes === 'string') {
    notes = req.body.orderNotes.trim().slice(0, 500);
  }

  const orderItems = [];
  let subtotal = 0;

  for (const line of row.items) {
    const menuItem = menuRouter.findMenuItemById(line.menuItemId);
    if (!menuItem) {
      return res.status(400).json({
        error: `A menu item in your cart is no longer available (ID ${line.menuItemId}). Please update your cart.`,
      });
    }
    const qty = parseInt(line.quantity, 10);
    if (Number.isNaN(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Invalid quantity in cart.' });
    }
    const lineTotal = Math.round(menuItem.price * qty * 100) / 100;
    subtotal += lineTotal;
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      quantity: qty,
      lineTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  const order = {
    id: nextOrderId(),
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email || '',
    items: orderItems,
    subtotal,
    delivery,
    orderNotes: notes || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  saveOrders();

  row.items = [];
  saveCartsRaw(carts);

  res.status(201).json({
    message: 'Order placed successfully.',
    order,
  });
});

module.exports = router;
