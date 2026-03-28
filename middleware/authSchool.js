const jwt = require('jsonwebtoken');

// Admin/Staff authentication
exports.authSchool = (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SCHOOL_JWT_SECRET);
    
    if (decoded.system === 'school') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        system: 'school'
      };
      req.userType = 'admin';
    } else if (decoded.system === 'school_portal') {
      req.user = {
        id: decoded.id,
        regNumber: decoded.regNumber,
        role: decoded.role,
        system: 'school_portal'
      };
      req.userType = 'portal';
    } else {
      return res.status(403).json({ message: 'Invalid token type' });
    }
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    
    // Clear invalid token on client side by sending 401
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Invalid or expired token. Please login again.',
        clearToken: true
      });
    }
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Portal users only (students/staff)
exports.authPortal = (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SCHOOL_JWT_SECRET);
    if (decoded.system !== 'school_portal') {
      return res.status(403).json({ message: 'Access denied. Portal access only.' });
    }
    req.user = {
      id: decoded.id,
      regNumber: decoded.regNumber,
      role: decoded.role,
      system: 'school_portal'
    };
    next();
  } catch (err) {
    console.error('Portal auth error:', err.message);
    
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Invalid or expired token. Please login again.',
        clearToken: true
      });
    }
    
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};