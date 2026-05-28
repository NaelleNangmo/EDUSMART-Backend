'use strict';

const { query, getClient } = require('../../config/db');

const SEUIL_CRITIQUE = 7;
const SEUIL_WARNING = 3;

function getFlag(nbAbsences) {
  if (nbAbsences >= SEUIL_CRITIQUE) return 'critique';
  if (nbAbsences >= SEUIL_WARNING) return 'warning';
  return 'normal';
}

async function getAbsencesByClasse(classeId, date) {
  const elevesResult = await query(
    `SELECT el.id, el.nom, el.prenom, el.matricule,
            COUNT(CASE WHEN a.statut = 'absent' THEN 1 END) AS nb_absences_trimestre,
            MAX(CASE WHEN a.date = $2::date THEN a.statut END) AS statut_jour,
            MAX(CASE WHEN a.date = $2::date THEN a.motif END) AS motif_jour
     FROM eleves el
     LEFT JOIN absences a ON a.eleve_id = el.id AND a.classe_id = $1
     WHERE el.classe_id = $1
     GROUP BY el.id, el.nom, el.prenom, el.matricule
     ORDER BY el.nom, el.prenom`,
    [classeId, date || null]
  );

  const eleves = elevesResult.rows.map((el) => ({
    ...el,
    nb_absences_trimestre: parseInt(el.nb_absences_trimestre, 10),
    flag: getFlag(parseInt(el.nb_absences_trimestre, 10)),
  }));

  return { eleves, date };
}

async function getStatsByDate(classeId, date) {
  if (!date) {
    return { presents: 0, absents: 0, retards: 0, date: null };
  }

  const totalResult = await query(
    'SELECT COUNT(*) AS total FROM eleves WHERE classe_id = $1',
    [classeId]
  );
  const total = parseInt(totalResult.rows[0].total, 10);

  const result = await query(
    `SELECT
       COUNT(CASE WHEN a.statut = 'absent' THEN 1 END) AS absents,
       COUNT(CASE WHEN a.statut = 'retard' THEN 1 END) AS retards
     FROM absences a
     WHERE a.classe_id = $1 AND a.date = $2::date`,
    [classeId, date]
  );

  const absents = parseInt(result.rows[0].absents, 10);
  const retards = parseInt(result.rows[0].retards, 10);
  const presents = total - absents - retards;

  return { date, total, presents, absents, retards };
}

async function getAbsencesByEleve(eleveId, trimestre) {
  let sql = `SELECT a.id, a.date, a.motif, a.statut, a.created_at,
                    c.nom AS classe_nom
             FROM absences a
             JOIN classes c ON c.id = a.classe_id
             WHERE a.eleve_id = $1`;
  const params = [eleveId];

  if (trimestre) {
    // Validation explicite pour éviter tout accès inattendu à l'objet moisParTrimestre
    const trimestreInt = parseInt(trimestre, 10);
    if (![1, 2, 3].includes(trimestreInt)) {
      const err = new Error('Trimestre invalide (doit être 1, 2 ou 3)');
      err.statusCode = 400;
      throw err;
    }
    // Filtrer par trimestre (T1: sept-déc, T2: jan-mars, T3: avr-juin)
    sql += ` AND EXTRACT(MONTH FROM a.date) = ANY($2)`;
    const moisParTrimestre = { 1: [9,10,11,12], 2: [1,2,3], 3: [4,5,6] };
    params.push(moisParTrimestre[trimestreInt]);
  }

  sql += ' ORDER BY a.date DESC';
  const result = await query(sql, params);
  return result.rows;
}

async function enregistrerAppel(classeId, date, presences, enseignantId) {
  // Vérifier que l'enseignant est affecté à cette classe
  const check = await query(
    'SELECT id FROM enseignant_classes WHERE utilisateur_id = $1 AND classe_id = $2',
    [enseignantId, classeId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Vous n\'êtes pas affecté à cette classe');
    err.statusCode = 403;
    throw err;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;

    for (const p of presences) {
      const { eleve_id, statut, motif = 'sans_motif' } = p;

      const existing = await client.query(
        'SELECT id FROM absences WHERE eleve_id = $1 AND enseignant_id = $2 AND classe_id = $3 AND date = $4::date',
        [eleve_id, enseignantId, classeId, date]
      );

      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE absences SET statut = $1, motif = $2 WHERE id = $3',
          [statut, motif, existing.rows[0].id]
        );
        updated++;
      } else {
        await client.query(
          'INSERT INTO absences (eleve_id, enseignant_id, classe_id, date, motif, statut) VALUES ($1, $2, $3, $4::date, $5, $6)',
          [eleve_id, enseignantId, classeId, date, motif, statut]
        );
        inserted++;
      }
    }

    await client.query('COMMIT');
    return { message: `Appel enregistré : ${inserted} créés, ${updated} mis à jour`, inserted, updated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateAbsence(absenceId, data, enseignantId) {
  const check = await query(
    'SELECT id FROM absences WHERE id = $1 AND enseignant_id = $2',
    [absenceId, enseignantId]
  );
  if (check.rows.length === 0) {
    const err = new Error('Absence non trouvée ou accès refusé');
    err.statusCode = 403;
    throw err;
  }

  const { statut, motif } = data;
  const result = await query(
    'UPDATE absences SET statut = COALESCE($1, statut), motif = COALESCE($2, motif) WHERE id = $3 RETURNING *',
    [statut || null, motif || null, absenceId]
  );
  return result.rows[0];
}

module.exports = { getAbsencesByClasse, getStatsByDate, getAbsencesByEleve, enregistrerAppel, updateAbsence };
