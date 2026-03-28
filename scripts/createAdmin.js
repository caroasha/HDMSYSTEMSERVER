#!/usr/bin/env node
// DNS Configuration
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectSchool, connectCyber } = require('../config/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askSystem() {
  return new Promise((resolve) => {
    console.log('\n👑 CREATE ADMIN UTILITY\n');
    rl.question('Which system?\n1. School\n2. Cyber\n\nEnter (1 or 2): ', (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  const system = await askSystem();
  
  let conn, dbName, UserModel;
  
  const adminEmail = process.env.ADMIN_EMAIL || 'davismcintyre5@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Hdm@2002';
  const adminName = process.env.ADMIN_NAME || 'Davix HDM';
  
  if (system === '1') {
    conn = await connectSchool();
    dbName = 'School';
    UserModel = conn.model('User', require('../models/school/User'));
  } else if (system === '2') {
    conn = await connectCyber();
    dbName = 'Cyber';
    UserModel = conn.model('User', require('../models/cyber/User'));
  } else {
    console.log('❌ Invalid option');
    rl.close();
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existingAdmin = await UserModel.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`\n✅ Admin already exists in ${dbName} system:`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
      // If role is not admin, update it
      if (existingAdmin.role !== 'admin') {
        console.log(`\n⚠️  Current role is ${existingAdmin.role}. Updating to admin...`);
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log(`✅ Role updated to admin`);
      }
      rl.close();
      process.exit(0);
    }

    // Create new admin with role 'admin'
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await UserModel.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    });

    console.log(`\n✅ Admin created successfully in ${dbName} system!`);
    console.log(`   Name: ${adminName}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log(`\n⚠️  Please change this password after first login for security!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  rl.close();
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});