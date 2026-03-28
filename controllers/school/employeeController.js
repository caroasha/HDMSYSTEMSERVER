const { connectSchool } = require('../../config/db');

let schoolConnection;
let Employee;
let Inventory;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!Employee) Employee = schoolConnection.model('Employee', require('../../models/school/Employee'));
  if (!Inventory) Inventory = schoolConnection.model('Inventory', require('../../models/school/Inventory'));
  return { Employee, Inventory };
};

// Generate next employee ID (EM-001, EM-002, ...)
const generateEmpId = async (EmployeeModel) => {
  const lastEmployee = await EmployeeModel.findOne().sort({ createdAt: -1 });
  if (!lastEmployee) return 'EM-001';
  const lastId = lastEmployee.empId;
  const match = lastId.match(/EM-(\d+)/);
  if (!match) return 'EM-001';
  const nextNum = parseInt(match[1]) + 1;
  return `EM-${nextNum.toString().padStart(3, '0')}`;
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const { Employee } = await getModels();
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get employee by empId
exports.getEmployeeByEmpId = async (req, res) => {
  try {
    const { Employee } = await getModels();
    const employee = await Employee.findOne({ empId: req.params.empId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create employee (auto‑generate empId)
exports.createEmployee = async (req, res) => {
  try {
    const { Employee } = await getModels();
    const empId = await generateEmpId(Employee);
    const employee = new Employee({ ...req.body, empId });
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { Employee } = await getModels();
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { Employee } = await getModels();
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Pay salary (record expense) – this would also create a transaction in accounts
exports.paySalary = async (req, res) => {
  try {
    const { Employee, Transaction } = await getModels(); // you'll need Transaction model
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // In a real system, you'd create a transaction record (expense)
    // For now, just return success
    res.json({ message: `Salary of KES ${employee.salary} paid to ${employee.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};