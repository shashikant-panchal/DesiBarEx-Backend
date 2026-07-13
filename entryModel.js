const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  brand: { type: String, required: true },
  size: { type: Number, required: true }, // Size in ml
  ob: { type: Number, default: 0 }, // Opening balance
  recp: { type: Number, default: 0 }, // Received
  total: { type: Number, default: 0 }, // Total (ob + recp)
  sale: { type: Number, default: 0 }, // Bottles sold
  cb: { type: Number, default: 0 }, // Closing balance (total - sale)
  rate: { type: Number, default: 0 }, // Rate per bottle
  amount: { type: Number, default: 0 } // Amount (sale * rate)
}, {
  timestamps: true
});

module.exports = mongoose.model('Entry', entrySchema);
