'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let token;
let classeTermCId;
let elevesIds;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
  token = loginRes.body.token;

  const classesRes = await request(app)
    .get('/api/classes/mes-classes')
    .set('Authorization', `Bearer ${token}`);
  const termC = classesRes.body.classes.find((c) => c.nom === 'Terminale C');
  classeTermCId = termC.id;

  const elevesRes = await request(app)
    .get(`/api/classes/${classeTermCId}/eleves`)
    .set('Authorization', `Bearer ${token}`);
  elevesIds = elevesRes.body.eleves.map((e) => e.id);
});

afterAll(async () => {
  await pool.end();
});

describe('Module 5 — Appréciations', () => {

  describe('GET /api/appreciations/:classe_id', () => {
    test('Retourne la liste des élèves avec statuts corrects', async () => {
      const res = await request(app)
        .get(`/api/appreciations/${classeTermCId}?trimestre=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.eleves)).toBe(true);
      expect(res.body.eleves.length).toBe(52);
    });

    test('Les statuts sont "redigee" ou "en_attente"', async () => {
      const res = await request(app)
        .get(`/api/appreciations/${classeTermCId}?trimestre=2`)
        .set('Authorization', `Bearer ${token}`);

      res.body.eleves.forEach((e) => {
        expect(['redigee', 'en_attente']).toContain(e.statut);
      });
    });

    test('34 appréciations sont rédigées pour Terminale C T2 (au moins)', async () => {
      const res = await request(app)
        .get(`/api/appreciations/${classeTermCId}?trimestre=2`)
        .set('Authorization', `Bearer ${token}`);

      const redigees = res.body.eleves.filter((e) => e.statut === 'redigee');
      expect(redigees.length).toBeGreaterThanOrEqual(34);
    });
  });

  describe('GET /api/appreciations/:classe_id/stats', () => {
    test('Stats de progression correctes (au moins 34/52)', async () => {
      const res = await request(app)
        .get(`/api/appreciations/${classeTermCId}/stats?trimestre=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.total).toBe(52);
      expect(res.body.stats.redigees).toBeGreaterThanOrEqual(34);
      expect(res.body.stats.en_attente).toBeLessThanOrEqual(18);
      expect(res.body.stats.pourcentage).toBeGreaterThanOrEqual(65);
    });
  });

  describe('POST /api/appreciations', () => {
    test('Création d\'une appréciation → 201', async () => {
      // Prendre un élève sans appréciation (index 40+)
      const eleveId = elevesIds[40];
      const res = await request(app)
        .post('/api/appreciations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eleve_id: eleveId,
          classe_id: classeTermCId,
          trimestre: 2,
          texte: 'Élève sérieux, bons résultats ce trimestre.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.appreciation.texte).toBe('Élève sérieux, bons résultats ce trimestre.');
    });

    test('Double création → mise à jour sans erreur (upsert)', async () => {
      const eleveId = elevesIds[41];

      // Première création
      await request(app)
        .post('/api/appreciations')
        .set('Authorization', `Bearer ${token}`)
        .send({ eleve_id: eleveId, classe_id: classeTermCId, trimestre: 2, texte: 'Premier texte.' });

      // Deuxième création (même élève/classe/trimestre)
      const res = await request(app)
        .post('/api/appreciations')
        .set('Authorization', `Bearer ${token}`)
        .send({ eleve_id: eleveId, classe_id: classeTermCId, trimestre: 2, texte: 'Texte mis à jour.' });

      expect(res.status).toBe(201);
      expect(res.body.appreciation.texte).toBe('Texte mis à jour.');
    });
  });

  describe('PUT /api/appreciations/:id', () => {
    test('Modification d\'une appréciation existante → 200', async () => {
      // Récupérer une appréciation existante
      const listRes = await request(app)
        .get(`/api/appreciations/${classeTermCId}?trimestre=2`)
        .set('Authorization', `Bearer ${token}`);

      const redigee = listRes.body.eleves.find((e) => e.statut === 'redigee');
      expect(redigee).toBeDefined();

      const res = await request(app)
        .put(`/api/appreciations/${redigee.appreciation_id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ texte: 'Appréciation modifiée avec succès.' });

      expect(res.status).toBe(200);
      expect(res.body.appreciation.texte).toBe('Appréciation modifiée avec succès.');
    });
  });
});
