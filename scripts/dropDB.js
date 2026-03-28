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
    console.log('\n🗑️  DROP ALL DATA (INCLUDING ADMINS) UTILITY\n');
    rl.question('Which system?\n1. School\n2. Cyber\n3. Both\n\nEnter (1, 2, or 3): ', (answer) => {
      resolve(answer);
    });
  });
}

async function askConfirm(dbName) {
  return new Promise((resolve) => {
    rl.question(`\n⚠️  WARNING: This will DELETE ALL data in ${dbName} database, including admin users!\nType "CONFIRM" to proceed: `, (answer) => {
      resolve(answer === 'CONFIRM');
    });
  });
}

async function dropAllCollections(conn, dbName) {
  const db = conn.db;
  const collections = await db.listCollections().toArray();
  for (let col of collections) {
    await db.collection(col.name).drop();
    console.log(`   Dropped: ${col.name}`);
  }
  console.log(`✅ All ${dbName} collections dropped successfully`);
}

async function dropAll() {
  const system = await askSystem();
  
  let dropSchool = false, dropCyber = false;
  
  if (system === '1') {
    dropSchool = true;
  } else if (system === '2') {
    dropCyber = true;
  } else if (system === '3') {
    dropSchool = true;
    dropCyber = true;
  } else {
    console.log('❌ Invalid option');
    rl.close();
    process.exit(1);
  }

  // Confirm for each system
  if (dropSchool) {
    const confirmed = await askConfirm('School');
    if (!confirmed) {
      console.log('❌ School drop cancelled');
      dropSchool = false;
    }
  }
  if (dropCyber) {
    const confirmed = await askConfirm('Cyber');
    if (!confirmed) {
      console.log('❌ Cyber drop cancelled');
      dropCyber = false;
    }
  }

  if (!dropSchool && !dropCyber) {
    console.log('❌ No action taken');
    rl.close();
    process.exit(0);
  }

  try {
    if (dropSchool) {
      const schoolConn = await connectSchool();
      await dropAllCollections(schoolConn, 'School');
    }
    if (dropCyber) {
      const cyberConn = await connectCyber();
      await dropAllCollections(cyberConn, 'Cyber');
    }
    console.log('\n✅ All selected data deleted successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  rl.close();
  process.exit(0);
}

dropAll().catch(err => {
  console.error('❌ Error:', err.message);
  rl.close();
  process.exit(1);
});