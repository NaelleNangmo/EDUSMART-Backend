# Tests d'Intégration — EDUSMART-CM Backend

## Prérequis

Les tests d'intégration nécessitent :
1. **PostgreSQL** installé et démarré
2. **Base de données** `edusmartdb` créée
3. **Migrations** appliquées : `npm run migrate`
4. **Seeds** chargés : `npm run seed`

## Structure

Les tests d'intégration sont dans `tests/module*.test.js` :

| Fichier | Module | Dépendances |
|---------|--------|-------------|
| `module0.test.js` | Infrastructure & DB | PostgreSQL + migrations + seeds |
| `module1.test.js` | Authentification | PostgreSQL + seeds (utilisateurs) |
| `module2.test.js` | Établissements & Classes | PostgreSQL + seeds |
| `module3.test.js` | Notes & Évaluations | PostgreSQL + seeds |
| `module4.test.js` | Absences | PostgreSQL + seeds |
| `module5.test.js` | Appréciations | PostgreSQL + seeds |
| `module6.test.js` | Messagerie | PostgreSQL + seeds |
| `module7.test.js` | Profil & Administration | PostgreSQL + seeds |
| `module8.test.js` | Dashboard | PostgreSQL + seeds |

## Lancer les tests d'intégration

```bash
# Tous les tests d'intégration
npm run test:integration

# Un module spécifique
npx jest tests/module1.test.js --runInBand --forceExit

# Avec couverture complète (unit + intégration)
npm run test:coverage
```

## Interactions entre modules testées

### Module 1 → Module 2
- Login (M1) fournit le token utilisé dans M2 pour accéder aux classes

### Module 2 → Module 3
- `GET /api/classes/mes-classes` (M2) fournit `classeTermCId` utilisé dans M3

### Module 3 → Module 4
- Les évaluations créées en M3 sont utilisées pour les tests de notes en M4

### Module 6 → Module 7
- Les messages envoyés en M6 sont vérifiés dans le dashboard M8

## Données de test (seeds)

Les tests d'intégration s'appuient sur les données seedées :

| Utilisateur | Email | Rôle | Mot de passe |
|-------------|-------|------|--------------|
| NKOMO Jean-Paul | nkomo.jeanpaul@lycee-essos.edu | enseignant | noutong1 |
| ONANA Paul | onana.paul@lycee-essos.edu | proviseur | noutong1 |
| FOGUE Nathalie | fogue.nathalie@lycee-essos.edu | enseignant | noutong1 |
| MBIDA Emmanuel | mbida.emmanuel@lycee-essos.edu | enseignant | noutong1 |

| Classe | Élèves |
|--------|--------|
| Terminale C | 52 |
| Première D | 48 |
| Seconde C | 47 |

## État actuel

⏳ **En attente de PostgreSQL** — Les tests d'intégration sont prêts mais nécessitent
l'installation et la configuration de PostgreSQL avec les migrations et seeds.

Une fois PostgreSQL disponible :
1. Configurer `backend/.env` avec les credentials DB
2. Lancer `npm run migrate`
3. Lancer `npm run seed`
4. Lancer `npm run test:integration`
