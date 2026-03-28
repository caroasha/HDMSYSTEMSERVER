const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['in', 'out'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  reference: { 
    type: String, 
    default: '' 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1 });

module.exports = transactionSchema;