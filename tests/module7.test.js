'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let tokenNkomo;
let tokenProviseur;

beforeAll(async () => {
  const r1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
  tokenNkomo = r1.body.token;

  const r2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'onana.paul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
  tokenProviseur = r2.body.token;
});

afterAll(async () => {
  await pool.end();
});

describe('Module 7 — Profil & Administration', () => {

  describe('GET /api/profile', () => {
    test('Retourne le profil complet de NKOMO', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profil.email).toBe('nkomo.jeanpaul@lycee-essos.edu');
      expect(res.body.profil.role).toBe('enseignant');
      expect(res.body.profil.etablissement_nom).toBeDefined();
    });

    test('Retourne 401 sans token', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/profile', () => {
    test('Modification du profil → 200', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${tokenNkomo}`)
        .send({ nom: 'NKOMO', prenom: 'Jean-Paul' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profil.prenom).toBe('Jean-Paul');
    });
  });

  describe('GET /api/admin/stats', () => {
    test('Retourne les stats globales de l\'établissement', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.nb_enseignants).toBeGreaterThanOrEqual(3);
      expect(res.body.stats.nb_eleves).toBeGreaterThanOrEqual(147);
      expect(res.body.stats.nb_classes).toBeGreaterThanOrEqual(3);
    });

    test('Accès admin par un enseignant → 403', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${tokenNkomo}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/alertes', () => {
    test('Retourne les alertes de l\'établissement', async () => {
      const res = await request(app)
        .get('/api/admin/alertes')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.alertes)).toBe(true);
      expect(res.body.alertes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/admin/enseignants', () => {
    test('Retourne la liste des enseignants', async () => {
      const res = await request(app)
        .get('/api/admin/enseignants')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.enseignants)).toBe(true);
      expect(res.body.enseignants.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/admin/enseignants', () => {
    test('Crée un nouveau compte enseignant → 201', async () => {
      const res = await request(app)
        .post('/api/admin/enseignants')
        .set('Authorization', `Bearer ${tokenProviseur}`)
        .send({
          nom: 'TESTENSEIGNANT',
          prenom: 'Nouveau',
          email: `test.enseignant.${Date.now()}@lycee-essos.edu`,
          mot_de_passe: 'motdepasse123',
        });

      expect(res.status).toBe(201);
      expect(res.body.enseignant.role).toBe('enseignant');
    });
  });

  describe('POST /api/admin/classes', () => {
    test('Crée une nouvelle classe → 201', async () => {
      const res = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${tokenProviseur}`)
        .send({ nom: 'Terminale D Test', niveau: 'Terminale' });

      expect(res.status).toBe(201);
      expect(res.body.classe.nom).toBe('Terminale D Test');
    });
  });
});
