'use strict';

/**
 * Tests unitaires — Routes Auth (avec mocks DB complets)
 * Teste les routes /api/auth/* sans connexion PostgreSQL réelle
 */

require('../setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Mock complet de la base de données ────────────────────────
const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: mockQuery,
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;

// ── Données de test ───────────────────────────────────────────
const HASH_NOUTONG1 = bcrypt.hashSync('noutong1', 10);

const MOCK_USER = {
  id: 1,
  nom: 'NKOMO',
  prenom: 'Jean-Paul',
  email: 'nkomo.jeanpaul@lycee-essos.edu',
  mot_de_passe: HASH_NOUTONG1,
  role: 'enseignant',
  etablissement_id: 1,
  etablissement_nom: "Lycée Bilingue d'Essos",
  etablissement_ville: 'Yaoundé',
};

function validToken(user = MOCK_USER) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, etablissement_id: user.etablissement_id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/auth/login', () => {

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('200 — Login réussi avec credentials valides', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.utilisateur.email).toBe('nkomo.jeanpaul@lycee-essos.edu');
    expect(res.body.utilisateur.role).toBe('enseignant');
    expect(res.body.utilisateur.etablissement).toBeDefined();
    // Le mot de passe ne doit JAMAIS être retourné
    expect(res.body.utilisateur.mot_de_passe).toBeUndefined();
  });

  test('401 — Utilisateur inexistant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('401 — Mauvais mot de passe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'mauvais_mdp', etablissement_id: 1 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('400 — Email invalide (validation express-validator)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pas_un_email', mot_de_passe: 'noutong1', etablissement_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — etablissement_id manquant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nkomo@test.cm', mot_de_passe: 'noutong1' });

    expect(res.status).toBe(400);
  });

  test('400 — mot_de_passe manquant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nkomo@test.cm', etablissement_id: 1 });

    expect(res.status).toBe(400);
  });

  test('Le token retourné est un JWT valide', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.id).toBe(MOCK_USER.id);
    expect(decoded.role).toBe('enseignant');
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/auth/me', () => {

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('200 — Retourne le profil avec token valide', async () => {
    const token = validToken();
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nom: 'NKOMO', prenom: 'Jean-Paul',
        email: 'nkomo.jeanpaul@lycee-essos.edu', role: 'enseignant',
        created_at: new Date(),
        etablissement_id: 1, etablissement_nom: "Lycée Bilingue d'Essos", etablissement_ville: 'Yaoundé',
      }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.utilisateur.email).toBe('nkomo.jeanpaul@lycee-essos.edu');
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('401 — Token invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token_bidon_xyz');
    expect(res.status).toBe(401);
  });

  test('401 — Token expiré', async () => {
    const token = jwt.sign(
      { id: 1, email: 'test@test.cm', role: 'enseignant', etablissement_id: 1 },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/auth/logout', () => {

  test('200 — Logout réussi avec token valide', async () => {
    const token = validToken();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('401 — Logout sans token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — PUT /api/auth/change-password', () => {

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('200 — Changement de mot de passe réussi', async () => {
    const token = validToken();
    // Mock: récupération user avec hash
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, mot_de_passe: HASH_NOUTONG1 }] });
    // Mock: UPDATE
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ ancien_mot_de_passe: 'noutong1', nouveau_mot_de_passe: 'nouveau123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('400 — Ancien mot de passe incorrect', async () => {
    const token = validToken();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, mot_de_passe: HASH_NOUTONG1 }] });

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ ancien_mot_de_passe: 'mauvais_mdp', nouveau_mot_de_passe: 'nouveau123' });

    expect(res.status).toBe(400);
  });

  test('400 — Nouveau mot de passe trop court (< 6 chars)', async () => {
    const token = validToken();

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ ancien_mot_de_passe: 'noutong1', nouveau_mot_de_passe: '123' });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ ancien_mot_de_passe: 'noutong1', nouveau_mot_de_passe: 'nouveau123' });
    expect(res.status).toBe(401);
  });
});
