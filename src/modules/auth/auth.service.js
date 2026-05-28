'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const config = require('../../config/env');

/**
 * Authentifie un utilisateur et retourne un token JWT
 */
async function login(email, motDePasse, etablissementId) {
  // Recherche de l'utilisateur
  const result = await query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.mot_de_passe, u.role, u.etablissement_id,
            e.nom AS etablissement_nom, e.ville AS etablissement_ville
     FROM utilisateurs u
     JOIN etablissements e ON e.id = u.etablissement_id
     WHERE u.email = $1 AND u.etablissement_id = $2`,
    [email, etablissementId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];

  // Vérification du mot de passe
  const isValid = await bcrypt.compare(motDePasse, user.mot_de_passe);
  if (!isValid) {
    const err = new Error('Email ou mot de passe incorrect');
    err.statusCode = 401;
    throw err;
  }

  // Génération du token JWT
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    etablissement_id: user.etablissement_id,
  };

  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

  return {
    token,
    utilisateur: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      etablissement: {
        id: user.etablissement_id,
        nom: user.etablissement_nom,
        ville: user.etablissement_ville,
      },
    },
  };
}

/**
 * Retourne le profil de l'utilisateur connecté
 */
async function getMe(userId) {
  const result = await query(
    `SELECT u.id, u.nom, u.prenom, u.email, u.role, u.created_at,
            e.id AS etablissement_id, e.nom AS etablissement_nom, e.ville AS etablissement_ville
     FROM utilisateurs u
     JOIN etablissements e ON e.id = u.etablissement_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Utilisateur non trouvé');
    err.statusCode = 404;
    throw err;
  }

  const u = result.rows[0];
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    etablissement: {
      id: u.etablissement_id,
      nom: u.etablissement_nom,
      ville: u.etablissement_ville,
    },
  };
}

/**
 * Change le mot de passe d'un utilisateur
 */
async function changePassword(userId, ancienMotDePasse, nouveauMotDePasse) {
  const result = await query(
    'SELECT id, mot_de_passe FROM utilisateurs WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Utilisateur non trouvé');
    err.statusCode = 404;
    throw err;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe);

  if (!isValid) {
    const err = new Error('Ancien mot de passe incorrect');
    err.statusCode = 400;
    throw err;
  }

  const newHash = await bcrypt.hash(nouveauMotDePasse, 12);
  await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [newHash, userId]);

  return { message: 'Mot de passe modifié avec succès' };
}

module.exports = { login, getMe, changePassword };
