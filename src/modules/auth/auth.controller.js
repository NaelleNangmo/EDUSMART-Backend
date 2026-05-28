'use strict';

const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const { email, mot_de_passe, etablissement_id } = req.body;
    const data = await authService.login(email, mot_de_passe, parseInt(etablissement_id, 10));
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res) {
  // JWT est stateless — la déconnexion est gérée côté client
  return res.status(200).json({ success: true, message: 'Déconnexion réussie' });
}

async function me(req, res, next) {
  try {
    const utilisateur = await authService.getMe(req.user.id);
    return res.status(200).json({ success: true, utilisateur });
  } catch (err) {
    return next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
    const result = await authService.changePassword(req.user.id, ancien_mot_de_passe, nouveau_mot_de_passe);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, logout, me, changePassword };
