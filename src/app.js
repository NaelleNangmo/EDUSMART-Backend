'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const { testConnection } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Import des routeurs ──────────────────────────────────────
const authRouter          = require('./modules/auth/auth.routes');
const etablissementsRouter = require('./modules/etablissements/etablissements.routes');
const classesRouter       = require('./modules/classes/classes.routes');
const notesRouter         = require('./modules/notes/notes.routes');
const evaluationsRouter   = require('./modules/notes/evaluations.routes');
const absencesRouter      = require('./modules/absences/absences.routes');
const appreciationsRouter = require('./modules/appreciations/appreciations.routes');
const messagesRouter      = require('./modules/messagerie/messages.routes');
const profileRouter       = require('./modules/profile/profile.routes');
const adminRouter         = require('./modules/admin/admin.routes');
const dashboardRouter     = require('./modules/dashboard/dashboard.routes');
const utilisateursRouter  = require('./modules/utilisateurs/utilisateurs.routes');

const app = express();

// ── Middlewares globaux ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Route de santé ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EDUSMART-CM API opérationnelle',
    version: '1.0.0',
    env: config.nodeEnv,
    db: process.env.DATABASE_URL ? 'railway' : 'local',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes API ───────────────────────────────────────────────
app.use('/api/auth',           authRouter);
app.use('/api/etablissements', etablissementsRouter);
app.use('/api/classes',        classesRouter);
app.use('/api/notes',          notesRouter);
app.use('/api/evaluations',    evaluationsRouter);
app.use('/api/absences',       absencesRouter);
app.use('/api/appreciations',  appreciationsRouter);
app.use('/api/messages',       messagesRouter);
app.use('/api/profile',        profileRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/dashboard',      dashboardRouter);
app.use('/api/utilisateurs',   utilisateursRouter);

// ── 404 & Gestion d'erreurs ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Connexion DB avec retry ──────────────────────────────────
async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await testConnection();
      console.log('[DB] Connexion PostgreSQL réussie ✓');
      return true;
    } catch (err) {
      console.error(`[DB] Tentative ${attempt}/${maxRetries} échouée : ${err.message}`);
      if (attempt === maxRetries) {
        console.error('[DB] Impossible de se connecter après', maxRetries, 'tentatives.');
        return false;
      }
      console.log(`[DB] Nouvelle tentative dans ${delayMs / 1000}s…`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

// ── Démarrage du serveur ─────────────────────────────────────
if (require.main === module) {
  const PORT = config.port;

  // Démarrer le serveur HTTP immédiatement (Railway attend que le port soit ouvert)
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] EDUSMART-CM API démarrée sur le port ${PORT}`);
    console.log(`[SERVER] Environnement : ${config.nodeEnv}`);
    console.log(`[SERVER] DATABASE_URL : ${process.env.DATABASE_URL ? 'définie ✓' : 'NON DÉFINIE ✗'}`);
  });

  // Connexion DB en arrière-plan avec retry
  connectWithRetry(10, 3000).then(ok => {
    if (!ok) {
      console.error('[SERVER] Arrêt : impossible de se connecter à la base de données.');
      server.close(() => process.exit(1));
    }
  });
}

module.exports = app;
