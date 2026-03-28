const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'HDM Computer School' },
  motto: { type: String, default: 'Technology for Tomorrow' },
  address: { type: String, default: 'Nairobi, Kenya · CBD' },
  phone: { type: String, default: '+254 700 123 456' },
  email: { type: String, default: 'info@hdmcomputerschool.ac.ke' },
  stampImage: { type: String, default: '' },
  courses: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    durationMonths: { type: Number, default: 3 },
    totalFee: { type: Number, default: 0 }
  }],
  computers: {
    mode: { type: String, enum: ['range', 'manual'], default: 'range' },
    range: {
      start: { type: Number, default: 1 },
      end: { type: Number, default: 20 },
      prefix: { type: String, default: 'PC ' },
      defaultValue: { type: Number, default: 0 }
    },
    manualList: [{
      name: String,
      value: { type: Number, default: 0 }
    }],
    defaultValue: { type: Number, default: 0 }
  },
  syncComputersToInventory: { type: Boolean, default: true },
  landing: {
    heroImage: { type: String, default: '' },
    aboutText: { type: String, default: '' },
    galleryImages: [String],
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String
    }
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = settingsSchema;