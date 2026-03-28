const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

let schoolConnection = null;
let cyberConnection = null;

/**
 * Parse MongoDB connection URI to extract connection type and database name
 * @param {string} uri - MongoDB connection string
 * @returns {Object} { type: 'Atlas'|'Localhost'|'Unknown', dbName: string }
 */
function getConnectionInfo(uri) {
  let type = 'Unknown';
  let dbName = '';

  // Check if URI exists
  if (!uri) {
    return { type: 'Not configured', dbName: '' };
  }

  // Detect connection type
  if (uri.includes('mongodb.net')) {
    type = 'Atlas';
  } else if (uri.includes('localhost') || uri.includes('127.0.0.1')) {
    type = 'Localhost';
  }

  // Extract database name from URI
  try {
    const url = new URL(uri);
    dbName = url.pathname.substring(1).split('?')[0];
  } catch (e) {
    // Fallback parsing if URL constructor fails
    const parts = uri.split('/');
    let last = parts[parts.length - 1];
    if (last.includes('?')) last = last.split('?')[0];
    dbName = last;
  }

  return { type, dbName };
}

const connectSchool = async () => {
  if (schoolConnection) return schoolConnection;
  const uri = process.env.SCHOOL_DB_URI;
  if (!uri) {
    throw new Error('SCHOOL_DB_URI is not defined in .env file');
  }
  const info = getConnectionInfo(uri);
  console.log(`🔌 Connecting to School database (${info.type}: ${info.dbName})...`);
  schoolConnection = await mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Wait for connection to be fully established
  await new Promise((resolve) => {
    schoolConnection.once('connected', resolve);
  });
  
  console.log(`✅ Connected to School database (${info.type}: ${info.dbName})`);
  return schoolConnection;
};

const connectCyber = async () => {
  if (cyberConnection) return cyberConnection;
  const uri = process.env.CYBER_DB_URI;
  if (!uri) {
    throw new Error('CYBER_DB_URI is not defined in .env file');
  }
  const info = getConnectionInfo(uri);
  console.log(`🔌 Connecting to Cyber database (${info.type}: ${info.dbName})...`);
  cyberConnection = await mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  // Wait for connection to be fully established
  await new Promise((resolve) => {
    cyberConnection.once('connected', resolve);
  });
  
  console.log(`✅ Connected to Cyber database (${info.type}: ${info.dbName})`);
  return cyberConnection;
};

module.exports = { connectSchool, connectCyber };