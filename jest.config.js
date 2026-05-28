'use strict';

/**
 * Configuration Jest — EDUSMART-CM Backend
 * Compte F — Setup environnement de test
 *
 * Couverture actuelle (tests unitaires seuls, sans DB) :
 *   Statements : ~47%  → middleware 100%, routes ~70-88%
 *   Branches   : ~36%  → services non couverts (nécessitent PostgreSQL)
 *   Functions  : ~42%
 *   Lines      : ~48%
 *
 * Couverture cible (tests unitaires + intégration) :
 *   Statements : ≥ 70%
 *   Branches   : ≥ 60%
 *   Functions  : ≥ 70%
 *   Lines      : ≥ 70%
 */

module.exports = {
  // Environnement Node.js (pas de DOM)
  testEnvironment: 'node',

  // Fichiers de test reconnus
  testMatch: ['**/tests/**/*.test.js'],

  // Timeout global (30s pour les tests d'intégration avec DB)
  testTimeout: 30000,

  // Fichier de setup chargé avant chaque suite
  setupFiles: ['./tests/setup.js'],

  // Forcer la sortie après les tests
  forceExit: true,

  // Détecter les handles ouverts
  detectOpenHandles: true,

  // ── Configuration de la couverture ──────────────────────────
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',           // Point d'entrée — testé indirectement
  ],

  // Seuils pour tests unitaires seuls (sans DB)
  // Les services sont couverts par les tests d'intégration (module*.test.js)
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 35,
      lines: 40,
      statements: 40,
    },
    // Seuils spécifiques par fichier pour les middlewares (100% attendu)
    './src/middleware/auth.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/middleware/errorHandler.js': {
      branches: 85,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/middleware/validate.js': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  coverageReporters: [
    'text',          // Affichage console
    'text-summary',  // Résumé console
    'lcov',          // Pour SonarQube / Codecov
    'html',          // Rapport HTML navigable (coverage/index.html)
    'json-summary',  // Résumé JSON pour CI/CD
  ],

  coverageDirectory: 'coverage',
};
