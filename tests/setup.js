'use strict';

// ── Variables d'environnement de test ────────────────────────
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'edusmartdb';
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'noutong1';
process.env.JWT_SECRET = 'edusmart_jwt_secret_key_2025';
process.env.JWT_EXPIRES_IN = '7d';
