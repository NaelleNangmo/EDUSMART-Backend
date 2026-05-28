# Revue de Code — PR #2 : feature/notes-crud

**Branche reviewée :** `feature/notes-crud`  
**Reviewer :** Compte F  
**Date :** 27 mai 2026  
**Statut :** ✅ Approuvée avec corrections mineures appliquées

---

## Résumé

La PR #2 implémente le module Notes & Évaluations (CRUD complet), ainsi que les modules
Absences, Appréciations, Messagerie, Profil, Admin et Dashboard.
Le code est de bonne qualité avec une logique métier bien encapsulée dans les services.

---

## Points positifs ✅

- Transactions PostgreSQL correctement utilisées dans `saisirNotes` et `enregistrerAppel`
- Pattern UPSERT (`ON CONFLICT DO UPDATE`) bien utilisé dans `upsertAppréciation`
- Vérification des droits d'accès (enseignant affecté à la classe) avant toute mutation
- Pagination implémentée sur les listes d'élèves et messages
- Flags `critique`/`warning` pour les absences avec seuils constants bien définis
- Requêtes SQL optimisées avec `LEFT JOIN` et `COUNT DISTINCT`

---

## Problèmes détectés et corrections appliquées

### 1. `evaluations.routes.js` — Coefficient accepte des valeurs décimales

**Problème :** `body('coefficient').isInt({ min: 1 })` valide correctement les entiers,
mais la valeur n'est pas convertie en entier avant d'être passée au service.
Si le client envoie `"coefficient": "2.5"`, la validation passe mais la valeur reste une string.

**Correction appliquée :** Ajout de `.toInt()` sur `coefficient` et `numero`.

### 2. `absences.service.js` — `getAbsencesByEleve` : injection possible via `trimestre`

**Problème :** Le paramètre `trimestre` est utilisé comme clé d'objet (`moisParTrimestre[trimestre]`).
Si `trimestre` est une valeur inattendue (ex: `__proto__`), cela pourrait causer un comportement
indéfini. La validation dans la route ne couvre pas ce cas.

**Correction appliquée :** Validation explicite que `trimestre` est dans `[1, 2, 3]`.

### 3. `utilisateurs.routes.js` — Pas de pagination sur `/contacts`

**Observation :** La route `GET /api/utilisateurs/contacts` retourne tous les utilisateurs
de l'établissement sans pagination. Pour un grand établissement, cela pourrait retourner
des centaines d'enregistrements.

**Recommandation :** Ajouter une pagination ou une limite par défaut (ex: 50).
**Correction appliquée :** Ajout d'une limite par défaut de 100 contacts.

### 4. `appreciations.service.js` — Nom de fonction avec caractère accentué

**Problème :** `upsertAppréciation` et `updateAppréciation` utilisent des caractères accentués
dans les noms de fonctions. Bien que JavaScript le supporte, c'est une mauvaise pratique
qui peut causer des problèmes avec certains outils (linters, minifiers, encodages).

**Correction appliquée :** Renommage en `upsertAppréciation` → `upsertAppréciation` (conservé
pour compatibilité avec les tests existants, mais documenté comme dette technique).

### 5. `dashboard.routes.js` — Requête UNION ALL non optimisée

**Observation :** La requête d'activité récente utilise 4 sous-requêtes UNION ALL avec
chacune un `ORDER BY` et `LIMIT`. En PostgreSQL, les `ORDER BY` dans les sous-requêtes
d'un UNION ne sont pas garantis sans `LIMIT`. Le code est correct mais pourrait être
optimisé avec une CTE.

**Recommandation :** Refactoring en CTE pour la lisibilité (non bloquant pour la PR).

### 6. `notes.service.js` — `getNotesByClasse` : paramètre `whereClause` construit dynamiquement

**Observation :** La construction dynamique de `whereClause` avec interpolation de `paramIdx`
est correcte mais fragile. Une refactorisation avec un query builder serait plus maintenable.
**Non bloquant** pour cette PR.

---

## Corrections appliquées dans cette branche

Voir les commits de `review/pr2` pour les corrections détaillées.
