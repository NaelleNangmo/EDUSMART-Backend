'use strict';

/**
 * Tests unitaires — Routes Absences (avec mocks DB)
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

const mockGetAbsencesByClasse = jest.fn();
const mockGetStatsByDate = jest.fn();
const mockGetAbsencesByEleve = jest.fn();
const mockEnregistrerAppel = jest.fn();
const mockUpdateAbsence = jest.fn();

jest.mock('../../src/modules/absences/absences.service', () => ({
  getAbsencesByClasse: mockGetAbsencesByClasse,
  getStatsByDate: mockGetStatsByDate,
  getAbsencesByEleve: mockGetAbsencesByEleve,
  enregistrerAppel: mockEnregistrerAppel,
  updateAbsence: mockUpdateAbsence,
}));

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;

function tokenFor(role = 'enseignant', id = 1) {
  return jwt.sign({ id, email: 'test@test.cm', role, etablissement_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/absences/:classe_id', () => {

  test('200 — Retourne les absences d\'une classe', async () => {
    mockGetAbsencesByClasse.mockResolvedValueOnce({
      eleves: [
        { id: 1, nom: 'KAMGA', prenom: 'Fatou', nb_absences: 7, flag: 'critique' },
        { id: 2, nom: 'BIYONG', prenom: 'Marie', nb_absences: 3, flag: 'warning' },
      ],
    });

    const res = await request(app)
      .get('/api/absences/1')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eleves).toHaveLength(2);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/absences/1');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/absences/:classe_id/stats', () => {

  test('200 — Retourne les statistiques d\'absences', async () => {
    mockGetStatsByDate.mockResolvedValueOnce({
      total: 52,
      presents: 48,
      absents: 3,
      retards: 1,
    });

    const res = await request(app)
      .get('/api/absences/1/stats?date=2025-03-10')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.total).toBe(52);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/absences/1/stats');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/absences/appel', () => {

  const validPayload = {
    classe_id: 1,
    date: '2025-03-10',
    presences: [
      { eleve_id: 1, statut: 'present', motif: 'sans_motif' },
      { eleve_id: 2, statut: 'absent', motif: 'maladie' },
      { eleve_id: 3, statut: 'retard', motif: 'sans_motif' },
    ],
  };

  test('201 — Enregistrement d\'un appel complet', async () => {
    mockEnregistrerAppel.mockResolvedValueOnce({ inserted: 3, updated: 0 });

    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('400 — Date invalide', async () => {
    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ ...validPayload, date: 'pas-une-date' });

    expect(res.status).toBe(400);
  });

  test('400 — Statut invalide', async () => {
    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({
        ...validPayload,
        presences: [{ eleve_id: 1, statut: 'statut_invalide' }],
      });

    expect(res.status).toBe(400);
  });

  test('400 — classe_id manquant', async () => {
    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ date: '2025-03-10', presences: [{ eleve_id: 1, statut: 'present' }] });

    expect(res.status).toBe(400);
  });

  test('400 — presences tableau vide', async () => {
    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ classe_id: 1, date: '2025-03-10', presences: [] });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).post('/api/absences/appel').send(validPayload);
    expect(res.status).toBe(401);
  });

  test('403 — Proviseur ne peut pas faire l\'appel', async () => {
    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  test('403 — Classe non assignée à l\'enseignant', async () => {
    const err = new Error('Accès refusé à cette classe');
    err.statusCode = 403;
    mockEnregistrerAppel.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/absences/appel')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });
});
