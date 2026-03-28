const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  regNumber: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String, default: '' }
});

module.exports = feeSchema;