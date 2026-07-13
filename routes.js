const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Entry = require('./entryModel');
const Owner = require('./ownerModel');

// POST /api/verify-pin - Verifies Owner PIN codes
router.post('/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    const match = await Owner.findOne({ pin: String(pin) });
    if (match) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error('PIN verification error:', err);
    res.status(500).json({ error: 'Database verification failed' });
  }
});

// POST /api/change-pin - Changes/Updates the Owner PIN code
router.post('/change-pin', async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    if (!oldPin || !newPin) {
      return res.status(400).json({ error: 'Old and new PINs are required' });
    }

    // Check if the old PIN matches an existing owner record
    let owner = await Owner.findOne({ pin: String(oldPin) });
    if (!owner) {
      // If DB is completely empty and old PIN is the fallback '6353', create/initialize the first pin
      const count = await Owner.countDocuments();
      if (count === 0 && String(oldPin) === '6353') {
        owner = new Owner({ pin: String(newPin) });
        await owner.save();
        return res.json({ success: true, message: 'PIN initialized successfully' });
      }
      return res.status(400).json({ error: 'Invalid old PIN' });
    }

    // Save/Update with the new PIN
    owner.pin = String(newPin);
    await owner.save();
    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    console.error('Change PIN error:', err);
    res.status(500).json({ error: 'Failed to change PIN: ' + err.message });
  }
});

// GET /api/owners - Super Admin: List all owners
router.get('/owners', async (req, res) => {
  try {
    const { superpin } = req.headers;
    if (superpin !== '286353') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const owners = await Owner.find().sort({ createdAt: -1 });
    res.json(owners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/owners - Super Admin: Create a new owner (PIN must be exactly 4 digits)
router.post('/owners', async (req, res) => {
  try {
    const { superpin } = req.headers;
    if (superpin !== '286353') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }
    const existing = await Owner.findOne({ pin: String(pin) });
    if (existing) {
      return res.status(409).json({ error: 'An owner with this PIN already exists' });
    }
    const owner = new Owner({ pin: String(pin) });
    await owner.save();
    res.status(201).json(owner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/owners/:id - Super Admin: Edit an owner's PIN (must be exactly 4 digits)
router.put('/owners/:id', async (req, res) => {
  try {
    const { superpin } = req.headers;
    if (superpin !== '286353') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }
    // Check duplicate
    const conflict = await Owner.findOne({ pin: String(pin), _id: { $ne: req.params.id } });
    if (conflict) {
      return res.status(409).json({ error: 'An owner with this PIN already exists' });
    }
    const updated = await Owner.findByIdAndUpdate(
      req.params.id,
      { pin: String(pin) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Owner not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/owners/:id - Super Admin: Remove an owner
router.delete('/owners/:id', async (req, res) => {
  try {
    const { superpin } = req.headers;
    if (superpin !== '286353') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const deleted = await Owner.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Owner not found' });
    res.json({ message: 'Owner removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// GET /api/entries - Get all entries for a specific owner
router.get('/entries', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'Owner query param is required' });
    }
    const entries = await Entry.find({ owner: String(owner) }).sort({ date: -1, brand: 1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/entries - Create or update an entry for a specific owner
router.post('/entries', async (req, res) => {
  try {
    const { date, brand, size, ob, recp, total, sale, cb, rate, amount, owner } = req.body;
    if (!owner) {
      return res.status(400).json({ error: 'Owner property is required' });
    }
    
    // Check if an entry with the same brand, size, date, and owner already exists
    const existing = await Entry.findOne({ brand, size, date, owner: String(owner) });
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
      amount,
      owner: String(owner)
    });
    const saved = await newEntry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/entries/:id - Update an entry for a specific owner
router.put('/entries/:id', async (req, res) => {
  try {
    const { date, brand, size, ob, recp, total, sale, cb, rate, amount, owner } = req.body;
    if (!owner) {
      return res.status(400).json({ error: 'Owner property is required' });
    }
    const updated = await Entry.findByIdAndUpdate(
      req.params.id,
      { date, brand, size, ob, recp, total, sale, cb, rate, amount, owner: String(owner) },
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

// DELETE /api/entries - Clear all entries for a specific owner (Reset functionality)
router.delete('/entries', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'Owner query param is required' });
    }
    await Entry.deleteMany({ owner: String(owner) });
    res.json({ message: 'All entries for this owner cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


