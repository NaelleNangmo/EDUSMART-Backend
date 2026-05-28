'use strict';

const { query } = require('../../config/db');

async function getInbox(userId, page, limit) {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT m.id, m.objet, m.lu, m.created_at, m.piece_jointe_url,
            u.id AS expediteur_id, u.nom AS expediteur_nom, u.prenom AS expediteur_prenom, u.role AS expediteur_role
     FROM messages m
     JOIN utilisateurs u ON u.id = m.expediteur_id
     WHERE m.destinataire_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM messages WHERE destinataire_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    messages: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getSent(userId, page, limit) {
  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT m.id, m.objet, m.lu, m.created_at,
            u.id AS destinataire_id, u.nom AS destinataire_nom, u.prenom AS destinataire_prenom, u.role AS destinataire_role
     FROM messages m
     JOIN utilisateurs u ON u.id = m.destinataire_id
     WHERE m.expediteur_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM messages WHERE expediteur_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    messages: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getMessageById(messageId, userId) {
  const result = await query(
    `SELECT m.*,
            exp.nom AS expediteur_nom, exp.prenom AS expediteur_prenom, exp.role AS expediteur_role,
            dest.nom AS destinataire_nom, dest.prenom AS destinataire_prenom
     FROM messages m
     JOIN utilisateurs exp ON exp.id = m.expediteur_id
     JOIN utilisateurs dest ON dest.id = m.destinataire_id
     WHERE m.id = $1 AND (m.destinataire_id = $2 OR m.expediteur_id = $2)`,
    [messageId, userId]
  );

  if (result.rows.length === 0) {
    // Retourne 403 intentionnellement (et non 404) pour ne pas révéler
    // l'existence d'un message à un utilisateur non autorisé (sécurité)
    const err = new Error('Message non trouvé ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  const message = result.rows[0];

  // Marquer comme lu si destinataire
  if (message.destinataire_id === userId && !message.lu) {
    await query('UPDATE messages SET lu = TRUE WHERE id = $1', [messageId]);
    message.lu = true;
  }

  return message;
}

async function sendMessage({ destinataire_id, objet, corps, piece_jointe_url }, expediteurId) {
  // Vérifier que le destinataire existe
  const destCheck = await query('SELECT id FROM utilisateurs WHERE id = $1', [destinataire_id]);
  if (destCheck.rows.length === 0) {
    const err = new Error('Destinataire non trouvé');
    err.statusCode = 404;
    throw err;
  }

  const result = await query(
    `INSERT INTO messages (expediteur_id, destinataire_id, objet, corps, piece_jointe_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [expediteurId, destinataire_id, objet, corps, piece_jointe_url || null]
  );
  return result.rows[0];
}

async function deleteMessage(messageId, userId) {
  const check = await query(
    'SELECT id FROM messages WHERE id = $1 AND (destinataire_id = $2 OR expediteur_id = $2)',
    [messageId, userId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Message non trouvé ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  await query('DELETE FROM messages WHERE id = $1', [messageId]);
}

async function getUnreadCount(userId) {
  const result = await query(
    'SELECT COUNT(*) FROM messages WHERE destinataire_id = $1 AND lu = FALSE',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

module.exports = { getInbox, getSent, getMessageById, sendMessage, deleteMessage, getUnreadCount };
