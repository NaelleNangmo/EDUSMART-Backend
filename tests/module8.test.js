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

describe('Module 8 — Dashboard', () => {

  describe('GET /api/dashboard/enseignant', () => {
    test('Retourne tous les champs attendus', async () => {
      const res = await request(app)
        .get('/api/dashboard/enseignant')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.utilisateur).toBeDefined();
      expect(res.body.kpis).toBeDefined();
      expect(res.body.avancement_saisie).toBeDefined();
      expect(res.body.activite_recente).toBeDefined();
    });

    test('KPIs contiennent les champs requis', async () => {
      const res = await request(app)
        .get('/api/dashboard/enseignant')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      const { kpis } = res.body;
      expect(kpis.nb_eleves).toBeDefined();
      expect(kpis.moyenne_generale).toBeDefined();
      expect(kpis.absences_non_justifiees).toBeDefined();
      expect(kpis.messages_non_lus).toBeDefined();
    });

    test('nb_eleves correspond aux données seedées (147)', async () => {
      const res = await request(app)
        .get('/api/dashboard/enseignant')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.body.kpis.nb_eleves).toBe(147);
    });

    test('Avancement saisie contient les 3 classes de NKOMO', async () => {
      const res = await request(app)
        .get('/api/dashboard/enseignant')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.body.avancement_saisie.length).toBe(3);
      const noms = res.body.avancement_saisie.map((c) => c.classe_nom);
      expect(noms).toContain('Terminale C');
      expect(noms).toContain('Première D');
      expect(noms).toContain('Seconde C');
    });

    test('Retourne 403 pour un proviseur', async () => {
      const res = await request(app)
        .get('/api/dashboard/enseignant')
        .set('Authorization', `Bearer ${tokenProviseur}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/admin', () => {
    test('Retourne les KPIs admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(res.status).toBe(200);
      expect(res.body.kpis.nb_enseignants).toBeGreaterThanOrEqual(4);
      expect(res.body.kpis.nb_eleves).toBeGreaterThanOrEqual(147);
    });

    test('Retourne 403 pour un enseignant', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${tokenNkomo}`);
      expect(res.status).toBe(403);
    });
  });
});
