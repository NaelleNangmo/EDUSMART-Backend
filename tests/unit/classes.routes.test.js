'use strict';

/**
 * Tests unitaires — Routes Classes (avec mocks DB)
 * GET /api/classes, GET /api/classes/mes-classes, GET /api/classes/:id/eleves
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

// Mock du service classes
const mockGetClassesByEtablissement = jest.fn();
const mockGetMesClasses = jest.fn();
const mockGetClasseById = jest.fn();
const mockGetElevesByClasse = jest.fn();

jest.mock('../../src/modules/classes/classes.service', () => ({
  getClassesByEtablissement: mockGetClassesByEtablissement,
  getMesClasses: mockGetMesClasses,
  getClasseById: mockGetClasseById,
  getElevesByClasse: mockGetElevesByClasse,
}));

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;

function tokenFor(role = 'enseignant', id = 1) {
  return jwt.sign({ id, email: 'test@test.cm', role, etablissement_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

const MOCK_CLASSES = [
  { id: 1, nom: 'Terminale C', niveau: 'Terminale', nb_eleves: 52 },
  { id: 2, nom: 'Première D', niveau: 'Première', nb_eleves: 48 },
  { id: 3, nom: 'Seconde C', niveau: 'Seconde', nb_eleves: 47 },
];

const MOCK_ELEVES = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1, nom: `ELEVE${i}`, prenom: `Prenom${i}`, matricule: `MAT-${i}`,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/classes/mes-classes', () => {

  test('200 — Retourne les classes de l\'enseignant', async () => {
    mockGetMesClasses.mockResolvedValueOnce(MOCK_CLASSES);
    const res = await request(app)
      .get('/api/classes/mes-classes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.classes).toHaveLength(3);
    expect(mockGetMesClasses).toHaveBeenCalledWith(1);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/classes/mes-classes');
    expect(res.status).toBe(401);
  });

  test('403 — Proviseur n\'a pas accès à mes-classes', async () => {
    const res = await request(app)
      .get('/api/classes/mes-classes')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`);
    expect(res.status).toBe(403);
  });

  test('500 — Erreur service propagée', async () => {
    mockGetMesClasses.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/classes/mes-classes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/classes', () => {

  test('200 — Retourne toutes les classes de l\'établissement', async () => {
    mockGetClassesByEtablissement.mockResolvedValueOnce(MOCK_CLASSES);
    const res = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.classes)).toBe(true);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/classes/:id/eleves', () => {

  test('200 — Retourne les élèves avec pagination', async () => {
    mockGetElevesByClasse.mockResolvedValueOnce({
      eleves: MOCK_ELEVES,
      pagination: { total: 5, page: 1, limit: 100, pages: 1 },
    });

    const res = await request(app)
      .get('/api/classes/1/eleves')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.eleves).toHaveLength(5);
    expect(res.body.pagination.total).toBe(5);
  });

  test('404 — Classe inexistante', async () => {
    const err = new Error('Classe non trouvée');
    err.statusCode = 404;
    mockGetElevesByClasse.mockRejectedValueOnce(err);

    const res = await request(app)
      .get('/api/classes/99999/eleves')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(404);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/classes/1/eleves');
    expect(res.status).toBe(401);
  });

  test('Pagination par défaut : page=1, limit=100', async () => {
    mockGetElevesByClasse.mockResolvedValueOnce({ eleves: [], pagination: { total: 0 } });
    await request(app)
      .get('/api/classes/1/eleves')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(mockGetElevesByClasse).toHaveBeenCalledWith(1, 1, 100);
  });
});
