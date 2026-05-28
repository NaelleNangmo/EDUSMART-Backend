'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const notesService = require('./notes.service');

// GET /api/notes/:classe_id — notes d'une classe
router.get('/:classe_id', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const { evaluation_id, trimestre, page, limit } = req.query;
    const result = await notesService.getNotesByClasse(classeId, {
      evaluationId: evaluation_id ? parseInt(evaluation_id, 10) : null,
      trimestre: trimestre ? parseInt(trimestre, 10) : null,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 100,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

// GET /api/notes/:classe_id/stats — statistiques
router.get('/:classe_id/stats', verifyToken, async (req, res, next) => {
  try {
    const classeId = parseInt(req.params.classe_id, 10);
    const { evaluation_id, trimestre } = req.query;
    const stats = await notesService.getStats(classeId, {
      evaluationId: evaluation_id ? parseInt(evaluation_id, 10) : null,
      trimestre: trimestre ? parseInt(trimestre, 10) : null,
    });
    return res.json({ success: true, stats });
  } catch (err) {
    return next(err);
  }
});

// POST /api/notes — saisie en lot
router.post(
  '/',
  verifyToken,
  requireRole('enseignant'),
  [
    body('evaluation_id').isInt({ min: 1 }).withMessage('Évaluation requise'),
    body('notes').isArray({ min: 1 }).withMessage('Notes requises'),
    body('notes.*.eleve_id').isInt({ min: 1 }).withMessage('ID élève invalide'),
    body('notes.*.valeur').isFloat({ min: 0, max: 20 }).withMessage('Note doit être entre 0 et 20'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await notesService.saisirNotes(
        req.body.evaluation_id,
        req.body.notes,
        req.user.id
      );
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/notes/:id — modifier une note
router.put(
  '/:id',
  verifyToken,
  requireRole('enseignant'),
  [
    body('valeur').isFloat({ min: 0, max: 20 }).withMessage('Note doit être entre 0 et 20'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const note = await notesService.updateNote(
        parseInt(req.params.id, 10),
        req.body.valeur,
        req.user.id
      );
      return res.json({ success: true, note });
    } catch (err) {
      return next(err);
    }
  }
);

// DELETE /api/notes/:id
router.delete('/:id', verifyToken, requireRole('enseignant'), async (req, res, next) => {
  try {
    await notesService.deleteNote(parseInt(req.params.id, 10), req.user.id);
    return res.json({ success: true, message: 'Note supprimée' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
