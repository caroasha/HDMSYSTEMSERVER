const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  businessName: { type: String, default: 'HDM Cyber Services' },
  address: { type: String, default: 'Nairobi, Kenya' },
  phone: { type: String, default: '+254 700 123 456' },
  email: { type: String, default: 'cyber@hdm.com' },
  stampImage: { type: String, default: '' },
  services: [{
    name: String,
    price: Number,
    description: String
  }],
  taxRate: { type: Number, default: 0 },
  receiptFooterText: { type: String, default: 'Thank you for your patronage' },
  updatedAt: { type: Date, default: Date.now }
});

// Export the SCHEMA, not the model
module.exports = settingsSchema;