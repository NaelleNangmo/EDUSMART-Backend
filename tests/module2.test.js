'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let token;
let etablissementId;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'nkomo.jeanpaul@lycee-essos.edu',
      mot_de_passe: 'noutong1',
      etablissement_id: 1,
    });
  token = res.body.token;
  etablissementId = res.body.utilisateur.etablissement.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Module 2 — Établissements & Classes', () => {

  describe('GET /api/etablissements', () => {
    test('Retourne la liste des établissements sans token', async () => {
      const res = await request(app).get('/api/etablissements');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.etablissements)).toBe(true);
      expect(res.body.etablissements.length).toBeGreaterThan(0);
    });

    test('Contient le Lycée Bilingue d\'Essos', async () => {
      const res = await request(app).get('/api/etablissements');
      const noms = res.body.etablissements.map((e) => e.nom);
      expect(noms).toContain("Lycée Bilingue d'Essos");
    });
  });

  describe('GET /api/classes/mes-classes', () => {
    test('Retourne les 3 classes de NKOMO', async () => {
      const res = await request(app)
        .get('/api/classes/mes-classes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.classes.length).toBe(3);
    });

    test('Contient Terminale C, Première D, Seconde C', async () => {
      const res = await request(app)
        .get('/api/classes/mes-classes')
        .set('Authorization', `Bearer ${token}`);

      const noms = res.body.classes.map((c) => c.nom);
      expect(noms).toContain('Terminale C');
      expect(noms).toContain('Première D');
      expect(noms).toContain('Seconde C');
    });

    test('Retourne 401 sans token', async () => {
      const res = await request(app).get('/api/classes/mes-classes');
      expect(res.status).toBe(401);
    });

    test('Retourne 403 pour un proviseur (rôle non autorisé)', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'onana.paul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
      const proviseurToken = loginRes.body.token;

      const res = await request(app)
        .get('/api/classes/mes-classes')
        .set('Authorization', `Bearer ${proviseurToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/classes/:id/eleves', () => {
    let classeTermCId;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/classes/mes-classes')
        .set('Authorization', `Bearer ${token}`);
      const termC = res.body.classes.find((c) => c.nom === 'Terminale C');
      classeTermCId = termC.id;
    });

    test('Retourne les 52 élèves de Terminale C', async () => {
      const res = await request(app)
        .get(`/api/classes/${classeTermCId}/eleves`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(52);
    });

    test('Retourne 404 pour une classe inexistante', async () => {
      const res = await request(app)
        .get('/api/classes/99999/eleves')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    test('Retourne 401 sans token', async () => {
      const res = await request(app).get(`/api/classes/${classeTermCId}/eleves`);
      expect(res.status).toBe(401);
    });
  });
});
