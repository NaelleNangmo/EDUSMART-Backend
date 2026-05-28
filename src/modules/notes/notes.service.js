'use strict';

const { query, getClient } = require('../../config/db');

async function createEvaluation({ type, numero, coefficient, date, classe_id, matiere_id, enseignant_id, trimestre }) {
  // Vérifier que l'enseignant est affecté à cette classe
  const check = await query(
    `SELECT id FROM enseignant_classes WHERE utilisateur_id = $1 AND classe_id = $2`,
    [enseignant_id, classe_id]
  );
  if (check.rows.length === 0) {
    const err = new Error('Vous n\'êtes pas affecté à cette classe');
    err.statusCode = 403;
    throw err;
  }

  const result = await query(
    `INSERT INTO evaluations (type, numero, date, coefficient, classe_id, matiere_id, enseignant_id, trimestre)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [type, numero, date, coefficient, classe_id, matiere_id, enseignant_id, trimestre]
  );
  return result.rows[0];
}

async function getNotesByClasse(classeId, { evaluationId, trimestre, page, limit }) {
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE e.classe_id = $1';
  const params = [classeId];
  let paramIdx = 2;

  if (evaluationId) {
    whereClause += ` AND n.evaluation_id = $${paramIdx++}`;
    params.push(evaluationId);
  }
  if (trimestre) {
    whereClause += ` AND ev.trimestre = $${paramIdx++}`;
    params.push(trimestre);
  }

  // Récupérer les évaluations de la classe
  const evalsResult = await query(
    `SELECT id, type, numero, coefficient, date, trimestre FROM evaluations WHERE classe_id = $1 ORDER BY date`,
    [classeId]
  );

  // Calculer les moyennes pondérées par élève
  const moyennesResult = await query(
    `SELECT el.id AS eleve_id, el.nom, el.prenom, el.matricule,
            ROUND(
              SUM(n.valeur * ev.coefficient) / NULLIF(SUM(ev.coefficient), 0)
            , 2) AS moyenne_generale,
            COUNT(n.id) AS nb_notes
     FROM eleves el
     LEFT JOIN notes n ON n.eleve_id = el.id
     LEFT JOIN evaluations ev ON ev.id = n.evaluation_id AND ev.classe_id = $1
     WHERE el.classe_id = $1
     GROUP BY el.id, el.nom, el.prenom, el.matricule
     ORDER BY moyenne_generale DESC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [classeId, limit, offset]
  );

  const countResult = await query('SELECT COUNT(*) FROM eleves WHERE classe_id = $1', [classeId]);
  const total = parseInt(countResult.rows[0].count, 10);

  // Ajouter le rang
  const elevesAvecRang = moyennesResult.rows.map((el, idx) => ({
    ...el,
    rang: offset + idx + 1,
  }));

  return {
    evaluations: evalsResult.rows,
    eleves: elevesAvecRang,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getStats(classeId, { evaluationId, trimestre }) {
  let whereEval = 'WHERE ev.classe_id = $1';
  const params = [classeId];
  let paramIdx = 2;

  if (evaluationId) {
    whereEval += ` AND n.evaluation_id = $${paramIdx++}`;
    params.push(evaluationId);
  }
  if (trimestre) {
    whereEval += ` AND ev.trimestre = $${paramIdx++}`;
    params.push(trimestre);
  }

  const result = await query(
    `SELECT
       COUNT(DISTINCT el.id) AS nb_eleves,
       ROUND(AVG(n.valeur), 2) AS moyenne_classe,
       MAX(n.valeur) AS meilleure_note,
       MIN(n.valeur) AS note_la_plus_basse,
       COUNT(n.id) AS nb_notes_saisies
     FROM eleves el
     LEFT JOIN notes n ON n.eleve_id = el.id
     LEFT JOIN evaluations ev ON ev.id = n.evaluation_id
     ${whereEval}`,
    params
  );

  return result.rows[0];
}

async function saisirNotes(evaluationId, notes, enseignantId) {
  // Vérifier que l'enseignant est propriétaire de l'évaluation
  const evalCheck = await query(
    'SELECT id, classe_id FROM evaluations WHERE id = $1 AND enseignant_id = $2',
    [evaluationId, enseignantId]
  );
  if (evalCheck.rows.length === 0) {
    const err = new Error('Évaluation non trouvée ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  // Validation préalable de toutes les notes AVANT d'ouvrir la transaction
  // Évite un ROLLBACK partiel si une note est invalide en milieu de lot
  for (const note of notes) {
    if (note.valeur < 0 || note.valeur > 20) {
      const err = new Error(`Note invalide pour l'élève ${note.eleve_id} : ${note.valeur} (doit être entre 0 et 20)`);
      err.statusCode = 400;
      throw err;
    }
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;

    for (const note of notes) {
      const { eleve_id, valeur } = note;

      const existing = await client.query(
        'SELECT id FROM notes WHERE evaluation_id = $1 AND eleve_id = $2',
        [evaluationId, eleve_id]
      );

      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE notes SET valeur = $1, updated_at = NOW() WHERE evaluation_id = $2 AND eleve_id = $3',
          [valeur, evaluationId, eleve_id]
        );
        updated++;
      } else {
        await client.query(
          'INSERT INTO notes (evaluation_id, eleve_id, valeur) VALUES ($1, $2, $3)',
          [evaluationId, eleve_id, valeur]
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    return { message: `${inserted} notes créées, ${updated} mises à jour`, inserted, updated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateNote(noteId, valeur, enseignantId) {
  if (valeur < 0 || valeur > 20) {
    const err = new Error('La note doit être entre 0 et 20');
    err.statusCode = 400;
    throw err;
  }

  // Vérifier que l'enseignant est propriétaire
  const check = await query(
    `SELECT n.id FROM notes n
     JOIN evaluations ev ON ev.id = n.evaluation_id
     WHERE n.id = $1 AND ev.enseignant_id = $2`,
    [noteId, enseignantId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Note non trouvée ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  const result = await query(
    'UPDATE notes SET valeur = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [valeur, noteId]
  );
  return result.rows[0];
}

async function deleteNote(noteId, enseignantId) {
  const check = await query(
    `SELECT n.id FROM notes n
     JOIN evaluations ev ON ev.id = n.evaluation_id
     WHERE n.id = $1 AND ev.enseignant_id = $2`,
    [noteId, enseignantId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Note non trouvée ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  await query('DELETE FROM notes WHERE id = $1', [noteId]);
}

module.exports = { createEvaluation, getNotesByClasse, getStats, saisirNotes, updateNote, deleteNote };
