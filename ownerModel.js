const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Owner', ownerSchema);
