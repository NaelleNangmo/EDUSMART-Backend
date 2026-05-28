'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const notesService = require('./notes.service');

// POST /api/evaluations — créer une évaluation
router.post(
  '/',
  verifyToken,
  requireRole('enseignant'),
  [
    body('type').isIn(['DS','Interrogation','Examen']).withMessage('Type invalide'),
    body('numero').isInt({ min: 1 }).toInt().withMessage('Numéro invalide'),
    body('coefficient').isInt({ min: 1 }).toInt().withMessage('Coefficient invalide'),
    body('date').isISO8601().withMessage('Date invalide'),
    body('classe_id').isInt({ min: 1 }).toInt().withMessage('Classe requise'),
    body('matiere_id').isInt({ min: 1 }).toInt().withMessage('Matière requise'),
    body('trimestre').isInt({ min: 1, max: 3 }).toInt().withMessage('Trimestre invalide'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const evaluation = await notesService.createEvaluation({
        ...req.body,
        enseignant_id: req.user.id,
      });
      return res.status(201).json({ success: true, evaluation });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
