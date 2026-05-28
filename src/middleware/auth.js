'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { createError } = require('./errorHandler');

/**
 * Middleware de vérification du token JWT
 * Injecte req.user = { id, email, role, etablissement_id }
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(createError('Token d\'authentification manquant', 401));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(createError('Format du token invalide. Attendu : Bearer <token>', 401));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      etablissement_id: decoded.etablissement_id,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Token expiré. Veuillez vous reconnecter.', 401));
    }
    return next(createError('Token invalide.', 401));
  }
}

/**
 * Middleware de vérification du rôle
 * @param {...string} roles - Rôles autorisés
 * @returns {Function} middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Non authentifié', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(createError(
        `Accès refusé. Rôle requis : ${roles.join(' ou ')}. Votre rôle : ${req.user.role}`,
        403
      ));
    }
    return next();
  };
}

module.exports = { verifyToken, requireRole };
