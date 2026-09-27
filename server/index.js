const express = require('express');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Helper: Split arrays into manageable chunks to stay safely below SQLite/LibSQL batch limits
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

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
        (SELECT COUNT(*) FROM licences WHERE status = 'Available') as available,
        (SELECT COUNT(*) FROM collections WHERE collection_type = 'Personal' AND date(collection_date, 'localtime') = date('now', 'localtime')) as collected_personal,
        (SELECT COUNT(*) FROM collections WHERE collection_type = 'Proxy' AND date(collection_date, 'localtime') = date('now', 'localtime')) as collected_proxy,
        (SELECT COUNT(*) FROM collections WHERE date(collection_date, 'localtime') = date('now', 'localtime')) as collected_total
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
  const q = req.query.q || '';

  try {
    let result;
    if (!q.trim()) {
      const recentQuery = `
        SELECT 
          l.*, 
          d.dispatch_code, d.dispatch_date,
          c.collection_type, c.collection_date, c.collector_name, c.collector_phone,
          m.missing_id, m.date_reported, m.reason, m.status as missing_status
        FROM licences l
        LEFT JOIN dispatches d ON l.dispatch_id = d.dispatch_id
        LEFT JOIN collections c ON l.licence_id = c.licence_id
        LEFT JOIN missing_licences m ON l.licence_id = m.licence_id AND m.status = 'Open'
        WHERE l.status = 'Available'
        ORDER BY l.licence_id DESC
      `;
      result = await db.execute(recentQuery);
    } else {
      const searchQuery = `
        SELECT 
          l.*, 
          d.dispatch_code, d.dispatch_date,
          c.collection_type, c.collection_date, c.collector_name, c.collector_phone,
          m.missing_id, m.date_reported, m.reason, m.status as missing_status
        FROM licences l
        LEFT JOIN dispatches d ON l.dispatch_id = d.dispatch_id
        LEFT JOIN collections c ON l.licence_id = c.licence_id
        LEFT JOIN missing_licences m ON l.licence_id = m.licence_id AND m.status = 'Open'
        WHERE l.licence_number LIKE ? OR l.pickup_code LIKE ? OR l.applicant_name LIKE ?
      `;
      const searchParam = `%${q.trim()}%`;
      result = await db.execute({
        sql: searchQuery,
        args: [searchParam, searchParam, searchParam]
      });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/dispatches/upload-manifest
// Extracts only OJO station tab records from the HQ workbook
app.post('/api/dispatches/upload-manifest', upload.single('manifest'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No manifest file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);

    // Locate the OJO sheet (case-insensitive)
    const ojoSheetName = workbook.SheetNames.find(
      (name) => name.trim().toUpperCase() === 'OJO'
    );

    if (!ojoSheetName) {
      return res.status(404).json({ error: 'No "OJO" sheet tab found in this workbook' });
    }

    const worksheet = workbook.Sheets[ojoSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Find the row containing the column headers ('DL Number', 'Name', etc.)
    const headerRowIdx = rawRows.findIndex(
      (row) =>
        Array.isArray(row) &&
        row.some((cell) => String(cell).toLowerCase().includes('dl number'))
    );

    if (headerRowIdx === -1) {
      return res.status(400).json({ error: 'Could not find column headers in OJO sheet' });
    }

    const headers = rawRows[headerRowIdx].map((h) => String(h || '').trim());
    const snIdx = headers.findIndex((h) => /^s\/?n/i.test(h));
    const indexIdx = headers.findIndex((h) => /index number/i.test(h));
    const dlIdx = headers.findIndex((h) => /dl number/i.test(h));
    const phoneIdx = headers.findIndex((h) => /phone number/i.test(h));
    const nameIdx = headers.findIndex((h) => /name/i.test(h));

    const records = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !row[dlIdx]) continue; // Skip blank rows

      const dlNumber = String(row[dlIdx]).trim();
      const applicantName = String(row[nameIdx] || '').trim();
      let phone = String(row[phoneIdx] || '').trim();

      // Normalize Nigerian phone numbers (e.g., 8023456789 -> 08023456789)
      if (phone && !phone.startsWith('0') && !phone.startsWith('+') && phone.length === 10) {
        phone = '0' + phone;
      }

      const indexNumber = indexIdx !== -1 && row[indexIdx] ? String(row[indexIdx]).trim() : '';
      const pickupCode = indexNumber || dlNumber.slice(-6);

      records.push({
        sn: row[snIdx] || records.length + 1,
        index_number: indexNumber,
        licence_number: dlNumber,
        applicant_name: applicantName,
        phone_number: phone,
        pickup_code: pickupCode,
        sms_preview: `Dear ${applicantName}, your driver's licence (${dlNumber}) is ready for pickup at MVAA Ojo Station. Pickup Code: ${pickupCode}.`
      });
    }
    const dlNumbers = records.map(r => r.licence_number);
    const existingLicences = new Set();
    const dlChunks = chunkArray(dlNumbers, 250);

    for (const chunk of dlChunks) {
      const placeholders = chunk.map(() => '?').join(',');
      const result = await db.execute({
        sql: `SELECT licence_number FROM licences WHERE licence_number IN (${placeholders})`,
        args: chunk
      });
      result.rows.forEach(row => existingLicences.add(String(row.licence_number).trim().toUpperCase()));
    }

    let new_records_count = 0;
    let duplicate_count = 0;
    records.forEach(r => {
      if (existingLicences.has(String(r.licence_number).trim().toUpperCase())) {
        r.is_duplicate = true;
        duplicate_count++;
      } else {
        r.is_duplicate = false;
        new_records_count++;
      }
    });

    res.json({
      station: 'OJO',
      file_name: req.file.originalname,
      total_records: records.length,
      new_records_count,
      duplicate_count,
      records
    });
  } catch (err) {
    console.error('Manifest processing error:', err);
    res.status(500).json({ error: 'Failed to process manifest spreadsheet' });
  }
});

// GET /api/dispatches
// Fetches ingested dispatches list with available and collected counts
app.get('/api/dispatches', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        d.dispatch_id, 
        d.dispatch_code, 
        d.dispatch_date, 
        COALESCE(d.manifest_quantity, 0) as total_licences,
        (SELECT COUNT(*) FROM licences WHERE dispatch_id = d.dispatch_id AND status = 'Available') as available_count,
        (SELECT COUNT(*) FROM licences WHERE dispatch_id = d.dispatch_id AND status = 'Collected') as collected_count
      FROM dispatches d
      ORDER BY d.dispatch_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch dispatches:', err);
    res.status(500).json({ error: 'Failed to fetch dispatches' });
  }
});

// GET /api/dispatches/:id/licences
// Fetches all licences associated with a specific dispatch
app.get('/api/dispatches/:id/licences', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.execute({
      sql: `SELECT licence_id, licence_number, applicant_name, phone_number, pickup_code, status 
            FROM licences 
            WHERE dispatch_id = ? 
            ORDER BY licence_id ASC`,
      args: [id]
    });
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch dispatch licences:', err);
    res.status(500).json({ error: 'Failed to fetch dispatch licences' });
  }
});

// POST /api/dispatches/commit
// Atomically saves dispatch manifest using uploaded file name and inserts cards in 250-row chunks
app.post('/api/dispatches/commit', async (req, res) => {
  const { manifest_code, file_name, received_date, cards } = req.body;

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'No card records provided for commit' });
  }

  const newCards = cards.filter(c => !c.is_duplicate);

  if (newCards.length === 0) {
    return res.status(400).json({ error: 'All records in this manifest already exist in the database.' });
  }

  // Preserve the actual uploaded Excel file name as the manifest/batch code
  const batchCode = manifest_code || file_name || `DISP-OJO-${Date.now()}.xlsx`;
  const dateReceived = received_date || new Date().toISOString().split('T')[0];

  try {
    // 1. Create or Update dispatch batch header
    const dispatchInsertRes = await db.execute({
      sql: `INSERT INTO dispatches (dispatch_code, dispatch_date, manifest_quantity, created_by) 
            VALUES (?, ?, ?, 1)
            ON CONFLICT(dispatch_code) DO UPDATE SET 
              manifest_quantity = dispatches.manifest_quantity + excluded.manifest_quantity
            RETURNING dispatch_id`,
      args: [batchCode, dateReceived, newCards.length]
    });

    const dispatchId = Number(dispatchInsertRes.rows[0].dispatch_id);

    // 2. Chunk records in batches of 250 to stay safely within LibSQL batch boundaries
    const cardChunks = chunkArray(newCards, 250);

    for (const chunk of cardChunks) {
      const batchStatements = chunk.map((card) => ({
        sql: `INSERT OR IGNORE INTO licences (
                dispatch_id, 
                licence_number, 
                pickup_code, 
                applicant_name, 
                phone_number, 
                status, 
                date_received
              ) VALUES (?, ?, ?, ?, ?, 'Available', ?)`,
        args: [
          dispatchId,
          String(card.licence_number).trim().toUpperCase(),
          String(card.pickup_code || card.licence_number.slice(-6)).trim(),
          String(card.applicant_name).trim(),
          card.phone_number ? String(card.phone_number).trim() : null,
          dateReceived
        ]
      }));

      await db.batch(batchStatements, 'write');
    }

    res.status(201).json({
      success: true,
      dispatch_id: dispatchId,
      batch_code: batchCode,
      count: newCards.length
    });
  } catch (err) {
    console.error('Batch commit error:', err);
    res.status(500).json({ error: err.message || 'Failed to commit dispatch batch to database' });
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
    authorized_by,
    address,
    collection_date
  } = req.body;

  if (!licence_id || !collection_type || !collector_name || !collector_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
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
    const colDate = collection_date || new Date().toISOString();

    await db.batch([
      {
        sql: `INSERT INTO collections (licence_id, collection_type, collector_name, collector_phone, collector_id_num, relationship, verification, authorized_by, collection_date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [licence_id, collection_type, collector_name, collector_phone, collector_id_num || null, relationship || null, verification || null, authId, colDate]
      },
      {
        sql: `UPDATE licences SET status = 'Collected', address = COALESCE(?, address) WHERE licence_id = ?`,
        args: [address || null, licence_id]
      }
    ], 'write');

    res.status(201).json({ message: 'Collection recorded successfully', licence_id, status: 'Collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during collection' });
  }
});

// POST /api/missing
app.post('/api/missing', async (req, res) => {
  const { licence_id, reason, action_taken, reported_by } = req.body;

  if (!licence_id || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const licenceRes = await db.execute({
      sql: 'SELECT status FROM licences WHERE licence_id = ?',
      args: [licence_id]
    });

    if (licenceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Licence not found' });
    }

    if (licenceRes.rows[0].status !== 'Available') {
      return res.status(400).json({ error: 'Only Available licences can be marked Missing' });
    }

    const reporterId = reported_by || 1;

    await db.batch([
      {
        sql: `INSERT INTO missing_licences (licence_id, reason, action_taken, reported_by, status) 
              VALUES (?, ?, ?, ?, 'Open')`,
        args: [licence_id, reason, action_taken || null, reporterId]
      },
      {
        sql: `UPDATE licences SET status = 'Missing' WHERE licence_id = ?`,
        args: [licence_id]
      }
    ], 'write');

    res.status(201).json({ message: 'Licence marked as missing', licence_id, status: 'Missing' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/missing/:missing_id/resolve
app.put('/api/missing/:missing_id/resolve', async (req, res) => {
  const { missing_id } = req.params;
  const { resolution } = req.body;

  if (!resolution) {
    return res.status(400).json({ error: 'Resolution is required' });
  }

  try {
    const missingRes = await db.execute({
      sql: 'SELECT licence_id, status FROM missing_licences WHERE missing_id = ?',
      args: [missing_id]
    });

    if (missingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Missing record not found' });
    }
    
    if (missingRes.rows[0].status === 'Resolved') {
      return res.status(400).json({ error: 'Missing record already resolved' });
    }

    const licence_id = missingRes.rows[0].licence_id;

    await db.batch([
      {
        sql: `UPDATE missing_licences SET status = 'Resolved', resolution = ? WHERE missing_id = ?`,
        args: [resolution, missing_id]
      },
      {
        sql: `UPDATE licences SET status = 'Available' WHERE licence_id = ?`,
        args: [licence_id]
      }
    ], 'write');

    res.json({ message: 'Missing licence resolved', licence_id, status: 'Available' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/licences/:id/history
app.get('/api/licences/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const dispatchRes = await db.execute({
      sql: `SELECT d.dispatch_code, d.dispatch_date 
            FROM licences l 
            JOIN dispatches d ON l.dispatch_id = d.dispatch_id 
            WHERE l.licence_id = ?`,
      args: [id]
    });

    const collectionRes = await db.execute({
      sql: `SELECT * FROM collections WHERE licence_id = ?`,
      args: [id]
    });

    const missingRes = await db.execute({
      sql: `SELECT * FROM missing_licences WHERE licence_id = ? ORDER BY date_reported DESC`,
      args: [id]
    });

    res.json({
      dispatch: dispatchRes.rows[0] || null,
      collections: collectionRes.rows,
      missing_incidents: missingRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/daily
app.get('/api/reports/daily', async (req, res) => {
  try {
    const dailyQuery = `
      SELECT 
        c.collection_id, c.collection_type, c.collection_date, c.collector_name, c.collector_phone, c.verification,
        l.licence_number, l.applicant_name
      FROM collections c
      JOIN licences l ON c.licence_id = l.licence_id
      WHERE date(c.collection_date) = date('now')
      ORDER BY c.collection_date DESC
    `;
    const result = await db.execute(dailyQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/outstanding
app.get('/api/reports/outstanding', async (req, res) => {
  try {
    const outstandingQuery = `
      SELECT 
        l.licence_id, l.licence_number, l.applicant_name, l.phone_number, l.date_received,
        CAST((julianday('now') - julianday(l.date_received)) AS INTEGER) as days_pending
      FROM licences l
      WHERE l.status = 'Available' AND julianday('now') - julianday(l.date_received) > 30
      ORDER BY days_pending DESC
    `;
    const result = await db.execute(outstandingQuery);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});