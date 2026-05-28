# Rapport de Couverture — EDUSMART-CM Backend

## Résumé

| Métrique    | Tests unitaires seuls | Cible (unit + intégration) |
|-------------|----------------------|---------------------------|
| Statements  | ~47%                 | ≥ 70%                     |
| Branches    | ~36%                 | ≥ 60%                     |
| Functions   | ~42%                 | ≥ 70%                     |
| Lines       | ~48%                 | ≥ 70%                     |

## Commandes

```bash
# Couverture tests unitaires uniquement (sans PostgreSQL)
npm run test:coverage:unit

# Couverture complète (nécessite PostgreSQL + migrations + seeds)
npm run test:coverage

# Rapport HTML interactif
# Ouvrir coverage/index.html dans un navigateur
```

## Détail par module (tests unitaires)

| Module                    | Statements | Branches | Functions | Lines  |
|---------------------------|-----------|----------|-----------|--------|
| middleware/auth.js        | **100%**  | **100%** | **100%**  | **100%** |
| middleware/errorHandler.js| **100%**  | 90%      | **100%**  | **100%** |
| middleware/validate.js    | **100%**  | **100%** | **100%**  | **100%** |
| modules/auth/auth.routes.js | **100%** | **100%** | **100%**  | **100%** |
| modules/notes/notes.routes.js | 89%   | 67%      | **100%**  | 89%    |
| modules/classes/classes.routes.js | 81% | **100%** | 75%    | 81%    |
| modules/messagerie/messages.routes.js | 76% | 50%  | 83%    | 76%    |
| modules/admin/admin.routes.js | 67%   | 50%      | 60%       | 67%    |
| modules/profile/profile.routes.js | 63% | 50%    | 67%       | 63%    |
| modules/absences/absences.routes.js | 68% | 0%   | 60%       | 68%    |

## Pourquoi les services ont une faible couverture ?

Les fichiers `*.service.js` contiennent des requêtes SQL directes vers PostgreSQL.
Ils ne sont pas couverts par les tests unitaires (qui utilisent des mocks DB).

**Ces services sont couverts par les tests d'intégration** (`tests/module*.test.js`)
qui nécessitent une instance PostgreSQL avec les migrations et seeds appliqués.

## Structure des tests

```
tests/
├── setup.js                    # Variables d'environnement de test
├── unit/                       # Tests sans dépendance PostgreSQL
│   ├── auth.middleware.test.js      (13 tests)
│   ├── auth.routes.test.js          (17 tests)
│   ├── errorHandler.middleware.test.js (10 tests)
│   ├── validate.middleware.test.js  (7 tests)
│   ├── health.routes.test.js        (7 tests)
│   ├── classes.routes.test.js       (10 tests)
│   ├── notes.routes.test.js         (18 tests)
│   ├── absences.routes.test.js      (12 tests)
│   ├── messages.routes.test.js      (13 tests)
│   └── profile.admin.routes.test.js (16 tests)
│                               Total: 123 tests unitaires
│
├── module0.test.js             # Infrastructure & DB (nécessite PostgreSQL)
├── module1.test.js             # Authentification
├── module2.test.js             # Établissements & Classes
├── module3.test.js             # Notes & Évaluations
├── module4.test.js             # Absences
├── module5.test.js             # Appréciations
├── module6.test.js             # Messagerie
├── module7.test.js             # Profil & Administration
└── module8.test.js             # Dashboard
```

## Rapport HTML

Après exécution de `npm run test:coverage`, ouvrir :
```
backend/coverage/index.html
```

Le rapport HTML permet de naviguer dans le code source et voir exactement
quelles lignes sont couvertes (vert) ou non (rouge).
