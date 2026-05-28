'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const classesService = require('./classes.service');

// GET /api/classes — toutes les classes de l'établissement
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const classes = await classesService.getClassesByEtablissement(req.user.etablissement_id);
    return res.json({ success: true, classes });
  } catch (err) {
    return next(err);
  }
});

// GET /api/classes/mes-classes — classes de l'enseignant connecté
router.get('/mes-classes', verifyToken, requireRole('enseignant'), async (req, res, next) => {
  try {
    const classes = await classesService.getMesClasses(req.user.id);
    return res.json({ success: true, classes });
  } catch (err) {
    return next(err);
  }
});

// GET /api/classes/:id — détail d'une classe
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const classe = await classesService.getClasseById(parseInt(req.params.id, 10));
    return res.json({ success: true, classe });
  } catch (err) {
    return next(err);
  }
});

// GET /api/classes/:id/eleves — élèves d'une classe
router.get('/:id/eleves', verifyToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const result = await classesService.getElevesByClasse(parseInt(req.params.id, 10), page, limit);
    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
