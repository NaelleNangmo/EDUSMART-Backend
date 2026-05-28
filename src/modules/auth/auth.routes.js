'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('mot_de_passe').notEmpty().withMessage('Mot de passe requis'),
    body('etablissement_id').isInt({ min: 1 }).toInt().withMessage('Établissement requis'),
  ],
  validate,
  authController.login
);

// POST /api/auth/logout
router.post('/logout', verifyToken, authController.logout);

// GET /api/auth/me
router.get('/me', verifyToken, authController.me);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  verifyToken,
  [
    body('ancien_mot_de_passe').notEmpty().withMessage('Ancien mot de passe requis'),
    body('nouveau_mot_de_passe')
      .isLength({ min: 6 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  ],
  validate,
  authController.changePassword
);

module.exports = router;
