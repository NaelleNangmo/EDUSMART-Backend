'use strict';

const { query } = require('../../config/db');

async function getAppreciationsByClasse(classeId, trimestre, enseignantId) {
  const result = await query(
    `SELECT el.id AS eleve_id, el.nom, el.prenom, el.matricule,
            ap.id AS appreciation_id, ap.texte, ap.updated_at,
            CASE WHEN ap.id IS NOT NULL THEN 'redigee' ELSE 'en_attente' END AS statut
     FROM eleves el
     LEFT JOIN appreciations ap
       ON ap.eleve_id = el.id
       AND ap.classe_id = $1
       AND ap.trimestre = $2
       AND ap.enseignant_id = $3
     WHERE el.classe_id = $1
     ORDER BY el.nom, el.prenom`,
    [classeId, trimestre, enseignantId]
  );

  return { eleves: result.rows, trimestre, classe_id: classeId };
}

async function getStats(classeId, trimestre, enseignantId) {
  const totalResult = await query(
    'SELECT COUNT(*) AS total FROM eleves WHERE classe_id = $1',
    [classeId]
  );
  const total = parseInt(totalResult.rows[0].total, 10);

  const redigeesResult = await query(
    `SELECT COUNT(*) AS redigees FROM appreciations
     WHERE classe_id = $1 AND trimestre = $2 AND enseignant_id = $3`,
    [classeId, trimestre, enseignantId]
  );
  const redigees = parseInt(redigeesResult.rows[0].redigees, 10);
  const en_attente = total - redigees;
  const pourcentage = total > 0 ? Math.round((redigees / total) * 100) : 0;

  return { total, redigees, en_attente, pourcentage };
}

async function upsertAppréciation({ eleve_id, classe_id, trimestre, texte }, enseignantId) {
  // Vérifier que l'enseignant est affecté à cette classe
  const check = await query(
    'SELECT id FROM enseignant_classes WHERE utilisateur_id = $1 AND classe_id = $2',
    [enseignantId, classe_id]
  );
  if (check.rows.length === 0) {
    const err = new Error('Vous n\'êtes pas affecté à cette classe');
    err.statusCode = 403;
    throw err;
  }

  const result = await query(
    `INSERT INTO appreciations (eleve_id, enseignant_id, classe_id, trimestre, texte)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (eleve_id, enseignant_id, classe_id, trimestre)
     DO UPDATE SET texte = EXCLUDED.texte, updated_at = NOW()
     RETURNING *`,
    [eleve_id, enseignantId, classe_id, trimestre, texte]
  );
  return result.rows[0];
}

async function updateAppréciation(appreciationId, texte, enseignantId) {
  const check = await query(
    'SELECT id FROM appreciations WHERE id = $1 AND enseignant_id = $2',
    [appreciationId, enseignantId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Appréciation non trouvée ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  const result = await query(
    'UPDATE appreciations SET texte = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [texte, appreciationId]
  );
  return result.rows[0];
}

module.exports = { getAppreciationsByClasse, getStats, upsertAppréciation, updateAppréciation };
