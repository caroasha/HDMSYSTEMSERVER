const { connectSchool } = require('../../config/db');

let schoolConnection;
let Fee;
let Student;
let Settings;
let Transaction;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Fee) Fee = schoolConnection.model('Fee', require('../../models/school/Fee'));
  if (!Student) Student = schoolConnection.model('Student', require('../../models/school/Student'));
  if (!Settings) Settings = schoolConnection.model('Settings', require('../../models/school/Settings'));
  if (!Transaction) Transaction = schoolConnection.model('Transaction', require('../../models/school/Transaction'));
  return { Fee, Student, Settings, Transaction };
};

// Get all fees (recent)
exports.getAllFees = async (req, res) => {
  try {
    const { Fee } = await getModels();
    const fees = await Fee.find().sort({ date: -1 }).limit(100);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get fees by student registration number
exports.getFeesByStudent = async (req, res) => {
  try {
    const { Fee } = await getModels();
    const fees = await Fee.find({ regNumber: req.params.regNumber }).sort({ date: -1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const { Fee, Student, Settings, Transaction } = await getModels();
    const { regNumber, amount } = req.body;

    const student = await Student.findOne({ regNumber });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Get total course fee from settings
    const settings = await Settings.findOne();
    let totalCourseFee = 0;
    if (settings && settings.courses && student.course) {
      const courseData = settings.courses.find(c => c.name === student.course);
      totalCourseFee = courseData?.totalFee || 0;
    }

    const newPaid = (student.feesPaid || 0) + amount;
    const balanceAfter = totalCourseFee - newPaid;

    // Record fee payment
    const fee = new Fee({
      regNumber,
      studentName: student.name,
      amount,
      balanceAfter,
      date: new Date(),
      notes: 'Payment received'
    });
    await fee.save();

    // Also record in accounts/transactions
    const transaction = new Transaction({
      type: 'in',
      amount: amount,
      description: `Fees payment - ${student.name} (${student.regNumber})`,
      reference: fee._id.toString(),
      date: new Date()
    });
    await transaction.save();

    student.feesPaid = newPaid;
    await student.save();

    res.status(201).json(fee);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get student fee summary
exports.getFeeSummary = async (req, res) => {
  try {
    const { Student, Fee, Settings } = await getModels();
    const { regNumber } = req.params;

    const student = await Student.findOne({ regNumber });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const settings = await Settings.findOne();
    let totalCourseFee = 0;
    if (settings && settings.courses && student.course) {
      const courseData = settings.courses.find(c => c.name === student.course);
      totalCourseFee = courseData?.totalFee || 0;
    }

    const payments = await Fee.find({ regNumber }).sort({ date: -1 });
    const totalPaid = student.feesPaid || 0;

    res.json({
      regNumber: student.regNumber,
      studentName: student.name,
      course: student.course,
      totalCourseFee,
      totalPaid,
      balance: totalCourseFee - totalPaid,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};