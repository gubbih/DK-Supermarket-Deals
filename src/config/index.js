require('dotenv').config();
const { AppError, ErrorCodes } = require('../utils/errorHandler');

// Parse business IDs from environment variable
const parseBusinessIds = (businessIdsString) => {
  if (!businessIdsString) {
    console.warn(`Warning: BUSINESS_IDS is not defined`);
    return [];
  }
  return businessIdsString.split(`_`).map(item => {
    const [name, id] = item.split(`:`);
    return { name, id };
  });
};

// Validate required environment variables
const validateEnv = () => {
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_ADMIN_EMAIL',
    'FIREBASE_ADMIN_PASSWORD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      ErrorCodes.INVALID_DATA,
      { missing }
    );
  }
};

// Application config
const config = {
  // App info
  app: {
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    bypassAdminCheck: process.env.BYPASS_ADMIN_CHECK === 'true',
  },
  
  // API settings
  api: {
    key: process.env.API_KEY,
    trackId: process.env.TRACK_ID,
    businessIds: parseBusinessIds(process.env.BUSINESS_IDS),
    baseUrl: 'https://squid-api.tjek.com/v2'
  },
  
  // Firebase settings
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.app`,
    databaseURL: `https://${process.env.FIREBASE_DATABASE_URL}.firebasedatabase.app`,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  },
  
  // Auth settings
  auth: {
    adminEmail: process.env.FIREBASE_ADMIN_EMAIL,
    adminPassword: process.env.FIREBASE_ADMIN_PASSWORD,
  },
  
  // File paths
  paths: {
    data: './src/data',
  }
};

// Validate environment variables in non-test environments
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = config;