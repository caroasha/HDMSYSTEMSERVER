const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  regNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  enrollmentDate: { type: Date, required: true },
  completionDate: { type: Date, required: true },
  computerAssigned: { type: String, default: null },
  feesPaid: { type: Number, default: 0 },
  course: { type: String, required: true }, // e.g., "Web Development"
  createdAt: { type: Date, default: Date.now }
});

module.exports = studentSchema;