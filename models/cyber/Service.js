const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceType: { type: String, required: true },
  amount: { type: Number, required: true },
  dateTime: { type: Date, default: Date.now },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = serviceSchema;