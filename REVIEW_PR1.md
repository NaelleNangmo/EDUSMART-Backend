# Revue de Code — PR #1 : feature/auth-api

**Branche reviewée :** `feature/auth-api`  
**Reviewer :** Compte F  
**Date :** 27 mai 2026  
**Statut :** ✅ Approuvée avec corrections mineures appliquées

---

## Résumé

La PR #1 implémente le module d'authentification JWT et l'ensemble de l'architecture backend.
Le code est globalement propre, bien structuré et suit les bonnes pratiques REST.

---

## Points positifs ✅

- Architecture modulaire claire (`modules/auth/`, `modules/classes/`, etc.)
- Séparation controller/service/routes bien respectée
- Middleware `verifyToken` et `requireRole` correctement implémentés
- Validation des inputs avec `express-validator` sur toutes les routes sensibles
- Gestion d'erreurs centralisée via `errorHandler`
- Utilisation de `bcryptjs` avec salt factor 12 (bonne pratique)
- Requêtes SQL paramétrées (protection contre les injections SQL)
- `'use strict'` présent dans tous les fichiers

---

## Problèmes détectés et corrections appliquées

### 1. `auth.service.js` — Timing attack sur la vérification du mot de passe

**Problème :** Si l'utilisateur n'existe pas, on lève une erreur immédiatement sans appeler `bcrypt.compare`. Cela crée une différence de temps mesurable entre "utilisateur inexistant" et "mauvais mot de passe", permettant une énumération d'emails.

**Avant :**
```js
if (result.rows.length === 0) {
  const err = new Error('Email ou mot de passe incorrect');
  err.statusCode = 401;
  throw err;
}
const isValid = await bcrypt.compare(motDePasse, user.mot_de_passe);
```

**Après (correction appliquée) :** Utilisation d'un hash factice pour normaliser le temps de réponse.

### 2. `auth.routes.js` — Validation `etablissement_id` insuffisante

**Problème :** `isInt({ min: 1 })` accepte des valeurs comme `1.5` si envoyées en string.

**Correction :** Ajout de `.toInt()` pour forcer la conversion entière.

### 3. `admin.routes.js` — Pas de rate limiting sur la création d'enseignants

**Observation :** La route `POST /api/admin/enseignants` n'a pas de protection contre les créations en masse. Recommandation d'ajouter `express-rate-limit` en production.

### 4. `notes.service.js` — Transaction non atomique en cas d'erreur partielle

**Problème :** Dans `saisirNotes`, si une note est invalide (valeur > 20), l'erreur est levée APRÈS que certaines notes ont déjà été insérées dans la transaction. Le ROLLBACK est bien appelé, mais la validation devrait être faite AVANT d'ouvrir la transaction.

**Correction appliquée :** Validation préalable de toutes les notes avant BEGIN.

### 5. `messages.service.js` — `getMessageById` retourne 403 pour un message inexistant

**Observation :** Si le message n'existe pas du tout (vs accès refusé), le code retourne 403 au lieu de 404. C'est acceptable pour la sécurité (ne pas révéler l'existence d'un message), mais mérite un commentaire explicatif.

---

## Corrections appliquées dans cette branche

Voir les commits de `review/pr1` pour les corrections détaillées.
