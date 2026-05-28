'use strict';

require('./setup');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let tokenNkomo;
let tokenProviseur;
let proviseurId;
let nkomoId;
let messageId;

beforeAll(async () => {
  const r1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nkomo.jeanpaul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
  tokenNkomo = r1.body.token;
  nkomoId = r1.body.utilisateur.id;

  const r2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'onana.paul@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
  tokenProviseur = r2.body.token;
  proviseurId = r2.body.utilisateur.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Module 6 — Messagerie', () => {

  describe('POST /api/messages', () => {
    test('Envoi d\'un message → 201', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tokenNkomo}`)
        .send({
          destinataire_id: proviseurId,
          objet: 'Test message depuis Jest',
          corps: 'Ceci est un message de test automatisé.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message.objet).toBe('Test message depuis Jest');
      messageId = res.body.message.id;
    });

    test('Envoi sans objet → 400', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tokenNkomo}`)
        .send({ destinataire_id: proviseurId, corps: 'Corps sans objet.' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/messages/inbox', () => {
    test('Le proviseur reçoit le message dans sa boîte', async () => {
      const res = await request(app)
        .get('/api/messages/inbox')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.messages)).toBe(true);
      const found = res.body.messages.find((m) => m.objet === 'Test message depuis Jest');
      expect(found).toBeDefined();
    });

    test('NKOMO a des messages dans sa boîte (seedés)', async () => {
      const res = await request(app)
        .get('/api/messages/inbox')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/messages/unread-count', () => {
    test('Count non lus est un nombre >= 0', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(0);
    });

    test('Envoyer un message augmente le count du destinataire', async () => {
      // Compter avant
      const before = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenProviseur}`);
      const countBefore = before.body.count;

      // Envoyer un message au proviseur
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tokenNkomo}`)
        .send({ destinataire_id: proviseurId, objet: 'Test count', corps: 'Test.' });

      // Compter après
      const after = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenProviseur}`);

      expect(after.body.count).toBe(countBefore + 1);
    });
  });

  describe('GET /api/messages/:id', () => {
    test('Message marqué lu après GET /id', async () => {
      // Récupérer un message non lu de NKOMO
      const inboxRes = await request(app)
        .get('/api/messages/inbox')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      const unread = inboxRes.body.messages.find((m) => m.lu === false);
      expect(unread).toBeDefined();

      // Lire le message
      const readRes = await request(app)
        .get(`/api/messages/${unread.id}`)
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.message.lu).toBe(true);

      // Vérifier que le count a diminué
      const countRes = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${tokenNkomo}`);
      // Le count doit être inférieur à 3 maintenant
      expect(countRes.body.count).toBeLessThan(3);
    });

    test('Accès au message d\'un autre utilisateur → 403', async () => {
      // NKOMO essaie de lire un message envoyé entre deux autres utilisateurs
      // On envoie un message du proviseur à MBIDA
      const mbidaLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'mbida.emmanuel@lycee-essos.edu', mot_de_passe: 'noutong1', etablissement_id: 1 });
      const mbidaId = mbidaLogin.body.utilisateur.id;

      const sendRes = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tokenProviseur}`)
        .send({ destinataire_id: mbidaId, objet: 'Message privé', corps: 'Pour MBIDA seulement.' });

      const privateMessageId = sendRes.body.message.id;

      // NKOMO tente de lire ce message
      const res = await request(app)
        .get(`/api/messages/${privateMessageId}`)
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    test('Suppression d\'un message → 200', async () => {
      // Envoyer un message à supprimer
      const sendRes = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tokenNkomo}`)
        .send({ destinataire_id: proviseurId, objet: 'À supprimer', corps: 'Ce message sera supprimé.' });

      const idToDelete = sendRes.body.message.id;

      const res = await request(app)
        .delete(`/api/messages/${idToDelete}`)
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/utilisateurs/contacts', () => {
    test('Retourne les contacts de l\'établissement', async () => {
      const res = await request(app)
        .get('/api/utilisateurs/contacts')
        .set('Authorization', `Bearer ${tokenNkomo}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.contacts)).toBe(true);
      expect(res.body.contacts.length).toBeGreaterThan(0);
      // NKOMO ne doit pas être dans ses propres contacts
      const self = res.body.contacts.find((c) => c.email === 'nkomo.jeanpaul@lycee-essos.edu');
      expect(self).toBeUndefined();
    });
  });
});
