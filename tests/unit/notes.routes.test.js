'use strict';

/**
 * Tests unitaires — Routes Notes & Évaluations (avec mocks DB)
 */

require('../setup');

const jwt = require('jsonwebtoken');
const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: mockQuery,
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const mockGetNotesByClasse = jest.fn();
const mockGetStats = jest.fn();
const mockSaisirNotes = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();

jest.mock('../../src/modules/notes/notes.service', () => ({
  getNotesByClasse: mockGetNotesByClasse,
  getStats: mockGetStats,
  saisirNotes: mockSaisirNotes,
  updateNote: mockUpdateNote,
  deleteNote: mockDeleteNote,
}));

// Mock évaluations service
const mockCreateEvaluation = jest.fn();
jest.mock('../../src/modules/notes/evaluations.routes', () => {
  const express = require('express');
  const router = express.Router();
  const { verifyToken, requireRole } = require('../../src/middleware/auth');
  router.post('/', verifyToken, requireRole('enseignant'), async (req, res, next) => {
    try {
      const result = await mockCreateEvaluation(req.body, req.user.id);
      return res.status(201).json({ success: true, evaluation: result });
    } catch (err) {
      return next(err);
    }
  });
  return router;
});

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;

function tokenFor(role = 'enseignant', id = 1) {
  return jwt.sign({ id, email: 'test@test.cm', role, etablissement_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/notes/:classe_id', () => {

  test('200 — Retourne les notes d\'une classe', async () => {
    mockGetNotesByClasse.mockResolvedValueOnce({
      eleves: [{ id: 1, nom: 'ABANDA', moyenne_generale: '14.5' }],
      pagination: { total: 1 },
    });

    const res = await request(app)
      .get('/api/notes/1')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eleves).toBeDefined();
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/notes/1');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/notes/:classe_id/stats', () => {

  test('200 — Retourne les statistiques', async () => {
    mockGetStats.mockResolvedValueOnce({
      nb_eleves: 52,
      moyenne_classe: '13.2',
      meilleure_note: '19.5',
      note_la_plus_basse: '5.0',
    });

    const res = await request(app)
      .get('/api/notes/1/stats')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.nb_eleves).toBe(52);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/notes/1/stats');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/notes (saisie en lot)', () => {

  const validPayload = {
    evaluation_id: 1,
    notes: [
      { eleve_id: 1, valeur: 14 },
      { eleve_id: 2, valeur: 16 },
    ],
  };

  test('201 — Saisie de notes valides', async () => {
    mockSaisirNotes.mockResolvedValueOnce({ inserted: 2, updated: 0 });

    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('400 — Note hors plage [0-20]', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ evaluation_id: 1, notes: [{ eleve_id: 1, valeur: 25 }] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — Note négative', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ evaluation_id: 1, notes: [{ eleve_id: 1, valeur: -1 }] });

    expect(res.status).toBe(400);
  });

  test('400 — evaluation_id manquant', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ notes: [{ eleve_id: 1, valeur: 14 }] });

    expect(res.status).toBe(400);
  });

  test('400 — notes tableau vide', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ evaluation_id: 1, notes: [] });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).post('/api/notes').send(validPayload);
    expect(res.status).toBe(401);
  });

  test('403 — Proviseur ne peut pas saisir des notes', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  test('500 — Erreur service (ex: classe non autorisée)', async () => {
    const err = new Error('Accès refusé à cette classe');
    err.statusCode = 403;
    mockSaisirNotes.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — PUT /api/notes/:id', () => {

  test('200 — Modification d\'une note valide', async () => {
    mockUpdateNote.mockResolvedValueOnce({ id: 1, valeur: 15, eleve_id: 1 });

    const res = await request(app)
      .put('/api/notes/1')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ valeur: 15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('400 — Valeur hors plage', async () => {
    const res = await request(app)
      .put('/api/notes/1')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ valeur: 21 });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).put('/api/notes/1').send({ valeur: 15 });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — DELETE /api/notes/:id', () => {

  test('200 — Suppression réussie', async () => {
    mockDeleteNote.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .delete('/api/notes/1')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).delete('/api/notes/1');
    expect(res.status).toBe(401);
  });

  test('403 — Proviseur ne peut pas supprimer', async () => {
    const res = await request(app)
      .delete('/api/notes/1')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`);
    expect(res.status).toBe(403);
  });
});
