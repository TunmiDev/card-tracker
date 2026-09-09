const fs = require('fs');
const path = require('path');
const db = require('./db');

async function seed() {
  try {
    console.log('Starting seed...');
    
    // Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split statements since execute doesn't run multiple statements perfectly always,
    // actually executeMultiple is better for this in libSQL
    await db.executeMultiple(schemaSql);
    console.log('Schema created.');

    // Clear existing data
    // SQLite doesn't have TRUNCATE TABLE or RESTART IDENTITY CASCADE
    await db.executeMultiple(`
      DELETE FROM missing_licences;
      DELETE FROM collections;
      DELETE FROM licences;
      DELETE FROM dispatches;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);

    // Insert user
    const userRes = await db.execute({
      sql: `INSERT INTO users (username, password_hash, name, role) 
            VALUES ('admin', 'dummyhash', 'Desk Officer 1', 'Desk_Officer')
            RETURNING user_id;`,
      args: []
    });
    const userId = userRes.rows[0].user_id;

    // Insert dispatches
    const dispRes1 = await db.execute({
      sql: `INSERT INTO dispatches (dispatch_code, dispatch_date, date_received, manifest_quantity, received_quantity, created_by)
            VALUES ('DISP/2026/001', '2026-09-01', '2026-09-02', 10, 10, ?)
            RETURNING dispatch_id;`,
      args: [userId]
    });
    const dispId1 = dispRes1.rows[0].dispatch_id;

    const dispRes2 = await db.execute({
      sql: `INSERT INTO dispatches (dispatch_code, dispatch_date, date_received, manifest_quantity, received_quantity, created_by)
            VALUES ('DISP/2026/002', '2026-09-05', '2026-09-06', 2, 2, ?)
            RETURNING dispatch_id;`,
      args: [userId]
    });
    const dispId2 = dispRes2.rows[0].dispatch_id;

    // Insert licences
    const licences = [
      // 8 Available
      ['LIC-001', 'John Doe', '08011111111', '1 Main St', 'PC-001', dispId1, 'Available'],
      ['LIC-002', 'Jane Smith', '08022222222', '2 Main St', 'PC-002', dispId1, 'Available'],
      ['LIC-003', 'Alice Brown', '08033333333', '3 Main St', 'PC-003', dispId1, 'Available'],
      ['LIC-004', 'Bob White', '08044444444', '4 Main St', 'PC-004', dispId1, 'Available'],
      ['LIC-005', 'Charlie Green', '08055555555', '5 Main St', 'PC-005', dispId1, 'Available'],
      ['LIC-006', 'David Black', '08066666666', '6 Main St', 'PC-006', dispId1, 'Available'],
      ['LIC-007', 'Eve Gray', '08077777777', '7 Main St', 'PC-007', dispId1, 'Available'],
      ['LIC-008', 'Frank Blue', '08088888888', '8 Main St', 'PC-008', dispId1, 'Available'],
      // 3 Collected (2 Personal, 1 Proxy)
      ['LIC-009', 'Grace Red', '08099999999', '9 Main St', 'PC-009', dispId1, 'Collected'],
      ['LIC-010', 'Harry Gold', '08100000000', '10 Main St', 'PC-010', dispId1, 'Collected'],
      ['LIC-011', 'Ivy Silver', '08111111111', '11 Main St', 'PC-011', dispId2, 'Collected'],
      // 1 Missing
      ['LIC-012', 'Jack Bronze', '08122222222', '12 Main St', 'PC-012', dispId2, 'Missing'],
    ];

    for (let i = 0; i < licences.length; i++) {
      const l = licences[i];
      const lRes = await db.execute({
        sql: `INSERT INTO licences (licence_number, applicant_name, phone_number, address, pickup_code, dispatch_id, status, date_received)
              VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
              RETURNING licence_id;`,
        args: l
      });
      
      const lid = lRes.rows[0].licence_id;

      if (l[6] === 'Collected') {
        if (i === 8 || i === 9) { // Personal
          await db.execute({
            sql: `INSERT INTO collections (licence_id, collection_type, collector_name, collector_phone, authorized_by)
                  VALUES (?, 'Personal', ?, ?, ?)`,
            args: [lid, l[1], l[2], userId]
          });
        } else if (i === 10) { // Proxy
          await db.execute({
            sql: `INSERT INTO collections (licence_id, collection_type, collector_name, collector_phone, collector_id_num, relationship, verification, authorized_by)
                  VALUES (?, 'Proxy', 'Ken Iron', '08133333333', 'ID-12345', 'Brother', 'ID Card Copied', ?)`,
            args: [lid, userId]
          });
        }
      } else if (l[6] === 'Missing') {
        await db.execute({
          sql: `INSERT INTO missing_licences (licence_id, reason, reported_by)
                VALUES (?, 'Card not found in the manifest package during audit.', ?)`,
          args: [lid, userId]
        });
      }
    }

    console.log('Seed completed successfully.');
  } catch (e) {
    console.error('Seed failed:', e);
  }
}

seed();
