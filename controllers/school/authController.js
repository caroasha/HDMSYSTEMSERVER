const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectSchool } = require('../../config/db');

let schoolConnection;
let User;

const getModels = async () => {
  if (!schoolConnection) schoolConnection = await connectSchool();
  if (!User) User = schoolConnection.model('User', require('../../models/school/User'));
  return { User };
};

// Login - for admin/staff users
exports.login = async (req, res) => {
  try {
    const { User } = await getModels();
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with system identifier
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        system: 'school'  // Identifies as admin/staff token
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
        role: user.role 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { User } = await getModels();
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new passwords are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Register new user (admin only)
exports.register = async (req, res) => {
  try {
    const { User } = await getModels();
    const { fullName, username, password, role } = req.body;

    // Validate input
    if (!fullName || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: username });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    
    // Create user with specified role (default to 'staff')
    const user = new User({
      name: fullName,
      email: username,
      password: hashed,
      role: role || 'staff'
    });
    await user.save();

    res.status(201).json({ 
      success: true,
      message: 'User created successfully', 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { User } = await getModels();
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const { User } = await getModels();
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { User } = await getModels();
    const { role } = req.body;
    
    // Validate role
    if (!role || !['admin', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "staff"' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { role, updatedAt: new Date() }, 
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `User role updated to ${role}`,
      user 
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { User } = await getModels();
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting the last admin
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (user.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin user' });
    }
    
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
};