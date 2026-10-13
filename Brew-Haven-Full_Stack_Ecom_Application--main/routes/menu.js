'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── In-Memory Menu Store ──────────────────────────────────────────────────────
let menuItems = [];
let nextId = 1;

function loadMenuData() {
  try {
    const dataPath = path.join(__dirname, '../data/menu.json');
    const raw = fs.readFileSync(dataPath, 'utf-8');
    menuItems = JSON.parse(raw);
    nextId = menuItems.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    console.log(`  Menu loaded: ${menuItems.length} items from data/menu.json`);
  } catch (err) {
    console.error('Failed to load menu.json:', err.message);
    menuItems = [];
  }
}

loadMenuData();

// ── GET /api/menu ──────────────────────────────────────────────────────────────
// Public — anyone can view the menu
router.get('/', (req, res) => {
  const { search, category } = req.query;
  let results = [...menuItems];

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      item =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }

  if (category && category !== 'all') {
    results = results.filter(item => item.category === category);
  }

  res.status(200).json({ count: results.length, items: results });
});

// ── GET /api/menu/:id ──────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const item = menuItems.find(i => i.id === parseInt(req.params.id, 10));
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });
  res.status(200).json({ item });
});

// ── POST /api/menu ─────────────────────────────────────────────────────────────
// Protected — admin only
router.post('/', protect, requireAdmin, (req, res) => {
  const { name, price, description, category } = req.body;

  if (!name || price === undefined || !description) {
    return res.status(400).json({ error: 'Name, price, and description are required.' });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number.' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }

  const newItem = {
    id: nextId++,
    name: name.trim(),
    price: Math.round(parsedPrice * 100) / 100,
    description: description.trim(),
    category: category || 'hot',
    isNew: true,
    addedBy: req.user.name,
    createdAt: new Date().toISOString(),
  };

  menuItems.push(newItem);
  res.status(201).json({ message: 'Menu item added successfully!', item: newItem });
});

// ── DELETE /api/menu/:id ───────────────────────────────────────────────────────
// Protected — admin only
router.delete('/:id', protect, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = menuItems.findIndex(i => i.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Menu item not found.' });
  }

  const deleted = menuItems.splice(index, 1)[0];
  res.status(200).json({ message: `"${deleted.name}" removed from menu.`, item: deleted });
});

// ── PATCH /api/menu/:id ────────────────────────────────────────────────────────
// Protected — admin only (update price or description)
router.patch('/:id', protect, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const item = menuItems.find(i => i.id === id);

  if (!item) return res.status(404).json({ error: 'Menu item not found.' });

  const { name, price, description, category } = req.body;

  if (name !== undefined) {
    const t = String(name).trim();
    if (t.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    item.name = t;
  }
  if (price !== undefined) {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return res.status(400).json({ error: 'Invalid price.' });
    item.price = Math.round(p * 100) / 100;
  }
  if (description !== undefined) {
    const t = String(description).trim();
    if (!t) return res.status(400).json({ error: 'Description cannot be empty.' });
    item.description = t;
  }
  if (category !== undefined) {
    const allowed = ['hot', 'cold', 'special'];
    if (!allowed.includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Use hot, cold, or special.' });
    }
    item.category = category;
  }

  item.updatedAt = new Date().toISOString();

  res.status(200).json({ message: 'Menu item updated.', item });
});

function findMenuItemById(id) {
  const n = parseInt(id, 10);
  if (Number.isNaN(n)) return undefined;
  return menuItems.find(i => i.id === n);
}

router.findMenuItemById = findMenuItemById;

module.exports = router;
