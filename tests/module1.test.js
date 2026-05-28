'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

afterAll(async () => {
  await pool.end();
});

describe('Module 1 — Authentification', () => {

  describe('POST /api/auth/login', () => {
    test('Login réussi avec credentials valides → retourne token + profil', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nkomo.jeanpaul@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.utilisateur).toBeDefined();
      expect(res.body.utilisateur.email).toBe('nkomo.jeanpaul@lycee-essos.edu');
      expect(res.body.utilisateur.role).toBe('enseignant');
      expect(res.body.utilisateur.etablissement).toBeDefined();
    });

    test('Login échoué — mauvais mot de passe → 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nkomo.jeanpaul@lycee-essos.edu',
          mot_de_passe: 'mauvais_mdp',
          etablissement_id: 1,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Login échoué — email inexistant → 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inconnu@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });

      expect(res.status).toBe(401);
    });

    test('Login échoué — email invalide → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'pas_un_email',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });

      expect(res.status).toBe(400);
    });

    test('Login proviseur réussi', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'onana.paul@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.utilisateur.role).toBe('proviseur');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nkomo.jeanpaul@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });
      token = res.body.token;
    });

    test('Retourne le profil avec token valide', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.utilisateur.email).toBe('nkomo.jeanpaul@lycee-essos.edu');
    });

    test('Retourne 401 sans token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('Retourne 401 avec token invalide', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_bidon');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nkomo.jeanpaul@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });
      token = res.body.token;
    });

    test('Logout réussi → 200', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'fogue.nathalie@lycee-essos.edu',
          mot_de_passe: 'noutong1',
          etablissement_id: 1,
        });
      token = res.body.token;
    });

    test('Changement de mot de passe réussi', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ancien_mot_de_passe: 'noutong1',
          nouveau_mot_de_passe: 'noutong1', // on remet le même pour ne pas casser les autres tests
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Changement échoué — ancien mot de passe incorrect → 400', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ancien_mot_de_passe: 'mauvais_mdp',
          nouveau_mot_de_passe: 'nouveau123',
        });
      expect(res.status).toBe(400);
    });
  });
});
