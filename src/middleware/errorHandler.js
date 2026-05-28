'use strict';

const config = require('../config/env');

/**
 * Middleware de gestion globale des erreurs
 * Retourne toujours une réponse JSON uniforme
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Erreur interne du serveur';

  const response = {
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  if (statusCode >= 500) {
    console.error(`[ERROR] ${statusCode} — ${message}`, err.stack);
  }

  return res.status(statusCode).json(response);
}

/**
 * Middleware pour les routes non trouvées (404)
 */
function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route non trouvée : ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Crée une erreur HTTP avec un code de statut
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error}
 */
function createError(message, statusCode = 500) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, notFound, createError };
