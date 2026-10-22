const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.warn('WARNING: TURSO_DATABASE_URL environment variable is not set.');
}

const db = createClient({
  url: url,
  authToken: authToken,
});

module.exports = db;

