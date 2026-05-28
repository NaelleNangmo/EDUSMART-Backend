'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function migrate() {
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[MIGRATE] Connexion à PostgreSQL…');
  const client = await pool.connect();

  try {
    console.log('[MIGRATE] Exécution du script init.sql…');
    await client.query(sql);
    console.log('[MIGRATE] ✓ Toutes les tables ont été créées avec succès.');
  } catch (err) {
    console.error('[MIGRATE] ✗ Erreur lors de la migration :', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
