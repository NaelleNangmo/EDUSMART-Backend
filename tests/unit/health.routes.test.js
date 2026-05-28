'use strict';

/**
 * Tests unitaires — Route de santé et routes 404
 * Aucune dépendance PostgreSQL
 */

require('../setup');

jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: jest.fn(),
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const app = require('../../src/app');

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/health', () => {

  test('200 — Retourne le statut opérationnel', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/EDUSMART/i);
  });

  test('Retourne un timestamp ISO valide', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.timestamp).toBeDefined();
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  test('Retourne la version de l\'API', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.version).toBeDefined();
    expect(typeof res.body.version).toBe('string');
  });

  test('Content-Type est application/json', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — 404 Not Found', () => {

  test('Route inexistante → 404', async () => {
    const res = await request(app).get('/api/route-inexistante');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('Méthode non supportée → 404', async () => {
    const res = await request(app).delete('/api/health');
    expect(res.status).toBe(404);
  });

  test('Route racine → 404', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });
});
