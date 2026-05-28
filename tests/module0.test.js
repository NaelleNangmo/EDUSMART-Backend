'use strict';

require('./setup');

const { pool, testConnection, query } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

afterAll(async () => {
  await pool.end();
});

describe('Module 0 — Infrastructure & Base de données', () => {

  describe('Connexion PostgreSQL', () => {
    test('La connexion à la base de données réussit', async () => {
      const connected = await testConnection();
      expect(connected).toBe(true);
    });

    test('Une requête simple retourne un résultat', async () => {
      const result = await query('SELECT 1 + 1 AS sum');
      expect(result.rows[0].sum).toBe(2);
    });
  });

  describe('Tables existantes après migration', () => {
    const tables = [
      'etablissements', 'utilisateurs', 'classes', 'matieres',
      'enseignant_classes', 'eleves', 'evaluations', 'notes',
      'absences', 'appreciations', 'messages',
    ];

    test.each(tables)('La table "%s" existe', async (tableName) => {
      const result = await query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        [tableName]
      );
      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Données de seed', () => {
    test('L\'établissement Lycée Bilingue d\'Essos existe', async () => {
      const result = await query(
        "SELECT id FROM etablissements WHERE nom = 'Lycée Bilingue d''Essos'"
      );
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('L\'utilisateur NKOMO Jean-Paul existe', async () => {
      const result = await query(
        "SELECT id, role FROM utilisateurs WHERE email = 'nkomo.jeanpaul@lycee-essos.edu'"
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].role).toBe('enseignant');
    });

    test('Le proviseur ONANA Paul existe', async () => {
      const result = await query(
        "SELECT id, role FROM utilisateurs WHERE email = 'onana.paul@lycee-essos.edu'"
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].role).toBe('proviseur');
    });

    test('La Terminale C a 52 élèves', async () => {
      const result = await query(
        `SELECT COUNT(*) AS nb FROM eleves el
         JOIN classes c ON c.id = el.classe_id
         WHERE c.nom = 'Terminale C'`
      );
      expect(parseInt(result.rows[0].nb, 10)).toBe(52);
    });

    test('La Première D a 48 élèves', async () => {
      const result = await query(
        `SELECT COUNT(*) AS nb FROM eleves el
         JOIN classes c ON c.id = el.classe_id
         WHERE c.nom = 'Première D'`
      );
      expect(parseInt(result.rows[0].nb, 10)).toBe(48);
    });

    test('La Seconde C a 47 élèves', async () => {
      const result = await query(
        `SELECT COUNT(*) AS nb FROM eleves el
         JOIN classes c ON c.id = el.classe_id
         WHERE c.nom = 'Seconde C'`
      );
      expect(parseInt(result.rows[0].nb, 10)).toBe(47);
    });

    test('ABANDA Etienne a le matricule MAT-2024-001', async () => {
      const result = await query(
        "SELECT matricule FROM eleves WHERE nom = 'ABANDA' AND prenom = 'Etienne'"
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].matricule).toBe('MAT-2024-001');
    });

    test('KAMGA Fatou a au moins 7 absences', async () => {
      const result = await query(
        `SELECT COUNT(*) AS nb FROM absences a
         JOIN eleves el ON el.id = a.eleve_id
         WHERE el.nom = 'KAMGA' AND el.prenom = 'Fatou' AND a.statut = 'absent'`
      );
      expect(parseInt(result.rows[0].nb, 10)).toBeGreaterThanOrEqual(7);
    });

    test('34 appréciations existent pour Terminale C T2 (au moins)', async () => {
      const result = await query(
        `SELECT COUNT(*) AS nb FROM appreciations ap
         JOIN classes c ON c.id = ap.classe_id
         WHERE c.nom = 'Terminale C' AND ap.trimestre = 2`
      );
      expect(parseInt(result.rows[0].nb, 10)).toBeGreaterThanOrEqual(34);
    });
  });

  describe('Middleware verifyToken', () => {
    const { verifyToken } = require('../src/middleware/auth');

    function mockReqRes(token) {
      const req = { headers: { authorization: token ? `Bearer ${token}` : undefined } };
      const res = {};
      return { req, res };
    }

    test('Rejette une requête sans token avec 401', (done) => {
      const { req, res } = mockReqRes(null);
      verifyToken(req, res, (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });

    test('Rejette un token invalide avec 401', (done) => {
      const { req, res } = mockReqRes('token_invalide_xyz');
      verifyToken(req, res, (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });

    test('Accepte un token valide et injecte req.user', (done) => {
      const payload = { id: 1, email: 'test@test.com', role: 'enseignant', etablissement_id: 1 };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
      const { req, res } = mockReqRes(token);
      verifyToken(req, res, (err) => {
        expect(err).toBeUndefined();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(1);
        expect(req.user.role).toBe('enseignant');
        done();
      });
    });

    test('Rejette un token expiré avec 401', (done) => {
      const payload = { id: 1, email: 'test@test.com', role: 'enseignant', etablissement_id: 1 };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '-1s' });
      const { req, res } = mockReqRes(token);
      verifyToken(req, res, (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });
  });
});
