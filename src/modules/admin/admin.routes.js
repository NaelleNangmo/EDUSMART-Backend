'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');

// Toutes les routes admin nécessitent le rôle proviseur
router.use(verifyToken, requireRole('proviseur'));

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const etabId = req.user.etablissement_id;

    const [enseignants, eleves, classes, matieres] = await Promise.all([
      query('SELECT COUNT(*) FROM utilisateurs WHERE etablissement_id = $1 AND role = $2', [etabId, 'enseignant']),
      query('SELECT COUNT(*) FROM eleves WHERE etablissement_id = $1', [etabId]),
      query('SELECT COUNT(*) FROM classes WHERE etablissement_id = $1', [etabId]),
      query('SELECT COUNT(*) FROM matieres'),
    ]);

    return res.json({
      success: true,
      stats: {
        nb_enseignants: parseInt(enseignants.rows[0].count, 10),
        nb_eleves: parseInt(eleves.rows[0].count, 10),
        nb_classes: parseInt(classes.rows[0].count, 10),
        nb_matieres: parseInt(matieres.rows[0].count, 10),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/alertes
router.get('/alertes', async (req, res, next) => {
  try {
    const etabId = req.user.etablissement_id;

    // Enseignants avec saisies en retard (classes sans évaluations T2)
    const retardResult = await query(
      `SELECT COUNT(DISTINCT ec.utilisateur_id) AS nb
       FROM enseignant_classes ec
       JOIN utilisateurs u ON u.id = ec.utilisateur_id
       WHERE u.etablissement_id = $1
         AND ec.trimestre = 2
         AND NOT EXISTS (
           SELECT 1 FROM evaluations ev
           WHERE ev.classe_id = ec.classe_id
             AND ev.enseignant_id = ec.utilisateur_id
             AND ev.trimestre = 2
         )`,
      [etabId]
    );

    // Absences non justifiées
    const absResult = await query(
      `SELECT COUNT(*) AS nb FROM absences a
       JOIN eleves el ON el.id = a.eleve_id
       WHERE el.etablissement_id = $1 AND a.motif = 'sans_motif' AND a.statut = 'absent'`,
      [etabId]
    );

    const alertes = [
      {
        type: 'error',
        titre: `${retardResult.rows[0].nb} saisies en retard`,
        description: 'Notes T2 non complétées — délai dépassé',
      },
      {
        type: 'warning',
        titre: `${absResult.rows[0].nb} absences non justifiées`,
        description: 'Élèves signalés sur plusieurs classes',
      },
      {
        type: 'info',
        titre: 'Clôture T2 dans 12 jours',
        description: 'Rappel envoyé aux enseignants',
      },
    ];

    return res.json({ success: true, alertes });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/enseignants
router.get('/enseignants', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.created_at,
              COUNT(DISTINCT ec.classe_id) AS nb_classes
       FROM utilisateurs u
       LEFT JOIN enseignant_classes ec ON ec.utilisateur_id = u.id
       WHERE u.etablissement_id = $1 AND u.role = 'enseignant'
       GROUP BY u.id
       ORDER BY u.nom`,
      [req.user.etablissement_id]
    );
    return res.json({ success: true, enseignants: result.rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/enseignants
router.post(
  '/enseignants',
  [
    body('nom').isLength({ min: 2 }).withMessage('Nom requis'),
    body('prenom').isLength({ min: 2 }).withMessage('Prénom requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('mot_de_passe').isLength({ min: 6 }).withMessage('Mot de passe : 6 caractères minimum'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { nom, prenom, email, mot_de_passe } = req.body;
      const hash = await bcrypt.hash(mot_de_passe, 12);
      const result = await query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, etablissement_id)
         VALUES ($1, $2, $3, $4, 'enseignant', $5) RETURNING id, nom, prenom, email, role`,
        [nom, prenom, email, hash, req.user.etablissement_id]
      );
      return res.status(201).json({ success: true, enseignant: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
      }
      return next(err);
    }
  }
);

// POST /api/admin/classes
router.post(
  '/classes',
  [
    body('nom').isLength({ min: 2 }).withMessage('Nom requis'),
    body('niveau').isLength({ min: 2 }).withMessage('Niveau requis'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { nom, niveau } = req.body;
      const result = await query(
        `INSERT INTO classes (nom, niveau, etablissement_id) VALUES ($1, $2, $3) RETURNING *`,
        [nom, niveau, req.user.etablissement_id]
      );
      return res.status(201).json({ success: true, classe: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
