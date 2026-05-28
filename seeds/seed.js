'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const MOT_DE_PASSE = 'noutong1';

const NOMS_SUPPLEMENTAIRES = [
  ['ATANGANA','Pierre'],['BELINGA','Rose'],['BIKELE','Samuel'],['BONGO','Yvette'],
  ['DJOUMESSI','Alain'],['EBANGA','Cécile'],['EKOTTO','Rodrigue'],['ELOUNDOU','Martine'],
  ['ENGAMBA','Thierry'],['ETOA','Sandrine'],['EWANE','Bertrand'],['EYENGA','Nadège'],
  ['FOUDA','Christophe'],['GUIFO','Laure'],['HAMADOU','Ibrahim'],['ISSA','Fatima'],
  ['KAMDEM','Serge'],['KENFACK','Brigitte'],['KOUAM','Didier'],['KUETE','Estelle'],
  ['LEKENE','Franck'],['MANGA','Solange'],['MBARGA','Hervé'],['MBELE','Joëlle'],
  ['MBIA','Stéphane'],['MBOUA','Véronique'],['MEKONGO','Arnaud'],['MENYE','Claudine'],
  ['MESSINA','Gaston'],['METOGO','Isabelle'],['MFOU','Lionel'],['MINKO','Aurore'],
  ['MINYEM','Cédric'],['MOUKOURI','Danielle'],['MVONDO','Éric'],['NANGA','Sylvestre'],
  ['NDZANA','Pauline'],['NGAH','Romuald'],['NGONO','Adèle'],['NGUEMA','Blaise'],
  ['NJIKE','Carole'],['NKOA','Désiré'],['NKOULOU','Élise'],['NTONGA','Fabrice'],
  ['NYOBE','Gisèle'],['OBAMA','Henri'],['OMBOLO','Irène'],['OWONA','Jacques'],
  ['OYONO','Karine'],['SAMBA','Léon'],['TCHOUPO','Mireille'],['TENE','Nicolas'],
  ['TSIMI','Odette'],['WAMBA','Pascal'],['YOMBI','Quentin'],['ZANG','Rachel'],
  ['ZOGO','Serge'],['ABOMO','Thérèse'],['AKONO','Ulrich'],['ALIMA','Vanessa'],
  ['AMOUGOU','William'],['ANDELA','Xavière'],['ASSAMBA','Yves'],['AYISSI','Zoé'],
];

/**
 * Construit un INSERT batch depuis un tableau de lignes
 * @param {string} table
 * @param {string[]} columns
 * @param {Array[]} rows  — tableau de tableaux de valeurs
 * @returns {{ text: string, values: any[] }}
 */
function buildBatchInsert(table, columns, rows) {
  const placeholders = rows.map((row, i) =>
    `(${row.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
  ).join(', ');
  const values = rows.flat();
  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} RETURNING id`,
    values,
  };
}

async function seed() {
  const client = await pool.connect();
  console.log('[SEED] Connexion établie. Début du seed…');

  try {
    await client.query('BEGIN');

    // ── Nettoyage ────────────────────────────────────────────
    await client.query(
      'TRUNCATE TABLE messages, appreciations, absences, notes, evaluations, enseignant_classes, eleves, matieres, classes, utilisateurs, etablissements RESTART IDENTITY CASCADE'
    );
    console.log('[SEED] Tables vidées.');

    // ── 1. Établissement ─────────────────────────────────────
    const etabRes = await client.query(
      `INSERT INTO etablissements (nom, ville, type) VALUES ($1, $2, $3) RETURNING id`,
      ["Lycée Bilingue d'Essos", 'Yaoundé', 'lycee']
    );
    const etabId = etabRes.rows[0].id;
    console.log(`[SEED] Établissement créé (id=${etabId})`);

    // ── 2. Hash mot de passe ─────────────────────────────────
    const hash = await bcrypt.hash(MOT_DE_PASSE, 12);

    // ── 3. Utilisateurs (batch) ──────────────────────────────
    const utilisateursData = [
      ['ONANA',  'Paul',        'onana.paul@lycee-essos.edu',        hash, 'proviseur',   etabId],
      ['NKOMO',  'Jean-Paul',   'nkomo.jeanpaul@lycee-essos.edu',    hash, 'enseignant',  etabId],
      ['MBIDA',  'Emmanuel',    'mbida.emmanuel@lycee-essos.edu',    hash, 'enseignant',  etabId],
      ['FOGUE',  'Nathalie',    'fogue.nathalie@lycee-essos.edu',    hash, 'enseignant',  etabId],
      ['NGUELE', 'Marie-Claire','nguele.cpe@lycee-essos.edu',        hash, 'cpe',         etabId],
      ['ZANGA',  'Bernadette',  'zanga.secretariat@lycee-essos.edu', hash, 'secretariat', etabId],
    ];
    const usersQ = buildBatchInsert('utilisateurs',
      ['nom','prenom','email','mot_de_passe','role','etablissement_id'],
      utilisateursData
    );
    const usersRes = await client.query(usersQ);
    const userIds = usersRes.rows.map(r => r.id);
    // index : 0=proviseur, 1=nkomo, 2=mbida, 3=fogue, 4=nguele, 5=zanga
    const nkomoId    = userIds[1];
    const proviseurId = userIds[0];
    const ngueleId   = userIds[4];
    const mbidaId    = userIds[2];
    const zangaId    = userIds[5];
    console.log(`[SEED] ${utilisateursData.length} utilisateurs créés.`);

    // ── 4. Matières (batch) ──────────────────────────────────
    const matieresData = [
      ['Mathématiques',   5, 4],
      ['Physique-Chimie', 4, 3],
      ['Français',        4, 4],
      ['Histoire-Géo',    3, 3],
      ['Anglais',         3, 3],
      ['SVT',             3, 2],
      ['Philosophie',     3, 2],
      ['EPS',             2, 2],
    ];
    const matQ = buildBatchInsert('matieres', ['nom','coefficient','heures_semaine'], matieresData);
    const matRes = await client.query(matQ);
    const mathId = matRes.rows[0].id;
    console.log(`[SEED] ${matieresData.length} matières créées.`);

    // ── 5. Classes (batch) ───────────────────────────────────
    const classesData = [
      ['Terminale C', 'Terminale', etabId],
      ['Première D',  'Première',  etabId],
      ['Seconde C',   'Seconde',   etabId],
      ['Terminale A', 'Terminale', etabId],
      ['Première C',  'Première',  etabId],
    ];
    const clsQ = buildBatchInsert('classes', ['nom','niveau','etablissement_id'], classesData);
    const clsRes = await client.query(clsQ);
    const [classeTermCId, classePremDId, classeSecCId] = clsRes.rows.map(r => r.id);
    console.log(`[SEED] ${classesData.length} classes créées.`);

    // ── 6. Affectations enseignant (batch) ───────────────────
    const affectData = [
      [nkomoId, classeTermCId, mathId, '2024-2025', 2],
      [nkomoId, classePremDId, mathId, '2024-2025', 2],
      [nkomoId, classeSecCId,  mathId, '2024-2025', 2],
    ];
    const affQ = buildBatchInsert('enseignant_classes',
      ['utilisateur_id','classe_id','matiere_id','annee_scolaire','trimestre'],
      affectData
    );
    await client.query(affQ);
    console.log('[SEED] Affectations enseignant créées.');

    // ── 7. Élèves (batch par classe) ─────────────────────────
    const elevesNommes = [
      ['ABANDA','Etienne','MAT-2024-001'],
      ['BIYONG','Marie',  'MAT-2024-002'],
      ['ESSOMBA','Clara', 'MAT-2024-003'],
      ['NDONGO','Noël',   'MAT-2024-004'],
      ['KAMGA','Fatou',   'MAT-2024-005'],
      ['ONANA','Patrick', 'MAT-2024-006'],
      ['ZANG','Sylvie',   'MAT-2024-007'],
    ];

    // Terminale C — 52 élèves
    const termCRows = [];
    for (const [nom, prenom, mat] of elevesNommes) {
      termCRows.push([nom, prenom, mat, classeTermCId, etabId]);
    }
    let counter = 8;
    for (let i = 0; i < 52 - elevesNommes.length; i++) {
      const [nom, prenom] = NOMS_SUPPLEMENTAIRES[i % NOMS_SUPPLEMENTAIRES.length];
      termCRows.push([nom, prenom, `MAT-2024-${String(counter++).padStart(3,'0')}`, classeTermCId, etabId]);
    }

    // Première D — 48 élèves
    const premDRows = [];
    for (let i = 0; i < 48; i++) {
      const [nom, prenom] = NOMS_SUPPLEMENTAIRES[(i + 10) % NOMS_SUPPLEMENTAIRES.length];
      premDRows.push([nom, prenom, `PRD-2024-${String(i+1).padStart(3,'0')}`, classePremDId, etabId]);
    }

    // Seconde C — 47 élèves
    const secCRows = [];
    for (let i = 0; i < 47; i++) {
      const [nom, prenom] = NOMS_SUPPLEMENTAIRES[(i + 20) % NOMS_SUPPLEMENTAIRES.length];
      secCRows.push([nom, prenom, `SEC-2024-${String(i+1).padStart(3,'0')}`, classeSecCId, etabId]);
    }

    const cols = ['nom','prenom','matricule','classe_id','etablissement_id'];
    const termCRes = await client.query(buildBatchInsert('eleves', cols, termCRows));
    const premDRes = await client.query(buildBatchInsert('eleves', cols, premDRows));
    const secCRes  = await client.query(buildBatchInsert('eleves', cols, secCRows));

    const termCIds = termCRes.rows.map(r => r.id);
    const premDIds = premDRes.rows.map(r => r.id);
    console.log(`[SEED] Élèves créés : 52 (Terminale C) + 48 (Première D) + 47 (Seconde C)`);

    // ── 8. Évaluations (batch) ───────────────────────────────
    const evalsData = [
      ['DS',           1, '2024-11-20', 2, classeTermCId, mathId, nkomoId, 2],
      ['DS',           2, '2025-01-15', 2, classeTermCId, mathId, nkomoId, 2],
      ['Interrogation',1, '2024-12-05', 1, classeTermCId, mathId, nkomoId, 2],
      ['DS',           1, '2024-11-25', 2, classePremDId, mathId, nkomoId, 2],
    ];
    const evQ = buildBatchInsert('evaluations',
      ['type','numero','date','coefficient','classe_id','matiere_id','enseignant_id','trimestre'],
      evalsData
    );
    const evRes = await client.query(evQ);
    const [evalDS1Id, evalDS2Id, evalInterro1Id, evalPremDS1Id] = evRes.rows.map(r => r.id);
    console.log('[SEED] Évaluations créées.');

    // ── 9. Notes (batch) ─────────────────────────────────────
    const notesDS2     = [18, 15, 14, 11, 5, 13, 9];
    const notesDS1     = [16, 14, 12, 10, 6, 12, 8];
    const notesInterro = [17, 13, 15,  9, 7, 14, 10];

    const notesRows = [];
    for (let i = 0; i < termCIds.length; i++) {
      const n2 = i < notesDS2.length     ? notesDS2[i]     : parseFloat((Math.random()*14+4).toFixed(1));
      const n1 = i < notesDS1.length     ? notesDS1[i]     : parseFloat((Math.random()*14+4).toFixed(1));
      const ni = i < notesInterro.length ? notesInterro[i] : parseFloat((Math.random()*14+4).toFixed(1));
      notesRows.push([evalDS2Id,     termCIds[i], n2]);
      notesRows.push([evalDS1Id,     termCIds[i], n1]);
      notesRows.push([evalInterro1Id,termCIds[i], ni]);
    }
    for (let i = 0; i < premDIds.length; i++) {
      notesRows.push([evalPremDS1Id, premDIds[i], parseFloat((Math.random()*14+5).toFixed(1))]);
    }
    await client.query(buildBatchInsert('notes', ['evaluation_id','eleve_id','valeur'], notesRows));
    console.log('[SEED] Notes créées.');

    // ── 10. Absences (batch) ─────────────────────────────────
    const absRows = [];
    // KAMGA Fatou (index 4) — 7 absences critiques
    const kamgaId = termCIds[4];
    for (const d of ['2025-01-06','2025-01-08','2025-01-10','2025-01-13','2025-01-14','2025-01-15','2025-01-16']) {
      absRows.push([kamgaId, nkomoId, classeTermCId, d, 'sans_motif', 'absent']);
    }
    // ZANG Sylvie (index 6) — 4 absences
    const zangId = termCIds[6];
    for (const d of ['2025-01-07','2025-01-09','2025-01-13','2025-01-15']) {
      absRows.push([zangId, nkomoId, classeTermCId, d, 'maladie', 'absent']);
    }
    // BIYONG Marie (index 1) — 3 absences
    const biyongId = termCIds[1];
    for (const d of ['2025-01-08','2025-01-10','2025-01-14']) {
      absRows.push([biyongId, nkomoId, classeTermCId, d, 'sans_motif', 'absent']);
    }
    await client.query(
      buildBatchInsert('absences',
        ['eleve_id','enseignant_id','classe_id','date','motif','statut'],
        absRows
      )
    );
    console.log('[SEED] Absences créées.');

    // ── 11. Appréciations (batch) ────────────────────────────
    const textes = [
      "Élève sérieux, participatif. Bons résultats, continue ainsi.",
      "Résultats encourageants. Effort à maintenir pour progresser davantage.",
      "Très bon niveau général. Méthodes solides et autonomie remarquable.",
      "Manque de rigueur. Doit fournir plus d'efforts réguliers.",
      "Niveau insuffisant. Un soutien est nécessaire pour rattraper le programme.",
      "Bonne participation en classe. Les résultats sont satisfaisants.",
      "Élève appliqué(e). Progrès notables depuis le début du trimestre.",
      "Doit améliorer sa concentration et sa régularité dans le travail.",
      "Excellent trimestre. Félicitations pour les efforts fournis.",
      "Des lacunes persistent. Un travail de fond est nécessaire.",
    ];
    const apprecRows = [];
    for (let i = 0; i < 34; i++) {
      apprecRows.push([termCIds[i], nkomoId, classeTermCId, 2, textes[i % textes.length]]);
    }
    for (let i = 0; i < 3; i++) {
      apprecRows.push([premDIds[i], nkomoId, classePremDId, 2, textes[i]]);
    }
    await client.query(
      buildBatchInsert('appreciations',
        ['eleve_id','enseignant_id','classe_id','trimestre','texte'],
        apprecRows
      )
    );
    console.log('[SEED] Appréciations créées.');

    // ── 12. Messages (batch) ─────────────────────────────────
    const msgsData = [
      [proviseurId, nkomoId, 'Réunion pédagogique du lundi 20 janvier 2025',
       "Chers collègues,\n\nJe vous convie à une réunion pédagogique le lundi 20 janvier 2025 à 14h00 en salle des professeurs.\n\nOrdre du jour :\n1. Bilan du 1er trimestre\n2. Points de vigilance assiduité\n3. Calendrier des compositions T2\n4. Questions diverses\n\nCordialement,\nM. ONANA Paul, Proviseur",
       false],
      [ngueleId, nkomoId, 'Suivi assiduité — KAMGA Fatou',
       "Monsieur Nkomo,\n\nJe vous contacte au sujet de l'élève KAMGA Fatou (Terminale C) qui cumule 7 absences ce trimestre.\n\nCordialement,\nMme NGUELE, CPE",
       false],
      [mbidaId, nkomoId, 'Harmonisation du programme T2',
       "Bonjour Jean-Paul,\n\nJe souhaitais qu'on se concerte sur l'avancement du programme de Terminale C pour le T2.\n\nCordialement,\nEmmanuel",
       false],
      [proviseurId, nkomoId, 'Bonne année et objectifs T2',
       "Chers collègues,\n\nJe vous souhaite une excellente année 2025.\n\nCordialement,\nM. ONANA Paul",
       true],
      [zangaId, nkomoId, 'Clôture T1 — rappel dates limites',
       "Bonjour,\n\nRappel : la saisie des notes du T1 doit être finalisée avant le 20 décembre.\n\nMme ZANGA, Secrétariat",
       true],
    ];
    await client.query(
      buildBatchInsert('messages',
        ['expediteur_id','destinataire_id','objet','corps','lu'],
        msgsData
      )
    );
    console.log('[SEED] Messages créés.');

    await client.query('COMMIT');
    console.log('[SEED] ✓ Seed terminé avec succès !');
    console.log('[SEED] Comptes de test (mot de passe : noutong1) :');
    console.log('  - onana.paul@lycee-essos.edu (proviseur)');
    console.log('  - nkomo.jeanpaul@lycee-essos.edu (enseignant)');
    console.log('  - mbida.emmanuel@lycee-essos.edu (enseignant)');
    console.log('  - fogue.nathalie@lycee-essos.edu (enseignant)');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED] ✗ Erreur :', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
