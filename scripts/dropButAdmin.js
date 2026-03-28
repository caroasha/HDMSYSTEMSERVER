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
    console.log('\n🗑️  DROP ALL EXCEPT ADMIN UTILITY\n');
    console.log('This will delete all data but KEEP admin users.\n');
    rl.question('Which system?\n1. School\n2. Cyber\n\nEnter (1 or 2): ', (answer) => {
      resolve(answer);
    });
  });
}

async function askConfirm(dbName) {
  return new Promise((resolve) => {
    rl.question(`\n⚠️  Delete ALL data in ${dbName} (keep admins)?\nType "CONFIRM" to proceed: `, (answer) => {
      resolve(answer === 'CONFIRM');
    });
  });
}

async function dropButAdmin() {
  const system = await askSystem();
  
  let conn, dbName, UserModel, allModels = [];
  
  if (system === '1') {
    conn = await connectSchool();
    dbName = 'School';
    UserModel = conn.model('User', require('../models/school/User'));
    allModels = [
      conn.model('Student', require('../models/school/Student')),
      conn.model('Employee', require('../models/school/Employee')),
      conn.model('Fee', require('../models/school/Fee')),
      conn.model('Inventory', require('../models/school/Inventory')),
      conn.model('PortalUser', require('../models/school/PortalUser')),
      conn.model('Settings', require('../models/school/Settings'))
    ];
  } else if (system === '2') {
    conn = await connectCyber();
    dbName = 'Cyber';
    UserModel = conn.model('User', require('../models/cyber/User'));
    allModels = [
      conn.model('Service', require('../models/cyber/Service')),
      conn.model('Transaction', require('../models/cyber/Transaction')),
      conn.model('Inventory', require('../models/cyber/Inventory')),
      conn.model('Settings', require('../models/cyber/Settings'))
    ];
  } else {
    console.log('❌ Invalid option');
    rl.close();
    process.exit(1);
  }

  const confirmed = await askConfirm(dbName);
  if (!confirmed) {
    console.log('❌ Operation cancelled');
    rl.close();
    process.exit(0);
  }

  try {
    // Save admin users before deletion
    const admins = await UserModel.find({});
    console.log(`   Saved ${admins.length} admin user(s)`);

    // Delete all collections except users
    for (const model of allModels) {
      const deleted = await model.deleteMany({});
      console.log(`   Cleared: ${model.modelName} (${deleted.deletedCount} records)`);
    }

    console.log(`\n✅ ${dbName} data cleared (admins preserved)`);
    console.log(`   Admins retained: ${admins.length} user(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  rl.close();
  process.exit(0);
}

dropButAdmin().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});