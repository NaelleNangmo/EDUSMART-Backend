'use strict';

/**
 * Tests unitaires — Routes Messagerie (avec mocks DB)
 */

require('../setup');

const jwt = require('jsonwebtoken');
const request = require('supertest');

const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: mockQuery,
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const mockGetUnreadCount = jest.fn();
const mockGetInbox = jest.fn();
const mockGetSent = jest.fn();
const mockGetMessageById = jest.fn();
const mockSendMessage = jest.fn();
const mockDeleteMessage = jest.fn();

jest.mock('../../src/modules/messagerie/messages.service', () => ({
  getUnreadCount: mockGetUnreadCount,
  getInbox: mockGetInbox,
  getSent: mockGetSent,
  getMessageById: mockGetMessageById,
  sendMessage: mockSendMessage,
  deleteMessage: mockDeleteMessage,
}));

const app = require('../../src/app');
const JWT_SECRET = process.env.JWT_SECRET;

function tokenFor(role = 'enseignant', id = 1) {
  return jwt.sign({ id, email: 'test@test.cm', role, etablissement_id: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/messages/unread-count', () => {

  test('200 — Retourne le nombre de messages non lus', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(3);

    const res = await request(app)
      .get('/api/messages/unread-count')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
  });

  test('200 — Retourne 0 si aucun message non lu', async () => {
    mockGetUnreadCount.mockResolvedValueOnce(0);

    const res = await request(app)
      .get('/api/messages/unread-count')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.body.count).toBe(0);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/messages/unread-count');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/messages/inbox', () => {

  test('200 — Retourne la boîte de réception', async () => {
    mockGetInbox.mockResolvedValueOnce({
      messages: [
        { id: 1, objet: 'Test', corps: 'Corps', lu: false, expediteur_nom: 'ONANA' },
      ],
      pagination: { total: 1, page: 1 },
    });

    const res = await request(app)
      .get('/api/messages/inbox')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/messages/inbox');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — POST /api/messages', () => {

  const validPayload = {
    destinataire_id: 2,
    objet: 'Sujet du message',
    corps: 'Corps du message de test.',
  };

  test('201 — Envoi d\'un message valide', async () => {
    mockSendMessage.mockResolvedValueOnce({
      id: 10, objet: 'Sujet du message', corps: 'Corps du message de test.', lu: false,
    });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message.objet).toBe('Sujet du message');
  });

  test('400 — Objet manquant', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ destinataire_id: 2, corps: 'Corps sans objet.' });

    expect(res.status).toBe(400);
  });

  test('400 — Corps manquant', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ destinataire_id: 2, objet: 'Objet sans corps' });

    expect(res.status).toBe(400);
  });

  test('400 — destinataire_id manquant', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ objet: 'Test', corps: 'Corps' });

    expect(res.status).toBe(400);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).post('/api/messages').send(validPayload);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — GET /api/messages/:id', () => {

  test('200 — Retourne le message et le marque lu', async () => {
    mockGetMessageById.mockResolvedValueOnce({
      id: 1, objet: 'Test', corps: 'Corps', lu: true,
    });

    const res = await request(app)
      .get('/api/messages/1')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.message.lu).toBe(true);
  });

  test('403 — Accès au message d\'un autre utilisateur', async () => {
    const err = new Error('Accès refusé');
    err.statusCode = 403;
    mockGetMessageById.mockRejectedValueOnce(err);

    const res = await request(app)
      .get('/api/messages/99')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(403);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).get('/api/messages/1');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Routes API — DELETE /api/messages/:id', () => {

  test('200 — Suppression réussie', async () => {
    mockDeleteMessage.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .delete('/api/messages/1')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('401 — Sans token', async () => {
    const res = await request(app).delete('/api/messages/1');
    expect(res.status).toBe(401);
  });
});
