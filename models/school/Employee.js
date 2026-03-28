const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  empId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  duty: { type: String, required: true },
  salary: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['bank', 'mpesa'], default: 'bank' },
  paymentOption: { type: String, enum: ['Monthly', 'Weekly', 'Fortnightly'], default: 'Monthly' },
  bankAccount: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  mpesaNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = employeeSchema;