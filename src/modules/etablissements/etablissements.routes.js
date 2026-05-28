'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');

// GET /api/etablissements — liste tous les établissements (public, pour le select du login)
router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT id, nom, ville, type FROM etablissements ORDER BY nom');
    return res.json({ success: true, etablissements: result.rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
