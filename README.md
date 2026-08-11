# CNFCPP — Suivi des activités

## Architecture

- **Frontend statique** → hébergé sur GitHub Pages, fichiers `.html` / `.css` / `.js` séparés
  (sauf `fi.html`, volontairement autonome — voir plus bas).
- **Backend** → Google Apps Script, géré **directement dans l'éditeur en ligne**
  (script.google.com), pas de code source côté GitHub pour ça. Déployé en Web App,
  exposé en API JSON (`doPost`).
- **Base de données** → Google Sheets (1 onglet = 1 sous-section/table, ex: `bilans_siliana`,
  `fi_dossiers`, `fi_stages`).
- **Paramètres partagés** → une Sheet séparée (`1RTpJ2fl7zjOcjJ8H_WtdPthzJDyZpCOrORFib7hBOZI`),
  onglet `smig` (`annee | smig40 | smig48`), lue/écrite par le backend.
- **Exports** → certains modules (Formation initiale) génèrent un export HTML statique
  déposé dans un dossier Google Drive (`1wFWlwvaZAMf7Cv6H0U14miubfdlkk4R3`), organisé en
  sous-dossiers par année.

```
index.html                 → accueil, grille des 5 modules (liens en dur)
css/
  variables.css             → tokens (couleurs, typo, espacements)
  layout.css                → app_shell, panels, tableaux, boutons génériques
  sidebar.css                → sidebar (sections page courante + liens vers autres modules)
  navbar.css                 → navbar sticky
  index.css                  → propre à index.html
js/
  config.js                 → GAS_API_URL uniquement
  api.js                     → client CRUD générique vers Apps Script (list/create/update/delete)
  sidebar_toggle.js           → comportement mobile (hamburger) + surlignage scroll,
                                partagé par toutes les pages module SAUF fi.html (pas de sidebar)
pages/
  ci.html                    → module Crédit d'impôt (Bilans Siliana / Bilans Tunis)
  dti.html/.css/.js          → module Droits de tirage individuels (récap Formation initiale
                                + sections Demandes/Réalisation/Facturation à construire)
  fi.html                    → page AUTONOME dédiée à un dossier "Formation initiale"
                                (HTML + CSS + JS dans le même fichier, voir exception ci-dessous)
```

## Exception volontaire : `fi.html`

Contrairement au reste du projet, `fi.html` regroupe son HTML, son CSS (`<style>`) et son
JS (`<script>`) dans un seul fichier, à la demande explicite. C'est la seule page du projet
sans sidebar (elle ne fait qu'une chose : un dossier Formation initiale à la fois).

## Comment ça tient ensemble

- Les liens (sidebar + cartes d'accueil) sont **écrits en dur** dans chaque `.html` — pas de
  génération dynamique. Renommer/ajouter une page ou une section se fait directement dans le
  HTML concerné (sidebar de la page + carte d'accueil si besoin).
- Sidebar des pages module (`ci.html`, `dti.html`, futures `dtc.html`/`pp.html`/`part.html`) :
  en haut les sections de la page courante (ancres `#section`), en bas des liens plats vers
  les 4 autres modules.
- `dti.html` fonctionne en **mode "une seule section visible"** (`data-nav-mode="toggle"` sur
  `<body>`) : au chargement seule "Formation initiale" est affichée, les autres sections
  n'apparaissent qu'au clic sur leur lien dans la sidebar (géré par `dti.js`,
  `initSectionToggle()`).
- `ci.html` (et les futures pages module simples) restent en scroll-spy classique
  (`sidebar_toggle.js`, `highlightActiveSectionOnScroll`) : toutes les sections visibles,
  simplement surlignées au scroll.
- En mobile (≤1080px), la sidebar passe en position fixe plein écran, masquée par défaut,
  ouverte via `.hamburger_btn`, fermée par le bouton X, un clic sur un lien, ou l'overlay.

## Flux "Formation initiale" (DTI)

- `dti.html#formation_initiale` affiche un **récap** : dossiers de l'année `n-1` (calculée
  côté client), avec Entreprise / Budget / [Reprendre] / [Imprimer]. Le bouton **[Nouveau]**
  ouvre `fi.html` vide.
- `fi.html` : dossier complet (bandeau, formulaire Entreprise/Année/Régime/Budget, 3 catégories
  de stages). Peut s'ouvrir vide (`fi.html`) ou pré-rempli (`fi.html?id=<dossierId>`).
  - **Reprendre / Nouveau** : ouvre une modale qui liste les calculs déjà présents dans le
    dossier Drive de l'année active (`n-1`), + une entrée "Nouveau calcul". Un calcul existant
    relié à une fiche `fi_dossiers` s'ouvre en édition ; sinon il s'ouvre en lecture seule
    (fichier Drive) et un nouveau dossier est préparé avec le même nom d'entreprise.
  - **Smig (icône ⚙)** : ouvre une modale de réglage qui lit/écrit directement l'onglet
    `smig` de la Sheet de paramètres.
  - **Enregistrer** : crée/actualise la ligne `fi_dossiers`, sauvegarde tous les stages
    (`fi_stages`), régénère l'export HTML dans Drive, met à jour `driveUrl`.

## Ajouter un nouveau module (DTC, PP, Partenaires)

1. Dupliquer `pages/ci.html` → renommer, adapter le titre/breadcrumb, la sidebar (sections
   du nouveau module + liens vers les 4 autres), et créer une `<section>` par sous-section.
2. Adapter le CSS et le JavaScript intégrés dans `pages/ci.html` aux champs du module.
3. Ajouter la carte correspondante dans `index.html`.
4. Rien à changer côté backend pour du CRUD simple : les onglets sont créés automatiquement
   au premier `create`. Un besoin spécifique (comme Formation initiale/Drive/Smig) demande
   d'ajouter les actions correspondantes dans Apps Script.

## Backend Apps Script — géré en ligne, `Code.gs` à la racine = copie de référence

Le code qui tourne réellement vit dans l'éditeur Apps Script en ligne (script.google.com),
pas dans ce dépôt. Le fichier **`Code.gs` à la racine de ce dépôt est une copie de
référence/versioning** — colle-la dans l'éditeur en ligne à chaque mise à jour, ce n'est pas
un fichier exécuté localement (pas de dossier `gas/`, pas de `clasp`).

Pour mettre à jour le backend :
1. Aller sur [script.google.com](https://script.google.com), ouvrir le projet "CNFCPP API".
2. Coller le contenu de `Code.gs` (racine du dépôt) dans l'éditeur.
3. **Déployer > Gérer les déploiements > Modifier (icône crayon) > Nouvelle version > Déployer**
   pour que les changements soient pris en compte par l'URL `/exec` existante (repousser un
   "Nouveau déploiement" changerait l'URL et casserait `js/config.js`).

Le backend expose ces actions (via POST, un seul champ `action` dans le corps JSON) :
- `list` / `create` / `update` / `delete` → CRUD générique sur un onglet (`sheet`), routé
  vers sa Sheet dédiée via `GENERIC_SHEET_ROUTES` (voir plus bas).
- `getSmig` → lit le Smig 40h/48h d'une année depuis la Sheet de paramètres.
- `listSmig` / `saveSmig` → liste/écrit l'onglet `smig` complet (utilisé par la modale
  réglages dans `fi.html`).
- `exportToDrive` → génère et dépose l'export HTML d'un calcul Formation initiale dans
  Drive (le fichier embarque aussi les données brutes, rechargeables via `chargerCalcul`),
  retourne `{url, id}`.
- `listCalculs` → liste les fichiers du sous-dossier Drive d'une année donnée
  (`{name, entreprise, budget, url, id}`).
- `chargerCalcul` → relit un export HTML et renvoie ses données embarquées (entreprise,
  année, régime, smig, stages), utilisé par "Reprendre" (`fi.html`) et "Afficher" (`dti.html`).
- `listEses` / `createEse` / `updateEse` / `deleteEse` → CRUD sur la base entreprises
  (Sheet "Base", onglet `eses`, identifiée par numéro de ligne réel `_row`), utilisé par
  `fi.html` (choix entreprise) et `part.html` (section Entreprises).
- `listCabinets` / `createCabinet` / `updateCabinet` / `deleteCabinet` → CRUD sur les
  cabinets de formation (Sheet "Base", onglet `cabinets`, même Sheet que `eses`).
- `listCabsan` / `createCabsan` / `updateCabsan` / `deleteCabsan` → CRUD sur les cabinets
  sanctionnés (Sheet "Base", onglet `cabsan`, colonnes en arabe — voir `part.html`).
- `listUsers` → liste l'onglet `users` de la Sheet de paramètres (connexion, voir `index.html`).

Constantes renseignées en haut de `Code.gs` — pas de Sheet "générique" unique : l'app est
reliée à plusieurs Google Sheets, chacune connue par son propre ID :
- `PARAMS_SHEET_ID` → déjà rempli : `1RTpJ2fl7zjOcjJ8H_WtdPthzJDyZpCOrORFib7hBOZI`
- `FI_EXPORT_ROOT_FOLDER_ID` → déjà rempli : `1wFWlwvaZAMf7Cv6H0U14miubfdlkk4R3`
- `ESES_SHEET_ID` → déjà rempli : `1_Xeo5zwB3fEpIkYUWRzfIw1ESSu95zIQ7KJk0S55qKU` (Sheet
  "Base", contient les onglets `eses`, `cabinets`, `cabsan`)
- `CI_SHEET_ID` → ⚠️ **encore à remplacer** par l'ID de la Sheet dédiée au module Crédit
  d'impôt (onglets `bilans_siliana`, `bilans_tunis`)
- Toute nouvelle Sheet ajoutée au projet doit être déclarée de la même façon (constante
  `..._SHEET_ID` + accesseur), et ses onglets routés dans `GENERIC_SHEET_ROUTES` s'ils
  passent par le CRUD générique.

Et dans `js/config.js` (côté frontend), l'URL du déploiement actif est déjà renseignée :
```javascript
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwZy067A0cNjftl3MJC4-sn4bZYqk86-FBE57BdC25-kY_1KiyFnZ5Kfa9A95k-A_d6/exec";
```

## Pourquoi `text/plain` en POST (`api.js`) ?

Apps Script ne gère pas nativement les requêtes `OPTIONS` (preflight CORS). En envoyant le
JSON avec l'en-tête `Content-Type: text/plain`, le navigateur classe la requête comme
"simple" et ne déclenche pas de preflight — le POST passe directement.

## Pour tester en local

Le frontend fait des appels `fetch()` : ouvrir les fichiers `.html` en double-clic (`file://`)
ne fonctionne pas (CORS bloque `file://` par défaut). Utiliser un vrai serveur local, par
exemple :
```bash
python -m http.server 5500
```
ou l'extension VS Code "Live Server".

## Conventions de code

- Classes CSS en `snake_case` (jamais de `-`).
- CSS imbriqué (nesting natif, pas de préprocesseur).
- CSS et JS en fichiers séparés, référencés en `<link>` / `<script src>` — **sauf `fi.html`**,
  volontairement tout-en-un.
- Icônes : Bootstrap Icons (CDN).
- Pas de footer sur les pages.
