'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');

let token;
let classeTermCId;
let evalId;

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
});

afterAll(async () => {
  await pool.end();
});

describe('Module 3 — Notes & Évaluations', () => {

  describe('POST /api/evaluations', () => {
    test('Crée une évaluation valide → 201', async () => {
      // Récupérer matiere_id
      const matRes = await query("SELECT id FROM matieres WHERE nom = 'Mathématiques'");
      const matiereId = matRes.rows[0].id;

      const res = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Interrogation',
          numero: 2,
          coefficient: 1,
          date: '2025-02-01',
          classe_id: classeTermCId,
          matiere_id: matiereId,
          trimestre: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      evalId = res.body.evaluation.id;
    });

    test('Rejette un type invalide → 400', async () => {
      const matRes = await query("SELECT id FROM matieres WHERE nom = 'Mathématiques'");
      const res = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'TypeInvalide',
          numero: 1,
          coefficient: 1,
          date: '2025-02-01',
          classe_id: classeTermCId,
          matiere_id: matRes.rows[0].id,
          trimestre: 2,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/notes (bulk)', () => {
    let elevesIds;

    beforeAll(async () => {
      const res = await request(app)
        .get(`/api/classes/${classeTermCId}/eleves`)
        .set('Authorization', `Bearer ${token}`);
      elevesIds = res.body.eleves.slice(0, 5).map((e) => e.id);
    });

    test('Saisie d\'un lot de notes valides → 201', async () => {
      const notes = elevesIds.map((id, i) => ({ eleve_id: id, valeur: 10 + i }));
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ evaluation_id: evalId, notes });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Note hors plage [0-20] → 400', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          evaluation_id: evalId,
          notes: [{ eleve_id: elevesIds[0], valeur: 25 }],
        });
      expect(res.status).toBe(400);
    });

    test('Enseignant sans droits sur la classe → 403', async () => {
      // Créer une classe non assignée à NKOMO
      const autreClasseRes = await query(
        "SELECT id FROM classes WHERE nom = 'Terminale A'"
      );
      if (autreClasseRes.rows.length === 0) return;
      const autreClasseId = autreClasseRes.rows[0].id;

      const matRes = await query("SELECT id FROM matieres WHERE nom = 'Mathématiques'");
      const res = await request(app)
        .post('/api/evaluations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'DS',
          numero: 1,
          coefficient: 2,
          date: '2025-02-01',
          classe_id: autreClasseId,
          matiere_id: matRes.rows[0].id,
          trimestre: 2,
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/notes/:classe_id/stats', () => {
    test('Retourne les statistiques correctes', async () => {
      const res = await request(app)
        .get(`/api/notes/${classeTermCId}/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.nb_eleves).toBeDefined();
      expect(res.body.stats.moyenne_classe).toBeDefined();
    });

    test('La meilleure note est >= la moyenne', async () => {
      const res = await request(app)
        .get(`/api/notes/${classeTermCId}/stats`)
        .set('Authorization', `Bearer ${token}`);

      const { meilleure_note, moyenne_classe } = res.body.stats;
      if (meilleure_note && moyenne_classe) {
        expect(parseFloat(meilleure_note)).toBeGreaterThanOrEqual(parseFloat(moyenne_classe));
      }
    });
  });

  describe('GET /api/notes/:classe_id', () => {
    test('Retourne les élèves classés par moyenne décroissante', async () => {
      const res = await request(app)
        .get(`/api/notes/${classeTermCId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const eleves = res.body.eleves;
      for (let i = 1; i < eleves.length; i++) {
        const prev = parseFloat(eleves[i - 1].moyenne_generale) || 0;
        const curr = parseFloat(eleves[i].moyenne_generale) || 0;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });
});
