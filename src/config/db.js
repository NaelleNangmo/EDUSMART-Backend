'use strict';

const { Pool } = require('pg');
const config = require('./env');

// Railway fournit DATABASE_URL — on l'utilise en priorité
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  if (config.nodeEnv !== 'test') {
    const target = process.env.DATABASE_URL
      ? `Railway (${process.env.DATABASE_URL.split('@')[1]})`
      : `${config.db.host}:${config.db.port}/${config.db.name}`;
    console.log(`[DB] Connexion PostgreSQL établie → ${target}`);
  }
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur le pool :', err.message);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    return true;
  } finally {
    client.release();
  }
}

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient, testConnection };
