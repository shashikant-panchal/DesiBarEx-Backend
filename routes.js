const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Entry = require('./entryModel');

// GET /api/catalog - Returns the initial brand list from Brand list.json
router.get('/catalog', (req, res) => {
  const filePath = path.join(__dirname, 'Brand list.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading Brand list.json:', err);
      // Fallback in case the file is missing or unreadable
      return res.json({
        ledger: {
          beer_sale: ["K.F. Can","K.F. Strong","Knock Out","Budwiser L Can","Tuborg","Old Monk","Power Cool","Carlsburg","Bacardi Orange","Breezer Orange","Cola","Soda","Red Bull","Water","Green Monk"],
          liquor_sale: ["Bag Piper","Blender P","D.S.P. Black","Imperial Blue","Iconiq","Mc No.1 Whisky","Mc Luxury","Officer C","Old Tavern","Original C","Royal Stag","Royal Challag","D.K. Whisky","R. Stag Barrel","Teacher H.L.","100 Piper","8PM","Black & White","O.C. Star","Paul Johan","Haywards","M.H. Brandy","OMR Gold R","Mc Rum","B.P. Rum","Old Monk"]
        }
      });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to parse Brand list.json' });
    }
  });
});

// GET /api/entries - Get all entries
router.get('/entries', async (req, res) => {
  try {
    const entries = await Entry.find().sort({ date: -1, brand: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/entries - Create a new entry
router.post('/entries', async (req, res) => {
  try {
    const { date, brand, size, ob, recp, total, sale, cb, rate, amount } = req.body;
    
    // Check if an entry with the same brand, size, and date already exists
    const existing = await Entry.findOne({ brand, size, date });
    if (existing) {
      existing.ob = ob;
      existing.recp = recp;
      existing.total = total;
      existing.sale = sale;
      existing.cb = cb;
      existing.rate = rate;
      existing.amount = amount;
      const updated = await existing.save();
      return res.json(updated);
    }

    const newEntry = new Entry({
      date,
      brand,
      size,
      ob,
      recp,
      total,
      sale,
      cb,
      rate,
      amount
    });
    const saved = await newEntry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/entries/:id - Update an entry
router.put('/entries/:id', async (req, res) => {
  try {
    const { date, brand, size, ob, recp, total, sale, cb, rate, amount } = req.body;
    const updated = await Entry.findByIdAndUpdate(
      req.params.id,
      { date, brand, size, ob, recp, total, sale, cb, rate, amount },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Entry not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/entries/:id - Delete a specific entry
router.delete('/entries/:id', async (req, res) => {
  try {
    const deleted = await Entry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/entries - Clear all entries (Reset functionality)
router.delete('/entries', async (req, res) => {
  try {
    await Entry.deleteMany({});
    res.json({ message: 'All entries cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
