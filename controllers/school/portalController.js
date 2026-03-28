const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectSchool } = require('../../config/db');

let schoolConnection;
let PortalUser;
let Student;
let Employee;
let Settings;
let Fee;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!PortalUser) PortalUser = schoolConnection.model('PortalUser', require('../../models/school/PortalUser'));
  if (!Student) Student = schoolConnection.model('Student', require('../../models/school/Student'));
  if (!Employee) Employee = schoolConnection.model('Employee', require('../../models/school/Employee'));
  if (!Settings) Settings = schoolConnection.model('Settings', require('../../models/school/Settings'));
  if (!Fee) Fee = schoolConnection.model('Fee', require('../../models/school/Fee'));
  return { PortalUser, Student, Employee, Settings, Fee };
};

// ==================== PUBLIC FUNCTIONS ====================

// Register portal user
exports.register = async (req, res) => {
  try {
    const { PortalUser, Student, Employee } = await getModels();
    const { regNumber, name, email, password } = req.body;

    if (!regNumber || !name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let userDoc = await Student.findOne({ regNumber });
    let role = 'student';
    
    if (!userDoc) {
      userDoc = await Employee.findOne({ empId: regNumber });
      role = 'staff';
    }
    
    if (!userDoc) {
      return res.status(400).json({ 
        message: 'Registration number not found. Please contact admin.' 
      });
    }

    const existingUser = await PortalUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingReg = await PortalUser.findOne({ regNumber });
    if (existingReg) {
      return res.status(400).json({ message: 'Registration number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const portalUser = new PortalUser({
      regNumber,
      name,
      email,
      password: hashedPassword,
      role,
      userId: userDoc._id
    });
    
    await portalUser.save();

    res.status(201).json({ 
      success: true,
      message: 'Registration successful! Please login.',
      user: {
        id: portalUser._id,
        name: portalUser.name,
        email: portalUser.email,
        role: portalUser.role,
        regNumber: portalUser.regNumber
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Login portal user
exports.login = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await PortalUser.findOne({ email, active: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        id: user._id, 
        regNumber: user.regNumber, 
        role: user.role, 
        system: 'school_portal' 
      },
      process.env.SCHOOL_JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        regNumber: user.regNumber 
      } 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const { PortalUser, Student, Employee, Settings, Fee } = await getModels();
    
    const portalUser = await PortalUser.findById(req.user.id);
    if (!portalUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let userData;
    let courseFee = 0;
    let payments = [];
    let feeSummary = {
      totalFee: 0,
      totalPaid: 0,
      balance: 0,
      payments: []
    };
    
    if (portalUser.role === 'student') {
      userData = await Student.findById(portalUser.userId);
      if (!userData) {
        return res.status(404).json({ message: 'Student record not found' });
      }
      
      const settings = await Settings.findOne();
      if (settings && settings.courses && userData.course) {
        const course = settings.courses.find(c => c.name === userData.course);
        courseFee = course?.totalFee || 0;
      }
      
      payments = await Fee.find({ regNumber: userData.regNumber }).sort({ date: -1 });
      
      const totalPaid = userData.feesPaid || 0;
      feeSummary = {
        totalFee: courseFee,
        totalPaid: totalPaid,
        balance: courseFee - totalPaid,
        payments: payments.map(p => ({
          id: p._id,
          amount: p.amount,
          date: p.date,
          balanceAfter: p.balanceAfter,
          notes: p.notes
        }))
      };
      
      userData = userData.toObject();
      userData.totalFee = courseFee;
      userData.feeSummary = feeSummary;
      
    } else {
      userData = await Employee.findById(portalUser.userId);
      if (!userData) {
        return res.status(404).json({ message: 'Employee record not found' });
      }
    }

    const settings = await Settings.findOne();
    
    res.json({ 
      portalUser: {
        id: portalUser._id,
        name: portalUser.name,
        email: portalUser.email,
        role: portalUser.role,
        regNumber: portalUser.regNumber
      },
      userData,
      feeSummary: portalUser.role === 'student' ? feeSummary : null,
      settings: settings ? {
        schoolName: settings.schoolName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        courses: settings.courses
      } : null
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const { name, email } = req.body;
    const userId = req.user.id;

    const user = await PortalUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existing = await PortalUser.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    user.updatedAt = new Date();
    await user.save();

    res.json({ 
      success: true,
      message: 'Profile updated',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        regNumber: user.regNumber
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const user = await PortalUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Deactivate account
exports.deactivateAccount = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const userId = req.user.id;

    const user = await PortalUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.active = false;
    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Account deactivated' });
    
  } catch (error) {
    console.error('Deactivate error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== ADMIN FUNCTIONS ====================

// Get all portal users
exports.getAllPortalUsers = async (req, res) => {
  try {
    const { PortalUser, Student, Employee } = await getModels();
    const users = await PortalUser.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      let extraData = {};
      if (user.role === 'student') {
        const student = await Student.findById(user.userId);
        if (student) {
          extraData = {
            course: student.course,
            enrollmentDate: student.enrollmentDate,
            completionDate: student.completionDate,
            phone: student.phone,
            feesPaid: student.feesPaid
          };
        }
      } else if (user.role === 'staff') {
        const employee = await Employee.findById(user.userId);
        if (employee) {
          extraData = {
            duty: employee.duty,
            empId: employee.empId,
            phone: employee.phone,
            salary: employee.salary
          };
        }
      }
      return { ...user.toObject(), ...extraData };
    }));
    
    res.json(enrichedUsers);
  } catch (error) {
    console.error('Get all portal users error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get portal user by ID
exports.getPortalUserById = async (req, res) => {
  try {
    const { PortalUser, Student, Employee } = await getModels();
    const user = await PortalUser.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    let extraData = {};
    if (user.role === 'student') {
      const student = await Student.findById(user.userId);
      if (student) {
        extraData = {
          course: student.course,
          enrollmentDate: student.enrollmentDate,
          completionDate: student.completionDate,
          phone: student.phone,
          feesPaid: student.feesPaid,
          computerAssigned: student.computerAssigned
        };
      }
    } else if (user.role === 'staff') {
      const employee = await Employee.findById(user.userId);
      if (employee) {
        extraData = {
          duty: employee.duty,
          empId: employee.empId,
          phone: employee.phone,
          salary: employee.salary
        };
      }
    }
    
    res.json({ ...user.toObject(), ...extraData });
  } catch (error) {
    console.error('Get portal user by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update portal user
exports.updatePortalUser = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const { name, email, role, active } = req.body;
    const user = await PortalUser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        regNumber: user.regNumber,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Update portal user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete portal user
exports.deletePortalUser = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const user = await PortalUser.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete portal user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle user active status
exports.togglePortalUserStatus = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const user = await PortalUser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.active = !user.active;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      message: `User ${user.active ? 'activated' : 'deactivated'}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        active: user.active
      }
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Reset user password
exports.resetPortalUserPassword = async (req, res) => {
  try {
    const { PortalUser } = await getModels();
    const { newPassword } = req.body;
    const user = await PortalUser.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const tempPassword = newPassword || 'password123';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message });
  }
};