#!/usr/bin/env node
// DNS Configuration
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
const { connectSchool, connectCyber } = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

// Prompt user for input
const askQuestion = (question, defaultValue = '') => {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
};

// Confirm action
const askConfirm = (question) => {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  if (password.length < 4) {
    return { valid: false, message: 'Password must be at least 4 characters' };
  }
  return { valid: true, message: '' };
};

// Check if admin already exists
const checkAdminExists = async (conn, collectionName, email) => {
  const db = conn.db;
  if (!db) return false;
  const existing = await db.collection(collectionName).findOne({ email });
  return !!existing;
};

// Create admin user
const createAdmin = async (conn, collectionName, adminData) => {
  const db = conn.db;
  if (!db) throw new Error('Database connection not ready');
  
  const hashedPassword = await bcrypt.hash(adminData.password, 10);
  const admin = {
    name: adminData.name,
    email: adminData.email,
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date()
  };
  
  await db.collection(collectionName).insertOne(admin);
  return admin;
};

// List all admins
const listAdmins = async (conn, collectionName) => {
  const db = conn.db;
  if (!db) return [];
  return await db.collection(collectionName).find({ role: 'admin' }).toArray();
};

// Main function
const createAdminNew = async () => {
  title();
  
  // Select system
  log.info('Select system to create admin for:');
  console.log('  1. School System');
  console.log('  2. Cyber System');
  console.log('  3. Both Systems');
  
  const systemChoice = await askQuestion('\nEnter choice (1-3)', '1');
  
  let schoolConn = null;
  let cyberConn = null;
  let schoolCollection = 'school_users';
  let cyberCollection = 'cyber_users';
  
  // Get admin details from user
  log.info('\nEnter admin details:');
  const name = await askQuestion('Full Name', 'Davix HDM');
  let email = await askQuestion('Email Address', 'davismcintyre5@gmail.com');
  
  // Validate email
  while (!isValidEmail(email)) {
    log.error('Invalid email format. Please enter a valid email.');
    email = await askQuestion('Email Address', 'davismcintyre5@gmail.com');
  }
  
  let password = await askQuestion('Password', 'Hdm@2002');
  let passwordConfirm = await askQuestion('Confirm Password', password);
  
  // Validate password
  while (password !== passwordConfirm) {
    log.error('Passwords do not match. Please try again.');
    password = await askQuestion('Password', '');
    passwordConfirm = await askQuestion('Confirm Password', '');
  }
  
  const passwordCheck = isValidPassword(password);
  while (!passwordCheck.valid) {
    log.error(passwordCheck.message);
    password = await askQuestion('Password', '');
    passwordConfirm = await askQuestion('Confirm Password', '');
    const newCheck = isValidPassword(password);
    if (newCheck.valid && password === passwordConfirm) break;
  }
  
  const adminData = { name, email, password };
  
  // Show summary
  title();
  log.info('Admin Details:');
  console.log(`  Name:     ${name}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${'*'.repeat(password.length)}`);
  console.log(`  System:   ${systemChoice === '1' ? 'School' : systemChoice === '2' ? 'Cyber' : 'Both'}`);
  
  const confirm = await askConfirm('\nCreate this admin user?');
  if (!confirm) {
    log.warning('Operation cancelled.');
    rl.close();
    process.exit(0);
  }
  
  try {
    title();
    
    if (systemChoice === '1' || systemChoice === '3') {
      log.info('Connecting to School database...');
      schoolConn = await connectSchool();
      log.success('Connected to School database');
      
      // Check if admin exists
      const exists = await checkAdminExists(schoolConn, schoolCollection, email);
      if (exists) {
        log.warning(`Admin with email ${email} already exists in School system`);
      } else {
        await createAdmin(schoolConn, schoolCollection, adminData);
        log.success(`Admin created successfully in School system: ${name} (${email})`);
      }
    }
    
    if (systemChoice === '2' || systemChoice === '3') {
      log.info('Connecting to Cyber database...');
      cyberConn = await connectCyber();
      log.success('Connected to Cyber database');
      
      // Check if admin exists
      const exists = await checkAdminExists(cyberConn, cyberCollection, email);
      if (exists) {
        log.warning(`Admin with email ${email} already exists in Cyber system`);
      } else {
        await createAdmin(cyberConn, cyberCollection, adminData);
        log.success(`Admin created successfully in Cyber system: ${name} (${email})`);
      }
    }
    
    // Show all admins after creation
    title();
    log.info('Current Admins:');
    
    if (systemChoice === '1' || systemChoice === '3') {
      const schoolAdmins = await listAdmins(schoolConn, schoolCollection);
      console.log(`\n${colors.cyan}School System:${colors.reset}`);
      if (schoolAdmins.length === 0) {
        console.log('  No admins found');
      } else {
        schoolAdmins.forEach(admin => {
          console.log(`  • ${admin.name} (${admin.email}) - ${admin.role}`);
        });
      }
    }
    
    if (systemChoice === '2' || systemChoice === '3') {
      const cyberAdmins = await listAdmins(cyberConn, cyberCollection);
      console.log(`\n${colors.cyan}Cyber System:${colors.reset}`);
      if (cyberAdmins.length === 0) {
        console.log('  No admins found');
      } else {
        cyberAdmins.forEach(admin => {
          console.log(`  • ${admin.name} (${admin.email}) - ${admin.role}`);
        });
      }
    }
    
    log.success('\nAdmin creation completed!');
    
  } catch (error) {
    log.error(`Failed to create admin: ${error.message}`);
    console.error(error.stack);
  }
  
  rl.close();
  process.exit(0);
};

const title = () => {
  console.log(`
${colors.cyan}${colors.bright}╔══════════════════════════════════════════════════════════╗
║                   HDM ADMIN CREATOR                        ║
║         Create new admin users for School & Cyber          ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
  `);
};

createAdminNew().catch(err => {
  log.error(`Unexpected error: ${err.message}`);
  rl.close();
  process.exit(1);
});