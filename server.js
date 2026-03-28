// DNS Configuration - Force IPv4
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectSchool, connectCyber } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Determine environment - check both NODE_ENV and ENVIRONMENT
const isProduction = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'PRODUCTION';
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || (isProduction ? 'https://hdmserver.pxxl.click' : `http://localhost:${PORT}`);

// CORS configuration – read from environment or use defaults
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Add production domains if in production
if (isProduction) {
  defaultOrigins.push(
    'https://hdmcompschool.pxxl.click',
    'https://hdmcyber.pxxl.click'
  );
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : defaultOrigins;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HDM System Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: isProduction ? 'production' : 'development',
    port: PORT,
    baseUrl: BASE_URL,
    schoolBaseUrl: process.env.SCHOOL_BASE_URL,
    cyberBaseUrl: process.env.CYBER_BASE_URL
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HDM System Running',
    version: '1.0.0',
    environment: isProduction ? 'production' : 'development',
    systems: {
      school: '/api/school',
      cyber: '/api/cyber'
    },
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'HDM API Gateway',
    environment: isProduction ? 'production' : 'development',
    systems: {
      school: {
        base: '/api/school',
        endpoints: [
          '/auth', '/students', '/employees', '/fees',
          '/accounts', '/inventory', '/portal', '/settings', '/applications'
        ]
      },
      cyber: {
        base: '/api/cyber',
        endpoints: ['/auth', '/services', '/transactions', '/inventory', '/reports', '/settings']
      }
    }
  });
});

// Initialize databases and start server
const startServer = async () => {
  try {
    await connectSchool();
    await connectCyber();
    console.log('✅ Connected to both databases (School & Cyber)');

    // Initialize default transactions if needed
    const initSchoolTransactions = async () => {
      const conn = await connectSchool();
      const Transaction = conn.model('Transaction', require('./models/school/Transaction'));
      const count = await Transaction.countDocuments();
      if (count === 0) {
        const defaultTx = new Transaction({
          type: 'in',
          amount: 0,
          description: 'System initialized',
          date: new Date()
        });
        await defaultTx.save();
        console.log('✅ Default school transaction created');
      }
    };

    const initCyberTransactions = async () => {
      const conn = await connectCyber();
      const Transaction = conn.model('Transaction', require('./models/cyber/Transaction'));
      const count = await Transaction.countDocuments();
      if (count === 0) {
        const defaultTx = new Transaction({
          type: 'in',
          amount: 0,
          description: 'System initialized',
          date: new Date()
        });
        await defaultTx.save();
        console.log('✅ Default cyber transaction created');
      }
    };

    await initSchoolTransactions();
    await initCyberTransactions();

  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }

  // ==================== SCHOOL ROUTES ====================
  app.use('/api/school/auth', require('./routes/school/auth'));
  app.use('/api/school/students', require('./routes/school/students'));
  app.use('/api/school/employees', require('./routes/school/employees'));
  app.use('/api/school/fees', require('./routes/school/fees'));
  app.use('/api/school/accounts', require('./routes/school/accounts'));
  app.use('/api/school/inventory', require('./routes/school/inventory'));
  app.use('/api/school/portal', require('./routes/school/portal'));
  app.use('/api/school/settings', require('./routes/school/settings'));
  app.use('/api/school/applications', require('./routes/school/applications'));

  // ==================== CYBER ROUTES ====================
  app.use('/api/cyber/auth', require('./routes/cyber/auth'));
  app.use('/api/cyber/services', require('./routes/cyber/services'));
  app.use('/api/cyber/transactions', require('./routes/cyber/transactions'));
  app.use('/api/cyber/inventory', require('./routes/cyber/inventory'));
  app.use('/api/cyber/reports', require('./routes/cyber/reports'));
  app.use('/api/cyber/settings', require('./routes/cyber/settings'));

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.url} does not exist`,
      available: {
        root: '/',
        health: '/health',
        api: '/api',
        school: '/api/school',
        cyber: '/api/cyber'
      }
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: isProduction ? 'An error occurred' : err.message
    });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 HDM System Backend running on port ${PORT}`);
    console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'development'}`);
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Health: ${BASE_URL}/health`);
    console.log(`   School API: ${BASE_URL}/api/school`);
    console.log(`   Cyber API: ${BASE_URL}/api/cyber`);
    console.log(`   CORS Origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();