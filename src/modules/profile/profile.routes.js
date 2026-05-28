'use strict';

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { query } = require('../../config/db');
const bcrypt = require('bcryptjs');

// GET /api/profile
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.created_at,
              e.id AS etablissement_id, e.nom AS etablissement_nom, e.ville
       FROM utilisateurs u
       JOIN etablissements e ON e.id = u.etablissement_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    return res.json({ success: true, profil: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/profile
router.put(
  '/',
  verifyToken,
  [
    body('nom').optional().isLength({ min: 2, max: 100 }).withMessage('Nom invalide'),
    body('prenom').optional().isLength({ min: 2, max: 100 }).withMessage('Prénom invalide'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { nom, prenom } = req.body;
      const result = await query(
        `UPDATE utilisateurs SET
           nom = COALESCE($1, nom),
           prenom = COALESCE($2, prenom)
         WHERE id = $3 RETURNING id, nom, prenom, email, role`,
        [nom || null, prenom || null, req.user.id]
      );
      return res.json({ success: true, profil: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/profile/password
router.put(
  '/password',
  verifyToken,
  [
    body('ancien_mot_de_passe').notEmpty().withMessage('Ancien mot de passe requis'),
    body('nouveau_mot_de_passe').isLength({ min: 6 }).withMessage('Nouveau mot de passe : 6 caractères minimum'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
      const userResult = await query('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [req.user.id]);
      const isValid = await bcrypt.compare(ancien_mot_de_passe, userResult.rows[0].mot_de_passe);
      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });
      }
      const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
      await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hash, req.user.id]);
      return res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
