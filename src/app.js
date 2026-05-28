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
const authRouter = require('./modules/auth/auth.routes');
const etablissementsRouter = require('./modules/etablissements/etablissements.routes');
const classesRouter = require('./modules/classes/classes.routes');
const notesRouter = require('./modules/notes/notes.routes');
const evaluationsRouter = require('./modules/notes/evaluations.routes');
const absencesRouter = require('./modules/absences/absences.routes');
const appreciationsRouter = require('./modules/appreciations/appreciations.routes');
const messagesRouter = require('./modules/messagerie/messages.routes');
const profileRouter = require('./modules/profile/profile.routes');
const adminRouter = require('./modules/admin/admin.routes');
const dashboardRouter = require('./modules/dashboard/dashboard.routes');
const utilisateursRouter = require('./modules/utilisateurs/utilisateurs.routes');

const app = express();

// ── Middlewares globaux ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Route de santé ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EDUSMART-CM API opérationnelle',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes API ───────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/etablissements', etablissementsRouter);
app.use('/api/classes', classesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/absences', absencesRouter);
app.use('/api/appreciations', appreciationsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/utilisateurs', utilisateursRouter);

// ── 404 & Gestion d'erreurs ──────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Démarrage du serveur ─────────────────────────────────────
if (require.main === module) {
  (async () => {
    try {
      await testConnection();
      console.log('[DB] Connexion PostgreSQL réussie ✓');
      app.listen(config.port, () => {
        console.log(`[SERVER] EDUSMART-CM API démarrée sur http://localhost:${config.port}`);
        console.log(`[SERVER] Environnement : ${config.nodeEnv}`);
      });
    } catch (err) {
      console.error('[DB] Impossible de se connecter à PostgreSQL :', err.message);
      process.exit(1);
    }
  })();
}

module.exports = app;
