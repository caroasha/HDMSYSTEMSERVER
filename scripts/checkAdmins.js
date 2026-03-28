#!/usr/bin/env node
// DNS Configuration
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectSchool, connectCyber } = require('../config/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askSystem() {
  return new Promise((resolve) => {
    console.log('\n🔍 CHECK ADMIN UTILITY\n');
    rl.question('Which system?\n1. School\n2. Cyber\n\nEnter (1 or 2): ', (answer) => {
      resolve(answer);
    });
  });
}

async function checkAdmins() {
  const system = await askSystem();
  
  let conn, dbName, UserModel;
  
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
    const admins = await UserModel.find({ role: 'admin' }).select('-password');
    const allUsers = await UserModel.find().select('-password');

    if (admins.length === 0) {
      console.log(`\n❌ No admin users found in ${dbName} database.`);
      console.log('   Run "npm run createadmin" to create one.');
    } else {
      console.log(`\n✅ Found ${admins.length} admin(s) in ${dbName}:`);
      admins.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    }
    
    console.log(`\n📋 Total users in ${dbName}: ${allUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  rl.close();
  process.exit(0);
}

checkAdmins().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});