const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  status: { type: String, enum: ['Available', 'Under Maintenance', 'Retired'], default: 'Available' },
  purchaseDate: { type: Date },
  serialNumber: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = inventorySchema;