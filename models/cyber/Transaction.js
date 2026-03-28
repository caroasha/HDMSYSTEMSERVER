const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, default: null }, // e.g., service ID or expense ID
  date: { type: Date, default: Date.now }
});

module.exports = transactionSchema;