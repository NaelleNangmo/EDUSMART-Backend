'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const absencesService = require('./absences.service');

// GET /api/absences/:classe_id?date=YYYY-MM-DD
router.get('/:classe_id', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const { date } = req.query;
    const result = await absencesService.getAbsencesByClasse(classeId, date);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/absences/:classe_id/stats
router.get('/:classe_id/stats', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const { date } = req.query;
    const stats = await absencesService.getStatsByDate(classeId, date);
    return res.json({ success: true, stats });
  } catch (err) {
    return next(err);
  }
});

// GET /api/absences/eleve/:eleve_id?trimestre=2
router.get('/eleve/:eleve_id', verifyToken, async (req, res, next) => {
  try {
    const eleveId = parseInt(req.params.eleve_id, 10);
    const trimestre = req.query.trimestre ? parseInt(req.query.trimestre, 10) : null;
    const absences = await absencesService.getAbsencesByEleve(eleveId, trimestre);
    return res.json({ success: true, absences });
  } catch (err) {
    return next(err);
  }
});

// POST /api/absences/appel — enregistrer l'appel complet
router.post(
  '/appel',
  verifyToken,
  requireRole('enseignant'),
  [
    body('classe_id').isInt({ min: 1 }).withMessage('Classe requise'),
    body('date').isISO8601().withMessage('Date invalide'),
    body('presences').isArray({ min: 1 }).withMessage('Présences requises'),
    body('presences.*.eleve_id').isInt({ min: 1 }).withMessage('ID élève invalide'),
    body('presences.*.statut').isIn(['present','absent','retard']).withMessage('Statut invalide'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await absencesService.enregistrerAppel(
        req.body.classe_id,
        req.body.date,
        req.body.presences,
        req.user.id
      );
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/absences/:id
router.put('/:id', verifyToken, requireRole('enseignant'), async (req, res, next) => {
  try {
    const absence = await absencesService.updateAbsence(
      parseInt(req.params.id, 10),
      req.body,
      req.user.id
    );
    return res.json({ success: true, absence });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
