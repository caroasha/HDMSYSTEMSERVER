const { connectSchool } = require('../../config/db');

let schoolConnection;
let Student;
let Inventory;
let Fee;
let Settings;
let Transaction;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Student) Student = schoolConnection.model('Student', require('../../models/school/Student'));
  if (!Inventory) Inventory = schoolConnection.model('Inventory', require('../../models/school/Inventory'));
  if (!Fee) Fee = schoolConnection.model('Fee', require('../../models/school/Fee'));
  if (!Settings) Settings = schoolConnection.model('Settings', require('../../models/school/Settings'));
  if (!Transaction) Transaction = schoolConnection.model('Transaction', require('../../models/school/Transaction'));
  return { Student, Inventory, Fee, Settings, Transaction };
};

// Generate next registration number
const getNextRegNumber = async (StudentModel) => {
  const lastStudent = await StudentModel.findOne().sort({ createdAt: -1 });
  if (!lastStudent) return 'CS26/001';
  const lastReg = lastStudent.regNumber;
  const match = lastReg.match(/CS26\/(\d+)/);
  if (!match) return 'CS26/001';
  const nextNum = parseInt(match[1]) + 1;
  return `CS26/${nextNum.toString().padStart(3, '0')}`;
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const { Student } = await getModels();
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const { Student } = await getModels();
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student by registration number
exports.getStudentByReg = async (req, res) => {
  try {
    const { Student } = await getModels();
    const student = await Student.findOne({ regNumber: req.params.regNumber });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new student
exports.createStudent = async (req, res) => {
  try {
    const { Student, Inventory, Fee, Settings, Transaction } = await getModels();
    const { computerAssigned, feesPaid, course, ...studentData } = req.body;

    // Generate reg number if not provided
    if (!studentData.regNumber) {
      studentData.regNumber = await getNextRegNumber(Student);
    }

    // Get course total fee from settings
    const settings = await Settings.findOne();
    let totalCourseFee = 0;
    if (settings && settings.courses) {
      const courseData = settings.courses.find(c => c.name === course);
      totalCourseFee = courseData?.totalFee || 0;
    }

    // Create student
    const student = new Student({
      ...studentData,
      course,
      feesPaid: feesPaid || 0
    });
    await student.save();

    // If computer assigned, update inventory status
    if (computerAssigned) {
      const computer = await Inventory.findOne({ name: computerAssigned, type: 'Computer' });
      if (computer) {
        computer.status = 'Assigned';
        computer.assignedTo = student._id;
        computer.assignedModel = 'Student';
        await computer.save();
      }
    }

    // Record initial fee payment if any
    if (feesPaid && feesPaid > 0) {
      const balanceAfter = totalCourseFee - feesPaid;
      
      // Record in fee collection
      const fee = new Fee({
        regNumber: student.regNumber,
        studentName: student.name,
        amount: feesPaid,
        balanceAfter: balanceAfter,
        date: new Date(),
        notes: 'Initial enrollment payment'
      });
      await fee.save();
      
      // ALSO record in accounts/transactions
      const transaction = new Transaction({
        type: 'in',
        amount: feesPaid,
        description: `Initial fees payment - ${student.name} (${student.regNumber}) - ${course}`,
        reference: student.regNumber,
        date: new Date()
      });
      await transaction.save();
    }

    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { Student, Inventory, Settings } = await getModels();
    const { computerAssigned, course, feesPaid, ...updateData } = req.body;
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

    // Handle computer change
    if (computerAssigned !== oldStudent.computerAssigned) {
      // Free old computer
      if (oldStudent.computerAssigned) {
        const oldComputer = await Inventory.findOne({ name: oldStudent.computerAssigned });
        if (oldComputer) {
          oldComputer.status = 'Available';
          oldComputer.assignedTo = null;
          oldComputer.assignedModel = null;
          await oldComputer.save();
        }
      }
      // Assign new computer
      if (computerAssigned) {
        const newComputer = await Inventory.findOne({ name: computerAssigned });
        if (newComputer) {
          newComputer.status = 'Assigned';
          newComputer.assignedTo = req.params.id;
          newComputer.assignedModel = 'Student';
          await newComputer.save();
        }
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      { ...updateData, computerAssigned, course, feesPaid }, 
      { new: true }
    );
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { Student, Inventory, Fee, Transaction } = await getModels();
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Free computer
    if (student.computerAssigned) {
      const computer = await Inventory.findOne({ name: student.computerAssigned });
      if (computer) {
        computer.status = 'Available';
        computer.assignedTo = null;
        computer.assignedModel = null;
        await computer.save();
      }
    }

    // Delete associated fee records
    await Fee.deleteMany({ regNumber: student.regNumber });
    
    // Delete associated transaction records
    await Transaction.deleteMany({ reference: student.regNumber });
    
    await student.deleteOne();
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get students by course
exports.getStudentsByCourse = async (req, res) => {
  try {
    const { Student } = await getModels();
    const students = await Student.find({ course: req.params.course }).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student statistics
exports.getStudentStats = async (req, res) => {
  try {
    const { Student } = await getModels();
    const total = await Student.countDocuments();
    const byGender = await Student.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);
    const byCourse = await Student.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } }
    ]);
    res.json({ total, byGender, byCourse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};