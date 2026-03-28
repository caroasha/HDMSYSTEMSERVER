const mongoose = require('mongoose');

const portalUserSchema = new mongoose.Schema({
  regNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student', 'staff'], 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'role'
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  lastLogin: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
portalUserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = portalUserSchema;