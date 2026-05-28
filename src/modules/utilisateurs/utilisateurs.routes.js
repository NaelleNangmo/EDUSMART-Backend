'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/db');

// GET /api/utilisateurs/contacts — liste des contacts de l'établissement
router.get('/contacts', verifyToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nom, prenom, email, role
       FROM utilisateurs
       WHERE etablissement_id = $1 AND id != $2
       ORDER BY role, nom`,
      [req.user.etablissement_id, req.user.id]
    );
    return res.json({ success: true, contacts: result.rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
