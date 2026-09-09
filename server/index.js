const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// GET /health
app.get('/health', async (req, res) => {
  try {
    const result = await db.execute("SELECT datetime('now') as now");
    res.status(200).json({ status: 'ok', timestamp: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /api/dashboard/stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM dispatches) as dispatched,
        (SELECT COUNT(*) FROM licences WHERE status = 'Collected') as collected,
        (SELECT COUNT(*) FROM licences WHERE status = 'Available') as outstanding,
        (SELECT COUNT(*) FROM licences WHERE status = 'Missing') as missing,
        (SELECT COUNT(*) FROM collections WHERE collection_type = 'Personal' AND date(collection_date) = date('now')) as today_personal,
        (SELECT COUNT(*) FROM collections WHERE collection_type = 'Proxy' AND date(collection_date) = date('now')) as today_proxy
    `;
    const result = await db.execute(statsQuery);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/licences/search?q=
app.get('/api/licences/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  try {
    const searchQuery = `
      SELECT 
        l.*, 
        d.dispatch_code, d.dispatch_date,
        c.collection_type, c.collection_date, c.collector_name, c.collector_phone,
        m.date_reported, m.reason, m.status as missing_status
      FROM licences l
      LEFT JOIN dispatches d ON l.dispatch_id = d.dispatch_id
      LEFT JOIN collections c ON l.licence_id = c.licence_id
      LEFT JOIN missing_licences m ON l.licence_id = m.licence_id
      WHERE l.licence_number LIKE ? OR l.pickup_code LIKE ?
    `;
    const result = await db.execute({
      sql: searchQuery,
      args: [`%${q}%`, `%${q}%`]
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/collections
app.post('/api/collections', async (req, res) => {
  const { 
    licence_id, 
    collection_type, 
    collector_name, 
    collector_phone, 
    collector_id_num, 
    relationship, 
    verification, 
    authorized_by 
  } = req.body;

  if (!licence_id || !collection_type || !collector_name || !collector_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if licence exists and is 'Available'
    const licenceRes = await db.execute({
      sql: 'SELECT status FROM licences WHERE licence_id = ?',
      args: [licence_id]
    });

    if (licenceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Licence not found' });
    }

    if (licenceRes.rows[0].status !== 'Available') {
      return res.status(400).json({ error: 'Licence is already collected or missing' });
    }

    const authId = authorized_by || 1;

    // Execute atomic transaction
    await db.batch([
      {
        sql: `INSERT INTO collections (licence_id, collection_type, collector_name, collector_phone, collector_id_num, relationship, verification, authorized_by) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [licence_id, collection_type, collector_name, collector_phone, collector_id_num || null, relationship || null, verification || null, authId]
      },
      {
        sql: `UPDATE licences SET status = 'Collected' WHERE licence_id = ?`,
        args: [licence_id]
      }
    ], 'write');

    res.status(201).json({ message: 'Collection recorded successfully', licence_id, status: 'Collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during collection' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
