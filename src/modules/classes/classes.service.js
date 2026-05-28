'use strict';

const { query } = require('../../config/db');

async function getClassesByEtablissement(etablissementId) {
  const result = await query(
    `SELECT c.id, c.nom, c.niveau,
            COUNT(DISTINCT e.id) AS nb_eleves
     FROM classes c
     LEFT JOIN eleves e ON e.classe_id = c.id
     WHERE c.etablissement_id = $1
     GROUP BY c.id
     ORDER BY c.niveau, c.nom`,
    [etablissementId]
  );
  return result.rows;
}

async function getMesClasses(enseignantId) {
  const result = await query(
    `SELECT c.id, c.nom, c.niveau,
            m.id AS matiere_id, m.nom AS matiere_nom, m.coefficient, m.heures_semaine,
            ec.annee_scolaire, ec.trimestre,
            COUNT(DISTINCT el.id) AS nb_eleves,
            COUNT(DISTINCT ap.id) AS nb_appreciations,
            (SELECT COUNT(*) FROM evaluations ev WHERE ev.classe_id = c.id AND ev.enseignant_id = $1 AND ev.trimestre = ec.trimestre) AS nb_evaluations
     FROM enseignant_classes ec
     JOIN classes c ON c.id = ec.classe_id
     JOIN matieres m ON m.id = ec.matiere_id
     LEFT JOIN eleves el ON el.classe_id = c.id
     LEFT JOIN appreciations ap ON ap.classe_id = c.id AND ap.enseignant_id = $1 AND ap.trimestre = ec.trimestre
     WHERE ec.utilisateur_id = $1
     GROUP BY c.id, c.nom, c.niveau, m.id, m.nom, m.coefficient, m.heures_semaine, ec.annee_scolaire, ec.trimestre
     ORDER BY c.niveau DESC, c.nom`,
    [enseignantId]
  );
  return result.rows;
}

async function getClasseById(classeId) {
  const result = await query(
    `SELECT c.id, c.nom, c.niveau, c.etablissement_id,
            COUNT(DISTINCT e.id) AS nb_eleves
     FROM classes c
     LEFT JOIN eleves e ON e.classe_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [classeId]
  );

  if (result.rows.length === 0) {
    const err = new Error('Classe non trouvée');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function getElevesByClasse(classeId, page = 1, limit = 100) {
  // Vérifier que la classe existe
  const classeCheck = await query('SELECT id FROM classes WHERE id = $1', [classeId]);
  if (classeCheck.rows.length === 0) {
    const err = new Error('Classe non trouvée');
    err.statusCode = 404;
    throw err;
  }

  const offset = (page - 1) * limit;
  const result = await query(
    `SELECT id, nom, prenom, matricule, classe_id
     FROM eleves
     WHERE classe_id = $1
     ORDER BY nom, prenom
     LIMIT $2 OFFSET $3`,
    [classeId, limit, offset]
  );

  const countResult = await query('SELECT COUNT(*) FROM eleves WHERE classe_id = $1', [classeId]);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    eleves: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

module.exports = { getClassesByEtablissement, getMesClasses, getClasseById, getElevesByClasse };
