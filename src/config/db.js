'use strict';

const { Pool } = require('pg');
const config = require('./env');

// Railway fournit DATABASE_URL — on l'utilise en priorité
const isRailway = !!process.env.DATABASE_URL;

const poolConfig = isRailway
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      min: 1,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
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
    const target = isRailway
      ? `Railway (${process.env.DATABASE_URL.split('@')[1]})`
      : `${config.db.host}:${config.db.port}/${config.db.name}`;
    console.log(`[DB] Connexion PostgreSQL établie → ${target}`);
  }
});

pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur le pool :', err.message);
});

/**
 * Teste la connexion à la base de données
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    return true;
  } finally {
    client.release();
  }
}

/**
 * Exécute une requête SQL paramétrée
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Obtient un client du pool (pour les transactions)
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient, testConnection };
