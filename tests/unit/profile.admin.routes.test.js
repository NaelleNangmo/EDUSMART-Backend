'use strict';

/**
 * Tests unitaires — Routes Profile & Admin (avec mocks DB)
 */

require('../setup');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: mockQuery,
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;
const HASH_NOUTONG1 = bcrypt.hashSync('noutong1', 10);

function tokenFor(role = 'enseignant', id = 1) {
  return jwt.sign({ id, email: 'test@test.cm', role, etablissement_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/profile', () => {

  test('200 — Retourne le profil de l\'utilisateur connecté', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nom: 'NKOMO', prenom: 'Jean-Paul',
        email: 'nkomo@test.cm', role: 'enseignant',
        created_at: new Date(), etablissement_id: 1,
        etablissement_nom: "Lycée Bilingue d'Essos", ville: 'Yaoundé',
      }],
    });

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profil.email).toBe('nkomo@test.cm');
    expect(res.body.profil.role).toBe('enseignant');
  });

  test('404 — Utilisateur non trouvé en DB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(404);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — PUT /api/profile', () => {

  test('200 — Modification du profil réussie', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nom: 'NKOMO', prenom: 'Jean-Paul', email: 'nkomo@test.cm', role: 'enseignant' }],
    });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ nom: 'NKOMO', prenom: 'Jean-Paul' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profil.prenom).toBe('Jean-Paul');
  });

  test('400 — Nom trop court (< 2 chars)', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ nom: 'A' });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).put('/api/profile').send({ nom: 'NKOMO' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/admin/stats', () => {

  test('200 — Retourne les stats globales (proviseur)', async () => {
    // 4 requêtes COUNT dans admin/stats
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '4' }] })   // enseignants
      .mockResolvedValueOnce({ rows: [{ count: '147' }] })  // élèves
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })    // classes
      .mockResolvedValueOnce({ rows: [{ count: '8' }] });   // matières

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.nb_enseignants).toBe(4);
    expect(res.body.stats.nb_eleves).toBe(147);
    expect(res.body.stats.nb_classes).toBe(3);
  });

  test('403 — Enseignant n\'a pas accès aux stats admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`);

    expect(res.status).toBe(403);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/admin/enseignants', () => {

  const validPayload = {
    nom: 'TESTENSEIGNANT',
    prenom: 'Nouveau',
    email: 'nouveau@lycee-essos.edu',
    mot_de_passe: 'motdepasse123',
  };

  test('201 — Création d\'un enseignant réussie', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 99, nom: 'TESTENSEIGNANT', prenom: 'Nouveau', email: 'nouveau@lycee-essos.edu', role: 'enseignant' }],
    });

    const res = await request(app)
      .post('/api/admin/enseignants')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.enseignant.role).toBe('enseignant');
  });

  test('400 — Email invalide', async () => {
    const res = await request(app)
      .post('/api/admin/enseignants')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send({ ...validPayload, email: 'pas_un_email' });

    expect(res.status).toBe(400);
  });

  test('400 — Mot de passe trop court', async () => {
    const res = await request(app)
      .post('/api/admin/enseignants')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send({ ...validPayload, mot_de_passe: '123' });

    expect(res.status).toBe(400);
  });

  test('409 — Email déjà utilisé (contrainte unique)', async () => {
    const err = new Error('duplicate key');
    err.code = '23505';
    mockQuery.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/api/admin/enseignants')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('403 — Enseignant ne peut pas créer un compte', async () => {
    const res = await request(app)
      .post('/api/admin/enseignants')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/admin/classes', () => {

  test('201 — Création d\'une classe réussie', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 10, nom: 'Terminale D Test', niveau: 'Terminale', etablissement_id: 1 }],
    });

    const res = await request(app)
      .post('/api/admin/classes')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send({ nom: 'Terminale D Test', niveau: 'Terminale' });

    expect(res.status).toBe(201);
    expect(res.body.classe.nom).toBe('Terminale D Test');
  });

  test('400 — Nom manquant', async () => {
    const res = await request(app)
      .post('/api/admin/classes')
      .set('Authorization', `Bearer ${tokenFor('proviseur')}`)
      .send({ niveau: 'Terminale' });

    expect(res.status).toBe(400);
  });

  test('403 — Enseignant ne peut pas créer une classe', async () => {
    const res = await request(app)
      .post('/api/admin/classes')
      .set('Authorization', `Bearer ${tokenFor('enseignant')}`)
      .send({ nom: 'Terminale D', niveau: 'Terminale' });

    expect(res.status).toBe(403);
  });
});
