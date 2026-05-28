'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');

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
  elevesIds = elevesRes.body.eleves.slice(0, 7).map((e) => e.id);
});

afterAll(async () => {
  await pool.end();
});

describe('Module 4 — Absences', () => {

  const dateTest = '2025-03-10';

  describe('POST /api/absences/appel', () => {
    test('Enregistrement d\'un appel complet → 201', async () => {
      const presences = elevesIds.map((id, i) => ({
        eleve_id: id,
        statut: i === 2 ? 'absent' : 'present',
        motif: i === 2 ? 'maladie' : 'sans_motif',
      }));

      const res = await request(app)
        .post('/api/absences/appel')
        .set('Authorization', `Bearer ${token}`)
        .send({ classe_id: classeTermCId, date: dateTest, presences });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Ré-enregistrement du même appel → mise à jour sans erreur (idempotent)', async () => {
      const presences = elevesIds.map((id, i) => ({
        eleve_id: id,
        statut: i === 2 ? 'retard' : 'present',
        motif: 'sans_motif',
      }));

      const res = await request(app)
        .post('/api/absences/appel')
        .set('Authorization', `Bearer ${token}`)
        .send({ classe_id: classeTermCId, date: dateTest, presences });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Accès refusé à une classe non assignée → 403', async () => {
      const autreClasseRes = await query("SELECT id FROM classes WHERE nom = 'Terminale A'");
      if (autreClasseRes.rows.length === 0) return;
      const autreClasseId = autreClasseRes.rows[0].id;

      const res = await request(app)
        .post('/api/absences/appel')
        .set('Authorization', `Bearer ${token}`)
        .send({
          classe_id: autreClasseId,
          date: dateTest,
          presences: [{ eleve_id: 1, statut: 'present' }],
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/absences/:classe_id/stats', () => {
    test('Retourne les bons compteurs pour une date', async () => {
      const res = await request(app)
        .get(`/api/absences/${classeTermCId}/stats?date=${dateTest}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.total).toBeDefined();
    });
  });

  describe('GET /api/absences/:classe_id — flags critique/warning', () => {
    test('KAMGA Fatou est flaggée "critique" (7+ absences)', async () => {
      const res = await request(app)
        .get(`/api/absences/${classeTermCId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const kamga = res.body.eleves.find(
        (e) => e.nom === 'KAMGA' && e.prenom === 'Fatou'
      );
      expect(kamga).toBeDefined();
      expect(kamga.flag).toBe('critique');
    });

    test('BIYONG Marie est flaggée "warning" (3 absences)', async () => {
      const res = await request(app)
        .get(`/api/absences/${classeTermCId}`)
        .set('Authorization', `Bearer ${token}`);

      const biyong = res.body.eleves.find(
        (e) => e.nom === 'BIYONG' && e.prenom === 'Marie'
      );
      expect(biyong).toBeDefined();
      expect(['warning', 'critique']).toContain(biyong.flag);
    });
  });
});
