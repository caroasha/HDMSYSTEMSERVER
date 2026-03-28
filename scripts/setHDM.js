#!/usr/bin/env node
// DNS Configuration
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
// Force load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectSchool, connectCyber } = require('../config/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askSystem() {
  return new Promise((resolve) => {
    console.log('\n⚙️  SET HDM DEFAULT SETTINGS\n');
    console.log('This will populate the settings collection with default values and create admin user for the selected system.\n');
    rl.question('Which system?\n1. School\n2. Cyber\n\nEnter (1 or 2): ', (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminIfNotExists(conn, usersCollection, adminEmail, adminPassword, adminName, UserModel = null) {
  // Try to get native db
  let db;
  if (conn.db) {
    db = conn.db;
  } else if (conn.connection && conn.connection.db) {
    db = conn.connection.db;
  }
  
  if (!db) {
    console.log('⚠️  Using Mongoose model for admin creation...');
    if (UserModel) {
      const existingAdmin = await UserModel.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await UserModel.create({
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date()
        });
        return true;
      }
      return false;
    }
    throw new Error('Cannot access database');
  }
  
  const existingAdmin = await db.collection(usersCollection).findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await db.collection(usersCollection).insertOne({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    });
    return true;
  }
  return false;
}

async function setHDM() {
  const system = await askSystem();
  
  let conn, dbName, SettingsModel, usersCollection, UserModel, defaultSettings;
  
  // Admin defaults from .env
  const adminEmail = process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Hdm@2002';
  const adminName = process.env.ADMIN_NAME || 'Davix HDM';
  
  if (system === '1') {
    conn = await connectSchool();
    dbName = 'School';
    usersCollection = 'school_users';
    UserModel = conn.model('User', require('../models/school/User'));
    defaultSettings = {
      schoolName: 'HDM Computer School',
      motto: 'Technology for Tomorrow',
      address: 'Nairobi, Kenya · CBD',
      phone: '+254 700 123 456',
      email: 'info@hdmcomputerschool.ac.ke',
      stampImage: '',
      courses: [
        { name: 'Web Development', durationMonths: 3, totalFee: 15000 },
        { name: 'Networking', durationMonths: 3, totalFee: 12000 },
        { name: 'Graphic Design', durationMonths: 2, totalFee: 10000 },
        { name: 'Database Management', durationMonths: 3, totalFee: 14000 },
        { name: 'Cyber Security', durationMonths: 4, totalFee: 20000 }
      ],
      computers: {
        mode: 'range',
        range: { start: 1, end: 20, prefix: 'PC ' },
        manualList: []
      },
      landing: {
        heroImage: '',
        aboutText: 'HDM Computer School offers certified courses in programming, networking, and design. Our state‑of‑the‑art labs and experienced instructors ensure you gain practical skills.',
        galleryImages: [],
        socialMedia: { facebook: '', twitter: '', instagram: '' }
      }
    };
    SettingsModel = conn.model('Settings', require('../models/school/Settings'));
  } else if (system === '2') {
    conn = await connectCyber();
    dbName = 'Cyber';
    usersCollection = 'cyber_users';
    UserModel = conn.model('User', require('../models/cyber/User'));
    defaultSettings = {
      businessName: 'HDM Cyber Services',
      address: 'Nairobi, Kenya · CBD',
      phone: '+254 700 123 456',
      email: 'cyber@hdm.com',
      stampImage: '',
      services: [
        { name: 'Printing', price: 10, description: 'Per page black & white' },
        { name: 'Photocopy', price: 5, description: 'Per page' },
        { name: 'Internet', price: 50, description: 'Per hour' },
        { name: 'Online applications', price: 200, description: 'Includes assistance' },
        { name: 'Scanning', price: 20, description: 'Per page' },
        { name: 'Lamination', price: 50, description: 'Per A4 sheet' }
      ],
      taxRate: 0,
      receiptFooterText: 'Thank you for your patronage. Visit again!'
    };
    SettingsModel = conn.model('Settings', require('../models/cyber/Settings'));
  } else {
    console.log('❌ Invalid option');
    rl.close();
    process.exit(1);
  }

  try {
    // Create admin user if not exists
    console.log(`\n🔧 Setting up admin for ${dbName} system...`);
    const adminCreated = await createAdminIfNotExists(conn, usersCollection, adminEmail, adminPassword, adminName, UserModel);
    
    if (adminCreated) {
      console.log(`✅ Admin created successfully:`);
      console.log(`   Name: ${adminName}`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role: admin`);
    } else {
      console.log(`✅ Admin already exists: ${adminEmail}`);
      // Verify admin has correct role
      const existingAdmin = await UserModel.findOne({ email: adminEmail });
      if (existingAdmin && existingAdmin.role !== 'admin') {
        console.log(`⚠️  User exists but role is ${existingAdmin.role}. Updating to admin...`);
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log(`✅ Role updated to admin`);
      }
    }
    
    // Handle settings
    console.log(`\n🔧 Setting up settings for ${dbName} system...`);
    let settings = await SettingsModel.findOne();
    
    if (!settings) {
      settings = new SettingsModel(defaultSettings);
      await settings.save();
      console.log(`✅ Default settings created for ${dbName} system.`);
    } else {
      console.log(`⚠️  Settings already exist for ${dbName}.`);
      
      const updateConfirm = await new Promise((resolve) => {
        rl.question('\nDo you want to reset to default settings? (yes/no): ', (answer) => {
          resolve(answer.toLowerCase() === 'yes');
        });
      });
      
      if (updateConfirm) {
        Object.assign(settings, defaultSettings);
        settings.updatedAt = new Date();
        await settings.save();
        console.log(`✅ Settings reset to defaults for ${dbName} system.`);
      } else {
        console.log(`ℹ️  Settings unchanged.`);
      }
    }
    
    const finalSettings = await SettingsModel.findOne();
    console.log('\n📋 Final Settings:');
    if (system === '1') {
      console.log(`   School Name: ${finalSettings.schoolName}`);
      console.log(`   Courses: ${finalSettings.courses?.length || 0} configured`);
      console.log(`   Computer Mode: ${finalSettings.computers?.mode || 'range'}`);
    } else {
      console.log(`   Business Name: ${finalSettings.businessName}`);
      console.log(`   Services: ${finalSettings.services?.length || 0} configured`);
    }
    
    console.log(`\n🎉 ${dbName} system is ready!`);
    console.log(`   Admin Login: ${adminEmail} / ${adminPassword}`);
    console.log(`   Role: admin (full access)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
  
  rl.close();
  process.exit(0);
}

setHDM();