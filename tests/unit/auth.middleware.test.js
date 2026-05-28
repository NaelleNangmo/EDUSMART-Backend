'use strict';

/**
 * Tests unitaires — Middleware d'authentification
 * Ces tests n'ont PAS besoin de PostgreSQL (mocks complets)
 */

require('../setup');

const jwt = require('jsonwebtoken');

// ── Mock du module db pour éviter toute connexion PostgreSQL ──
jest.mock('../../src/config/db', () => ({
  pool: { end: jest.fn().mockResolvedValue(undefined) },
  query: jest.fn(),
  getClient: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
}));

const { verifyToken, requireRole } = require('../../src/middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// ── Helpers ───────────────────────────────────────────────────
function buildReq(token) {
  return {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
  };
}

function buildRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', ...options });
}

// ─────────────────────────────────────────────────────────────
describe('Middleware — verifyToken', () => {

  describe('Cas d\'erreur — token absent ou malformé', () => {
    test('Rejette une requête sans header Authorization → err.statusCode 401', (done) => {
      const req = buildReq(null);
      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        expect(err.message).toMatch(/manquant/i);
        done();
      });
    });

    test('Rejette un header sans préfixe Bearer → err.statusCode 401', (done) => {
      const req = { headers: { authorization: 'Basic abc123' } };
      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });

    test('Rejette un token invalide (chaîne aléatoire) → err.statusCode 401', (done) => {
      const req = buildReq('token_invalide_xyz_123');
      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });

    test('Rejette un token expiré → err.statusCode 401', (done) => {
      const token = signToken(
        { id: 1, email: 'test@test.com', role: 'enseignant', etablissement_id: 1 },
        { expiresIn: '-1s' }
      );
      const req = buildReq(token);
      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        expect(err.message).toMatch(/expir/i);
        done();
      });
    });

    test('Rejette un token signé avec un mauvais secret → err.statusCode 401', (done) => {
      const token = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'enseignant', etablissement_id: 1 },
        'mauvais_secret_xyz'
      );
      const req = buildReq(token);
      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
        done();
      });
    });
  });

  describe('Cas de succès — token valide', () => {
    test('Accepte un token valide et injecte req.user', (done) => {
      const payload = { id: 42, email: 'nkomo@test.cm', role: 'enseignant', etablissement_id: 1 };
      const token = signToken(payload);
      const req = buildReq(token);

      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeUndefined();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(42);
        expect(req.user.email).toBe('nkomo@test.cm');
        expect(req.user.role).toBe('enseignant');
        expect(req.user.etablissement_id).toBe(1);
        done();
      });
    });

    test('Accepte un token proviseur et injecte le bon rôle', (done) => {
      const payload = { id: 10, email: 'proviseur@test.cm', role: 'proviseur', etablissement_id: 1 };
      const token = signToken(payload);
      const req = buildReq(token);

      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeUndefined();
        expect(req.user.role).toBe('proviseur');
        done();
      });
    });

    test('req.user contient exactement les 4 champs attendus', (done) => {
      const payload = { id: 5, email: 'user@test.cm', role: 'enseignant', etablissement_id: 2 };
      const token = signToken(payload);
      const req = buildReq(token);

      verifyToken(req, buildRes(), (err) => {
        expect(err).toBeUndefined();
        const keys = Object.keys(req.user);
        expect(keys).toContain('id');
        expect(keys).toContain('email');
        expect(keys).toContain('role');
        expect(keys).toContain('etablissement_id');
        done();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────
describe('Middleware — requireRole', () => {

  function buildAuthReq(role) {
    return { user: { id: 1, email: 'test@test.cm', role, etablissement_id: 1 } };
  }

  test('Autorise un rôle correspondant → next() sans erreur', (done) => {
    const middleware = requireRole('enseignant');
    middleware(buildAuthReq('enseignant'), buildRes(), (err) => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test('Autorise quand plusieurs rôles acceptés et le rôle correspond', (done) => {
    const middleware = requireRole('enseignant', 'proviseur');
    middleware(buildAuthReq('proviseur'), buildRes(), (err) => {
      expect(err).toBeUndefined();
      done();
    });
  });

  test('Rejette un rôle non autorisé → err.statusCode 403', (done) => {
    const middleware = requireRole('proviseur');
    middleware(buildAuthReq('enseignant'), buildRes(), (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(403);
      done();
    });
  });

  test('Rejette si req.user est absent → err.statusCode 401', (done) => {
    const middleware = requireRole('enseignant');
    middleware({ user: undefined }, buildRes(), (err) => {
      expect(err).toBeDefined();
      expect(err.statusCode).toBe(401);
      done();
    });
  });

  test('Le message d\'erreur 403 mentionne le rôle requis', (done) => {
    const middleware = requireRole('proviseur');
    middleware(buildAuthReq('enseignant'), buildRes(), (err) => {
      expect(err.message).toMatch(/proviseur/i);
      done();
    });
  });
});
