const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Available', 'Assigned', 'Under Maintenance', 'Retired'], 
    default: 'Available' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'assignedModel', default: null },
  assignedModel: { 
    type: String, 
    enum: ['Student', 'Employee', null], 
    default: null 
  },
  purchaseDate: { type: Date },
  serialNumber: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = inventorySchema;