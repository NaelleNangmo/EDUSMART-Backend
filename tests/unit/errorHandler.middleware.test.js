'use strict';

/**
 * Tests unitaires — Middleware errorHandler & createError
 * Aucune dépendance PostgreSQL
 */

require('../setup');

jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: jest.fn(),
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const { errorHandler, notFound, createError } = require('../../src/middleware/errorHandler');

function buildRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function buildReq(method = 'GET', url = '/api/test') {
  return { method, originalUrl: url };
}

// ─────────────────────────────────────────────────────────────
describe('createError', () => {
  test('Crée une erreur avec le bon message et statusCode', () => {
    const err = createError('Ressource introuvable', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Ressource introuvable');
    expect(err.statusCode).toBe(404);
  });

  test('Utilise 500 comme statusCode par défaut', () => {
    const err = createError('Erreur serveur');
    expect(err.statusCode).toBe(500);
  });

  test('Crée une erreur 401 correctement', () => {
    const err = createError('Non autorisé', 401);
    expect(err.statusCode).toBe(401);
  });

  test('Crée une erreur 403 correctement', () => {
    const err = createError('Accès refusé', 403);
    expect(err.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
describe('errorHandler middleware', () => {
  test('Retourne le statusCode de l\'erreur', () => {
    const err = createError('Non trouvé', 404);
    const res = buildRes();
    errorHandler(err, buildReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Retourne success: false dans le body', () => {
    const err = createError('Erreur test', 400);
    const res = buildRes();
    errorHandler(err, buildReq(), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Erreur test' })
    );
  });

  test('Utilise 500 si statusCode absent', () => {
    const err = new Error('Erreur générique');
    const res = buildRes();
    errorHandler(err, buildReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('Utilise err.status si err.statusCode absent', () => {
    const err = new Error('Erreur express');
    err.status = 422;
    const res = buildRes();
    errorHandler(err, buildReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
  });

  test('Retourne un message par défaut si err.message absent', () => {
    const err = {};
    const res = buildRes();
    errorHandler(err, buildReq(), res, jest.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erreur interne du serveur' })
    );
  });
});

// ─────────────────────────────────────────────────────────────
describe('notFound middleware', () => {
  test('Retourne 404 avec success: false', () => {
    const res = buildRes();
    notFound(buildReq('GET', '/api/inexistant'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test('Le message mentionne la méthode et l\'URL', () => {
    const res = buildRes();
    notFound(buildReq('POST', '/api/unknown'), res);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toMatch(/POST/);
    expect(body.message).toMatch(/\/api\/unknown/);
  });
});
