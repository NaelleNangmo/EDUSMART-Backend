'use strict';

const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/auth');
const { query } = require('../../config/db');

// GET /api/dashboard/enseignant
router.get('/enseignant', verifyToken, requireRole('enseignant'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const etabId = req.user.etablissement_id;

    // Profil utilisateur
    const userResult = await query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.role,
              e.nom AS etablissement_nom, e.ville
       FROM utilisateurs u JOIN etablissements e ON e.id = u.etablissement_id
       WHERE u.id = $1`,
      [userId]
    );

    // KPIs
    const nbElevesResult = await query(
      `SELECT COUNT(DISTINCT el.id) AS nb
       FROM eleves el
       JOIN enseignant_classes ec ON ec.classe_id = el.classe_id
       WHERE ec.utilisateur_id = $1`,
      [userId]
    );

    const moyenneResult = await query(
      `SELECT ROUND(AVG(n.valeur), 1) AS moyenne
       FROM notes n
       JOIN evaluations ev ON ev.id = n.evaluation_id
       WHERE ev.enseignant_id = $1 AND ev.trimestre = 2`,
      [userId]
    );

    const absNonJustResult = await query(
      `SELECT COUNT(*) AS nb FROM absences
       WHERE enseignant_id = $1 AND motif = 'sans_motif' AND statut = 'absent'`,
      [userId]
    );

    const msgsNonLusResult = await query(
      'SELECT COUNT(*) AS nb FROM messages WHERE destinataire_id = $1 AND lu = FALSE',
      [userId]
    );

    // Avancement saisie notes par classe
    const avancementResult = await query(
      `SELECT c.id, c.nom AS classe_nom,
              COUNT(DISTINCT el.id) AS total_eleves,
              COUNT(DISTINCT n.eleve_id) AS eleves_notes
       FROM enseignant_classes ec
       JOIN classes c ON c.id = ec.classe_id
       LEFT JOIN eleves el ON el.classe_id = c.id
       LEFT JOIN evaluations ev ON ev.classe_id = c.id AND ev.enseignant_id = $1 AND ev.trimestre = 2
       LEFT JOIN notes n ON n.evaluation_id = ev.id
       WHERE ec.utilisateur_id = $1
       GROUP BY c.id, c.nom`,
      [userId]
    );

    const avancement_saisie = avancementResult.rows.map((row) => {
      const total = parseInt(row.total_eleves, 10);
      const notes = parseInt(row.eleves_notes, 10);
      const pourcentage = total > 0 ? Math.round((notes / total) * 100) : 0;
      return { classe_id: row.id, classe_nom: row.classe_nom, total_eleves: total, eleves_notes: notes, pourcentage };
    });

    // Activité récente (10 dernières actions)
    const activiteResult = await query(
      `(SELECT 'note' AS type, 'Notes saisies' AS titre,
               c.nom AS detail, n.updated_at AS date
        FROM notes n
        JOIN evaluations ev ON ev.id = n.evaluation_id
        JOIN classes c ON c.id = ev.classe_id
        WHERE ev.enseignant_id = $1
        ORDER BY n.updated_at DESC LIMIT 3)
       UNION ALL
       (SELECT 'absence' AS type, 'Absence enregistrée' AS titre,
               c.nom AS detail, a.created_at AS date
        FROM absences a
        JOIN classes c ON c.id = a.classe_id
        WHERE a.enseignant_id = $1
        ORDER BY a.created_at DESC LIMIT 3)
       UNION ALL
       (SELECT 'message' AS type, 'Message reçu' AS titre,
               m.objet AS detail, m.created_at AS date
        FROM messages m
        WHERE m.destinataire_id = $1
        ORDER BY m.created_at DESC LIMIT 2)
       UNION ALL
       (SELECT 'appreciation' AS type, 'Appréciation rédigée' AS titre,
               CONCAT(el.nom, ' ', el.prenom) AS detail, ap.updated_at AS date
        FROM appreciations ap
        JOIN eleves el ON el.id = ap.eleve_id
        WHERE ap.enseignant_id = $1
        ORDER BY ap.updated_at DESC LIMIT 2)
       ORDER BY date DESC LIMIT 10`,
      [userId]
    );

    return res.json({
      success: true,
      utilisateur: userResult.rows[0],
      kpis: {
        nb_eleves: parseInt(nbElevesResult.rows[0].nb, 10),
        moyenne_generale: parseFloat(moyenneResult.rows[0].moyenne) || 0,
        absences_non_justifiees: parseInt(absNonJustResult.rows[0].nb, 10),
        messages_non_lus: parseInt(msgsNonLusResult.rows[0].nb, 10),
      },
      avancement_saisie,
      activite_recente: activiteResult.rows,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/dashboard/admin
router.get('/admin', verifyToken, requireRole('proviseur'), async (req, res, next) => {
  try {
    const etabId = req.user.etablissement_id;

    const [enseignants, eleves, classes, matieres] = await Promise.all([
      query('SELECT COUNT(*) FROM utilisateurs WHERE etablissement_id = $1 AND role = $2', [etabId, 'enseignant']),
      query('SELECT COUNT(*) FROM eleves WHERE etablissement_id = $1', [etabId]),
      query('SELECT COUNT(*) FROM classes WHERE etablissement_id = $1', [etabId]),
      query('SELECT COUNT(*) FROM matieres'),
    ]);

    const alertesResult = await query(
      `SELECT COUNT(*) AS nb FROM absences a
       JOIN eleves el ON el.id = a.eleve_id
       WHERE el.etablissement_id = $1 AND a.motif = 'sans_motif'`,
      [etabId]
    );

    return res.json({
      success: true,
      kpis: {
        nb_enseignants: parseInt(enseignants.rows[0].count, 10),
        nb_eleves: parseInt(eleves.rows[0].count, 10),
        nb_classes: parseInt(classes.rows[0].count, 10),
        nb_matieres: parseInt(matieres.rows[0].count, 10),
      },
      alertes: {
        absences_non_justifiees: parseInt(alertesResult.rows[0].nb, 10),
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
