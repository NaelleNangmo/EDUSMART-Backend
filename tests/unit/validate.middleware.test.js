'use strict';

/**
 * Tests unitaires — Middleware validate (express-validator)
 * Teste le comportement via des requêtes HTTP réelles avec express
 */

require('../setup');

jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: jest.fn(),
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const express = require('express');
const request = require('supertest');
const { body } = require('express-validator');
const { validate } = require('../../src/middleware/validate');

// ── Mini-app de test pour le middleware validate ──────────────
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Route avec validation
  app.post(
    '/test-validate',
    [
      body('email').isEmail().withMessage('Email invalide'),
      body('nom').notEmpty().withMessage('Nom requis'),
    ],
    validate,
    (req, res) => res.status(200).json({ success: true, data: req.body })
  );

  return app;
}

const testApp = buildTestApp();

// ─────────────────────────────────────────────────────────────
describe('Middleware — validate', () => {

  test('Appelle next() et retourne 200 si données valides', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'test@example.com', nom: 'NKOMO' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Retourne 400 si email invalide', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'pas_un_email', nom: 'NKOMO' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Retourne 400 si champ requis manquant', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'test@example.com' }); // nom manquant

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('La réponse 400 contient le tableau errors', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'invalide', nom: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('Chaque erreur contient field et message', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'invalide', nom: '' });

    res.body.errors.forEach((err) => {
      expect(err).toHaveProperty('field');
      expect(err).toHaveProperty('message');
    });
  });

  test('Retourne 400 si body vide', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({});

    expect(res.status).toBe(400);
  });

  test('Le message de la réponse 400 est "Données invalides"', async () => {
    const res = await request(testApp)
      .post('/test-validate')
      .send({ email: 'invalide' });

    expect(res.body.message).toBe('Données invalides');
  });
});
