# EDUSMART-CM — Documentation API

Base URL : `http://localhost:3001/api`

Toutes les réponses sont en JSON. Les routes protégées nécessitent le header :
```
Authorization: Bearer <token>
```

---

## Authentification

### POST /api/auth/login
Connexion d'un utilisateur.

**Body :**
```json
{ "email": "string", "mot_de_passe": "string", "etablissement_id": 1 }
```
**Réponse 200 :**
```json
{
  "success": true,
  "token": "eyJ...",
  "utilisateur": { "id": 1, "nom": "NKOMO", "prenom": "Jean-Paul", "email": "...", "role": "enseignant", "etablissement": { "id": 1, "nom": "...", "ville": "..." } }
}
```

### POST /api/auth/logout
Déconnexion (JWT stateless — côté client). **Auth requise.**

**Réponse 200 :** `{ "success": true, "message": "Déconnexion réussie" }`

### GET /api/auth/me
Profil de l'utilisateur connecté. **Auth requise.**

**Réponse 200 :** `{ "success": true, "utilisateur": { ... } }`

### PUT /api/auth/change-password
Changer le mot de passe. **Auth requise.**

**Body :** `{ "ancien_mot_de_passe": "string", "nouveau_mot_de_passe": "string" }`

**Réponse 200 :** `{ "success": true, "message": "Mot de passe modifié avec succès" }`

---

## Établissements

### GET /api/etablissements
Liste tous les établissements. **Public.**

**Réponse 200 :** `{ "success": true, "etablissements": [ { "id": 1, "nom": "...", "ville": "...", "type": "lycee" } ] }`

---

## Classes

### GET /api/classes
Toutes les classes de l'établissement. **Auth requise.**

### GET /api/classes/mes-classes
Classes assignées à l'enseignant connecté. **Auth requise. Rôle : enseignant.**

**Réponse 200 :**
```json
{
  "success": true,
  "classes": [
    { "id": 1, "nom": "Terminale C", "niveau": "Terminale", "matiere_nom": "Mathématiques",
      "coefficient": 5, "heures_semaine": 4, "nb_eleves": 52, "nb_appreciations": 34 }
  ]
}
```

### GET /api/classes/:id
Détail d'une classe. **Auth requise.**

**Réponse 404** si classe inexistante.

### GET /api/classes/:id/eleves
Élèves d'une classe. **Auth requise.**

**Query params :** `?page=1&limit=100`

**Réponse 200 :**
```json
{
  "success": true,
  "eleves": [ { "id": 1, "nom": "ABANDA", "prenom": "Etienne", "matricule": "MAT-2024-001" } ],
  "pagination": { "page": 1, "limit": 100, "total": 52, "pages": 1 }
}
```

---

## Évaluations

### POST /api/evaluations
Créer une évaluation. **Auth requise. Rôle : enseignant.**

**Body :**
```json
{ "type": "DS", "numero": 2, "coefficient": 2, "date": "2025-01-15",
  "classe_id": 1, "matiere_id": 1, "trimestre": 2 }
```
**Réponse 201 :** `{ "success": true, "evaluation": { ... } }`

---

## Notes

### GET /api/notes/:classe_id
Notes d'une classe avec classement. **Auth requise.**

**Query params :** `?evaluation_id=1&trimestre=2&page=1&limit=100`

**Réponse 200 :**
```json
{
  "success": true,
  "evaluations": [ ... ],
  "eleves": [ { "eleve_id": 1, "nom": "ABANDA", "moyenne_generale": "16.50", "rang": 1 } ],
  "pagination": { ... }
}
```

### GET /api/notes/:classe_id/stats
Statistiques d'une classe. **Auth requise.**

**Réponse 200 :**
```json
{
  "success": true,
  "stats": { "nb_eleves": "52", "moyenne_classe": "11.40", "meilleure_note": "18.0", "note_la_plus_basse": "4.5", "nb_notes_saisies": "52" }
}
```

### POST /api/notes
Saisie en lot. **Auth requise. Rôle : enseignant.**

**Body :**
```json
{ "evaluation_id": 1, "notes": [ { "eleve_id": 1, "valeur": 14.5 }, ... ] }
```
**Réponse 201 :** `{ "success": true, "inserted": 52, "updated": 0 }`

### PUT /api/notes/:id
Modifier une note. **Auth requise. Rôle : enseignant.**

**Body :** `{ "valeur": 15.0 }`

### DELETE /api/notes/:id
Supprimer une note. **Auth requise. Rôle : enseignant.**

---

## Absences

### GET /api/absences/:classe_id
Liste des élèves avec statut de présence. **Auth requise.**

**Query params :** `?date=2025-01-15`

**Réponse 200 :**
```json
{
  "success": true,
  "eleves": [
    { "id": 1, "nom": "KAMGA", "prenom": "Fatou", "nb_absences_trimestre": 7,
      "statut_jour": "absent", "flag": "critique" }
  ]
}
```

### POST /api/absences/appel
Enregistrer l'appel complet (idempotent). **Auth requise. Rôle : enseignant.**

**Body :**
```json
{
  "classe_id": 1,
  "date": "2025-01-15",
  "presences": [ { "eleve_id": 1, "statut": "present" }, { "eleve_id": 2, "statut": "absent", "motif": "maladie" } ]
}
```
**Réponse 201 :** `{ "success": true, "inserted": 50, "updated": 2 }`

### PUT /api/absences/:id
Modifier une absence. **Auth requise. Rôle : enseignant.**

**Body :** `{ "statut": "present", "motif": "maladie" }`

### GET /api/absences/eleve/:eleve_id
Historique des absences d'un élève. **Auth requise.**

**Query params :** `?trimestre=2`

### GET /api/absences/:classe_id/stats
Compteurs présents/absents/retards. **Auth requise.**

**Query params :** `?date=2025-01-15`

---

## Appréciations

### GET /api/appreciations/:classe_id
Liste élèves avec statut appréciation. **Auth requise.**

**Query params :** `?trimestre=2`

**Réponse 200 :**
```json
{
  "success": true,
  "eleves": [
    { "eleve_id": 1, "nom": "ABANDA", "appreciation_id": 5,
      "texte": "Élève sérieux...", "statut": "redigee" }
  ]
}
```

### GET /api/appreciations/:classe_id/stats
Stats de complétion. **Auth requise.**

**Réponse 200 :** `{ "success": true, "stats": { "total": 52, "redigees": 34, "en_attente": 18, "pourcentage": 65 } }`

### POST /api/appreciations
Créer/mettre à jour une appréciation (upsert). **Auth requise. Rôle : enseignant.**

**Body :** `{ "eleve_id": 1, "classe_id": 1, "trimestre": 2, "texte": "Élève sérieux..." }`

**Réponse 201 :** `{ "success": true, "appreciation": { ... } }`

### PUT /api/appreciations/:id
Modifier une appréciation. **Auth requise. Rôle : enseignant.**

**Body :** `{ "texte": "Nouveau texte..." }`

---

## Messagerie

### GET /api/messages/inbox
Boîte de réception. **Auth requise.**

**Query params :** `?page=1&limit=20`

### GET /api/messages/sent
Messages envoyés. **Auth requise.**

### GET /api/messages/unread-count
Nombre de messages non lus. **Auth requise.**

**Réponse 200 :** `{ "success": true, "count": 3 }`

### GET /api/messages/:id
Détail d'un message (marque comme lu). **Auth requise.**

**Réponse 403** si le message n'appartient pas à l'utilisateur.

### POST /api/messages
Envoyer un message. **Auth requise.**

**Body :** `{ "destinataire_id": 1, "objet": "Réunion", "corps": "...", "piece_jointe_url": null }`

**Réponse 201 :** `{ "success": true, "message": { ... } }`

### DELETE /api/messages/:id
Supprimer un message. **Auth requise.**

---

## Profil

### GET /api/profile
Profil complet. **Auth requise.**

### PUT /api/profile
Modifier nom/prénom. **Auth requise.**

**Body :** `{ "nom": "NKOMO", "prenom": "Jean-Paul" }`

### PUT /api/profile/password
Changer le mot de passe. **Auth requise.**

**Body :** `{ "ancien_mot_de_passe": "...", "nouveau_mot_de_passe": "..." }`

---

## Administration (Rôle : proviseur)

### GET /api/admin/stats
Stats globales de l'établissement.

**Réponse 200 :** `{ "stats": { "nb_enseignants": 24, "nb_eleves": 612, "nb_classes": 14, "nb_matieres": 18 } }`

### GET /api/admin/alertes
Alertes et signalements.

**Réponse 200 :** `{ "alertes": [ { "type": "error", "titre": "3 saisies en retard", "description": "..." } ] }`

### GET /api/admin/enseignants
Liste des enseignants avec statut.

### POST /api/admin/enseignants
Créer un compte enseignant.

**Body :** `{ "nom": "...", "prenom": "...", "email": "...", "mot_de_passe": "..." }`

### POST /api/admin/classes
Créer une classe.

**Body :** `{ "nom": "Terminale E", "niveau": "Terminale" }`

---

## Dashboard

### GET /api/dashboard/enseignant
Dashboard agrégé enseignant. **Auth requise. Rôle : enseignant.**

**Réponse 200 :**
```json
{
  "success": true,
  "utilisateur": { ... },
  "kpis": { "nb_eleves": 147, "moyenne_generale": 11.8, "absences_non_justifiees": 3, "messages_non_lus": 3 },
  "avancement_saisie": [ { "classe_id": 1, "classe_nom": "Terminale C", "total_eleves": 52, "eleves_notes": 45, "pourcentage": 87 } ],
  "activite_recente": [ { "type": "note", "titre": "Notes saisies", "detail": "Terminale C", "date": "..." } ]
}
```

### GET /api/dashboard/admin
Dashboard agrégé administrateur. **Auth requise. Rôle : proviseur.**

---

## Contacts

### GET /api/utilisateurs/contacts
Liste des contacts de l'établissement. **Auth requise.**

**Réponse 200 :** `{ "success": true, "contacts": [ { "id": 1, "nom": "ONANA", "prenom": "Paul", "role": "proviseur" } ] }`

---

## Codes d'erreur

| Code | Signification |
|------|---------------|
| 400  | Données invalides (validation) |
| 401  | Non authentifié (token manquant/invalide/expiré) |
| 403  | Accès refusé (rôle insuffisant ou ressource d'un autre utilisateur) |
| 404  | Ressource non trouvée |
| 409  | Conflit (email déjà utilisé) |
| 500  | Erreur interne du serveur |

Toutes les erreurs retournent :
```json
{ "success": false, "message": "Description de l'erreur" }
```
