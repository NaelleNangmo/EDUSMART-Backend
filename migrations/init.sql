-- ============================================================
-- EDUSMART-CM — Script de migration initial
-- Création de toutes les tables du schéma
-- ============================================================

-- Extension pour UUID (optionnel, on utilise SERIAL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Établissements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etablissements (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(200) NOT NULL,
  ville         VARCHAR(100) NOT NULL,
  type          VARCHAR(50)  NOT NULL DEFAULT 'lycee',
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 2. Utilisateurs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                SERIAL PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100) NOT NULL,
  email             VARCHAR(200) NOT NULL UNIQUE,
  mot_de_passe      VARCHAR(255) NOT NULL,
  role              VARCHAR(30)  NOT NULL CHECK (role IN ('enseignant','proviseur','cpe','secretariat')),
  etablissement_id  INTEGER      NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 3. Classes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id                SERIAL PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  niveau            VARCHAR(50)  NOT NULL,
  etablissement_id  INTEGER      NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 4. Matières ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matieres (
  id              SERIAL PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  coefficient     INTEGER      NOT NULL DEFAULT 1,
  heures_semaine  INTEGER      NOT NULL DEFAULT 2,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 5. Enseignant ↔ Classes (affectations) ───────────────────
CREATE TABLE IF NOT EXISTS enseignant_classes (
  id              SERIAL PRIMARY KEY,
  utilisateur_id  INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id       INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  matiere_id      INTEGER      NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  annee_scolaire  VARCHAR(10)  NOT NULL DEFAULT '2024-2025',
  trimestre       INTEGER      NOT NULL DEFAULT 2 CHECK (trimestre IN (1,2,3)),
  UNIQUE (utilisateur_id, classe_id, matiere_id, annee_scolaire)
);

-- ── 6. Élèves ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eleves (
  id                SERIAL PRIMARY KEY,
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100) NOT NULL,
  matricule         VARCHAR(50)  NOT NULL UNIQUE,
  classe_id         INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  etablissement_id  INTEGER      NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 7. Évaluations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(30)  NOT NULL CHECK (type IN ('DS','Interrogation','Examen')),
  numero        INTEGER      NOT NULL DEFAULT 1,
  date          DATE         NOT NULL,
  coefficient   INTEGER      NOT NULL DEFAULT 1,
  classe_id     INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  matiere_id    INTEGER      NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  enseignant_id INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  trimestre     INTEGER      NOT NULL DEFAULT 2 CHECK (trimestre IN (1,2,3)),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 8. Notes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id              SERIAL PRIMARY KEY,
  evaluation_id   INTEGER        NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  eleve_id        INTEGER        NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  valeur          NUMERIC(4,1)   NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
  created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
  UNIQUE (evaluation_id, eleve_id)
);

-- ── 9. Absences ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS absences (
  id            SERIAL PRIMARY KEY,
  eleve_id      INTEGER      NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  enseignant_id INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date          DATE         NOT NULL,
  motif         VARCHAR(30)  NOT NULL DEFAULT 'sans_motif'
                CHECK (motif IN ('sans_motif','maladie','retard','depart_anticipe')),
  statut        VARCHAR(20)  NOT NULL DEFAULT 'absent'
                CHECK (statut IN ('present','absent','retard')),
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (eleve_id, enseignant_id, classe_id, date)
);

-- ── 10. Appréciations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appreciations (
  id            SERIAL PRIMARY KEY,
  eleve_id      INTEGER      NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  enseignant_id INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  classe_id     INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  trimestre     INTEGER      NOT NULL DEFAULT 2 CHECK (trimestre IN (1,2,3)),
  texte         TEXT         NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (eleve_id, enseignant_id, classe_id, trimestre)
);

-- ── 11. Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                SERIAL PRIMARY KEY,
  expediteur_id     INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  destinataire_id   INTEGER      NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  objet             VARCHAR(300) NOT NULL,
  corps             TEXT         NOT NULL,
  lu                BOOLEAN      NOT NULL DEFAULT FALSE,
  piece_jointe_url  VARCHAR(500),
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Index pour les performances ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_etablissement ON utilisateurs(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(classe_id);
CREATE INDEX IF NOT EXISTS idx_eleves_matricule ON eleves(matricule);
CREATE INDEX IF NOT EXISTS idx_notes_evaluation ON notes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_absences_eleve ON absences(eleve_id);
CREATE INDEX IF NOT EXISTS idx_absences_classe_date ON absences(classe_id, date);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_enseignant_classes_user ON enseignant_classes(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_appreciations_eleve ON appreciations(eleve_id, trimestre);
