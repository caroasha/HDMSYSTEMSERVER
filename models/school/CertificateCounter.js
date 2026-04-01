const mongoose = require('mongoose');

const certificateCounterSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  lastNumber: { type: Number, default: 0 }
});

module.exports = certificateCounterSchema;