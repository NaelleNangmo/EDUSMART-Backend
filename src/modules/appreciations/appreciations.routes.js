'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const appreciationsService = require('./appreciations.service');

// GET /api/appreciations/:classe_id?trimestre=2
router.get('/:classe_id', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const trimestre = req.query.trimestre ? parseInt(req.query.trimestre, 10) : 2;
    const result = await appreciationsService.getAppreciationsByClasse(classeId, trimestre, req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/appreciations/:classe_id/stats
router.get('/:classe_id/stats', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const trimestre = req.query.trimestre ? parseInt(req.query.trimestre, 10) : 2;
    const stats = await appreciationsService.getStats(classeId, trimestre, req.user.id);
    return res.json({ success: true, stats });
  } catch (err) {
    return next(err);
  }
});

// POST /api/appreciations
router.post(
  '/',
  verifyToken,
  requireRole('enseignant'),
  [
    body('eleve_id').isInt({ min: 1 }).withMessage('Élève requis'),
    body('classe_id').isInt({ min: 1 }).withMessage('Classe requise'),
    body('trimestre').isInt({ min: 1, max: 3 }).withMessage('Trimestre invalide'),
    body('texte').isLength({ min: 5, max: 1000 }).withMessage('Texte requis (5-1000 caractères)'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const apprec = await appreciationsService.upsertAppréciation(req.body, req.user.id);
      return res.status(201).json({ success: true, appreciation: apprec });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/appreciations/:id
router.put(
  '/:id',
  verifyToken,
  requireRole('enseignant'),
  [
    body('texte').isLength({ min: 5, max: 1000 }).withMessage('Texte requis (5-1000 caractères)'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const apprec = await appreciationsService.updateAppréciation(
        parseInt(req.params.id, 10),
        req.body.texte,
        req.user.id
      );
      return res.json({ success: true, appreciation: apprec });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
