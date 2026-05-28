# EDUSMART-CM  Backend Task Tracker

## Legende
- [ ] A faire
- [~] En cours
- [x] Termine et teste

---

## Module 0  Infrastructure et Base de donnees

- [x] Configuration base de donnees (connexion PostgreSQL  src/config/db.js)
- [x] Middleware d erreur global (src/middleware/errorHandler.js)
- [x] Middleware d authentification JWT (src/middleware/auth.js  verifyToken)
- [x] Middleware de roles (requireRole)
- [x] Middleware de validation (src/middleware/validate.js)
- [x] Structure app.js et routeur principal /api
- [x] Script de migration (migrations/init.sql + migrations/migrate.js)
- [x] Script de seed (seeds/seed.js)
- [x] Commandes npm : migrate, seed, dev, test
- [x] Tests Module 0 (26 tests)

---

## Module 1  Authentification

- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] GET /api/auth/me
- [x] PUT /api/auth/change-password
- [x] Tests Module 1 (11 tests)

---

## Module 2  Etablissements et Classes

- [x] GET /api/etablissements
- [x] GET /api/classes
- [x] GET /api/classes/mes-classes
- [x] GET /api/classes/:id
- [x] GET /api/classes/:id/eleves
- [x] Tests Module 2 (8 tests)

---

## Module 3  Notes et Evaluations

- [x] POST /api/evaluations
- [x] GET /api/notes/:classe_id
- [x] GET /api/notes/:classe_id/stats
- [x] POST /api/notes (bulk)
- [x] PUT /api/notes/:id
- [x] DELETE /api/notes/:id
- [x] Tests Module 3 (7 tests)

---

## Module 4  Absences

- [x] GET /api/absences/:classe_id
- [x] POST /api/absences/appel
- [x] PUT /api/absences/:id
- [x] GET /api/absences/eleve/:eleve_id
- [x] GET /api/absences/:classe_id/stats
- [x] Tests Module 4 (8 tests)

---

## Module 5  Appreciations

- [x] GET /api/appreciations/:classe_id
- [x] GET /api/appreciations/:classe_id/stats
- [x] POST /api/appreciations
- [x] PUT /api/appreciations/:id
- [x] Tests Module 5 (7 tests)

---

## Module 6  Messagerie

- [x] GET /api/messages/inbox
- [x] GET /api/messages/sent
- [x] GET /api/messages/:id
- [x] POST /api/messages
- [x] DELETE /api/messages/:id
- [x] GET /api/messages/unread-count
- [x] GET /api/utilisateurs/contacts
- [x] Tests Module 6 (9 tests)

---

## Module 7  Profil et Administration

- [x] GET /api/profile
- [x] PUT /api/profile
- [x] PUT /api/profile/password
- [x] GET /api/admin/stats
- [x] GET /api/admin/alertes
- [x] GET /api/admin/enseignants
- [x] POST /api/admin/enseignants
- [x] POST /api/admin/classes
- [x] Tests Module 7 (9 tests)

---

## Module 8  Dashboard

- [x] GET /api/dashboard/enseignant
- [x] GET /api/dashboard/admin
- [x] Tests Module 8 (6 tests)

---

## Module 9  Finalisation

- [x] Validation inputs sur tous les endpoints (express-validator)
- [x] Pagination sur listes longues (notes, eleves, messages)
- [x] Documentation API.md
- [x] npm test 100% vert (93/93 tests)
- [x] README.md mis a jour
- [x] TASKS.md complet [x]

---

## Frontend  Modules React

- [x] F0  Setup architecture (Vite, React Router, Context, CSS)
- [x] F1  Authentification (SplashScreen, LoginPage)
- [x] F2  Dashboard enseignant et admin
- [x] F3  Classes et Notes (liste, saisie)
- [x] F4  Absences (appel du jour interactif)
- [x] F5  Appreciations (liste + formulaire)
- [x] F6  Messagerie (inbox, detail, composer)
- [x] F7  Profil et Parametres

---

## Bilan final

- Backend : 93 tests, 100% vert
- Frontend : build Vite OK (144 modules)
- Commits : 25+ sur branches multiples
- GitHub : https://github.com/NaelleNangmo/edusmart-cm-teacher-portal
