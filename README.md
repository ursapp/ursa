# URSAPP — CNFCPP · UR Siliana (suivi des activités)

Application web interne de suivi des activités de l'Unité Régionale de Siliana du CNFCPP :
crédit d'impôt (CI), droits de tirage individuels et collectifs (DTI / DTC), promotion
professionnelle (PP : campagnes, demandes, dossiers, inscrits, classes, modules, PFE),
partenaires, documents, coordination.

## Sommaire

1. [Architecture](#1-architecture)
2. [Arborescence](#2-arborescence)
3. [Pages](#3-pages)
4. [Navigation et paramètres d'URL](#4-navigation-et-paramètres-durl)
5. [Authentification et sessions](#5-authentification-et-sessions)
6. [Briques JS partagées](#6-briques-js-partagées)
7. [Briques CSS partagées](#7-briques-css-partagées)
8. [Spinner (chargement)](#8-spinner-chargement)
9. [Backend Apps Script](#9-backend-apps-script)
10. [Flux métier](#10-flux-métier)
11. [Développement local](#11-développement-local)
12. [Conventions de code](#12-conventions-de-code)
13. [Compléments hors de l'archive](#13-compléments-hors-de-larchive)

---

## 1. Architecture

| Couche | Technologie | Détail |
|---|---|---|
| Frontend | HTML / CSS / JS statiques | Hébergé sur GitHub Pages. Aucune étape de build, aucun framework. |
| Backend | Google Apps Script (Web App) | API JSON unique, `doPost`, un champ `action` par appel. Code qui tourne **dans l'éditeur en ligne** (script.google.com) ; `Code.gs` à la racine en est la copie de référence. |
| Données tabulaires | Google Sheets | 3 Sheets (Paramètres, Base, PP), chacune identifiée par son ID dans `Code.gs` (voir §9.4). |
| Données « fichier » | Google Drive | Un fichier HTML par entité (calcul FI, plan, bilan CI, classe, module), qui embarque ses données ; plusieurs dossiers (voir §9.4). |
| Bibliothèques | Bootstrap Icons (CDN), SheetJS `xlsx@0.18.5` (CDN) | SheetJS : import/export Excel dans `class`, `mod`, `pfe`, `plan`, `pp`. |

Toutes les pages parlent au même déploiement (`GAS_API_URL`, `js/config.js`).

## 2. Arborescence

Toutes les pages sont à la **racine** (pas de dossier `pages/`).

```
Code.gs               Backend Apps Script (copie de référence, voir §9)
index.html            Accueil : connexion, cartes des modules, outils transverses
ci.html               Crédit d'impôt                       (sidebar)
dti.html              Droits de tirage individuels         (sidebar)
dtc.html              Droits de tirage collectifs          (sidebar)
pp.html               Promotion professionnelle            (sidebar)
part.html             Partenaires                          (sidebar)
docs.html             Documents                            (sidebar)

prosp.html            Prospections                          (page autonome)
fi.html               Dossier Formation initiale (calcul)   (page autonome)
plan.html             Plan DTI                              (page autonome)
bilan.html            Bilan entreprise (CI)                 (page autonome)
class.html            Formation à distance (classe PP)      (page autonome)
mod.html              Formation modulaire (module PP)       (page autonome)
pfe.html              PFE (classe PP)                       (page autonome)
coord.html            Espace coordination (accès invité)    (page autonome)


css/
  variables.css       Tokens : couleurs, typo, espacements, rayons
  layout.css          Squelette (app_shell), panels, tableaux, boutons, modales, états
  navbar.css          Navbar sticky + fil d'ariane
  sidebar.css         Sidebar des pages module
  spinner.css         Style unique du spinner (une seule couleur)
  smig.css            Bouton et modale Smig
  index.css           Non référencé par aucune page

js/
  config.js           GAS_API_URL
  api.js              apiCall() + raccourcis CRUD génériques
  session.js          Session utilisateur + garde d'accès
  spinner.js          Spinner + setBtnSaving()
  format.js           formatMontant()
  modal_forms.js      Modales de fiche (instantané, confirmation de fermeture)
  smig.js             Modale Smig partagée (accueil, FI, DTI)
  sidebar_menu.js     Génère le menu latéral depuis une liste unique de modules
  sidebar_toggle.js   Sidebar mobile (hamburger) + scroll-spy
  section_toggles.js  Sections repliables à chevron (pages autonomes)
  sticky_metiers.js   Hauteurs sticky du bandeau des pages autonomes
  sticky_panels.js    Hauteurs sticky des panels des pages à sidebar
  navbar_breadcrumb.js  Fil d'ariane en pop-in sur mobile
```

La plupart des pages embarquent aussi leur propre CSS (`<style>`) et leur JS (`<script>`)
inline : seules les briques communes sont externalisées.

## 3. Pages

### 3.1 Pages module (avec sidebar)

Chaque page est en mode `data-nav-mode="toggle"` : **une seule section visible à la fois**,
les autres s'affichent au clic dans la sidebar (ancre `#section`). Le mode « toggle » désactive
le scroll-spy de `sidebar_toggle.js`.

| Page | Sections (ancres) | Section par défaut |
|---|---|---|
| `ci.html` — Crédit d'impôt | `tdb`, `bilans_siliana`, `bilans_tunis` | `tdb` |
| `dti.html` — Droits de tirage individuels | `formation_initiale`, `plans`, `commission` | `formation_initiale` |
| `dtc.html` — Droits de tirage collectifs | `commissions`, `consultations`, `plans` | `commissions` |
| `pp.html` — Promotion professionnelle | `campagne`, `demandes`, `dossiers`, `inscrits`, `classes` | `demandes` |
| `part.html` — Partenaires | `entreprises`, `cabinets_formation`, `organismes`, `partenaires_pp` | `entreprises` |
| `docs.html` — Documents | `convpp`, `notes`, `manuels` | `notes` |

La liste des modules, des sections et des sections par défaut vit **à un seul endroit** :
le tableau `MODULES` de `js/sidebar_menu.js`. Les cartes de `index.html` sont, elles,
écrites en dur.

### 3.2 Pages autonomes (sans sidebar)

Ouvertes depuis une page module (ou l'accueil), avec un bandeau (`.btns_metiers`), une barre d'infos
(`.infos_metiers`) et des sections repliables (une seule dépliée à la fois, `section_toggles.js`).

| Page | Rôle | Paramètres URL | Ouverte depuis |
|---|---|---|---|
| `fi.html` | Dossier Formation initiale : entreprise, année, régime, budget, stages ; modale Smig ; Reprendre / Nouveau | `calcul`, `ese` | `dti.html#formation_initiale` |
| `plan.html` | Plan DTI : métadonnées (date/état/montant, plafond = budget FI), table des actions, lettre d'approbation, Réalisation / Facturation (à construire) | `id`, `calcul`, `ese` | `dti.html#plans` |
| `bilan.html` | Bilan d'une entreprise (CI), 5 sections, export et archivage | `sa` ou `tn` (antenne), `id` | `ci.html` |
| `class.html` | Classe « Formation à distance » : inscrits, enseignants, frais de coordination, plan d'étude, répartition tutorat, regroupements, compteurs | `classe`, `gclasse` | `pp.html#classes`, `coord.html` |
| `mod.html` | Module « Formation modulaire » : inscrits, planning, compteurs | `module`, `gmodule` | `pp.html#classes`, `coord.html` |
| `pfe.html` | PFE : inscrits, frais de coordination, encadrements, soutenances | `classe`, `gclasse` | `pp.html#classes`, `coord.html` |
| `prosp.html` | Prospections : pipeline par statut (5 étapes) filtrable par dispositif, journal de contacts/actions, relances à venir, carte SVG des délégations de Siliana ; fiche entreprise éditable | — | carte « Prospections » de l'accueil |
| `coord.html` | Espace coordination : connexion indépendante, liste des classes filtrée par établissement | — | lien direct (invité) |

### 3.3 Accueil (`index.html`)

- Connexion (modale) et badge utilisateur, bouton de déconnexion.
- Cartes : Prospections, CI, DTI, DTC, PP, Partenaires, Documents.
- Outils : **Calculette de stage**, **Chercher un contact**, **Suivi — actions confirmées**
  (diagramme de Gantt avec date de contrôle déplaçable), **Réglage Smig**, **Spécialités PP**.
- Alerte CI dans la navbar (`#navbar_ci_alert`, alimentée par `listBilansCI`).

## 4. Navigation et paramètres d'URL

- Les liens (cartes d'accueil, boutons) sont **écrits en dur** dans les HTML ; la sidebar est
  la seule navigation générée (`sidebar_menu.js`).
- Une page module s'ouvre sur une section précise par `page.html#section`.
- Les pages autonomes se pilotent par paramètres :

| URL | Effet |
|---|---|
| `fi.html` | Nouveau dossier vide |
| `fi.html?ese=<nom>` | Nouveau dossier pré-rempli avec l'entreprise |
| `fi.html?calcul=<fileId>` | Rouvre un calcul FI existant |
| `plan.html?calcul=<calculId>&ese=<nom>` | Nouveau plan rattaché à un calcul FI |
| `plan.html?id=<planId>` | Plan existant |
| `bilan.html?sa` / `?tn` | Nouveau bilan (antenne Siliana / Tunis) |
| `bilan.html?sa&id=<id>` | Bilan existant |
| `class.html?classe=<id>` · `pfe.html?classe=<id>` | Classe existante |
| `class.html?gclasse=<id>` · `pfe.html?gclasse=<id>` | Même chose en **mode invité** (depuis `coord.html`) |
| `mod.html?module=<id>` · `?gmodule=<id>` | Module (normal / invité) |

- Mobile (≤ 1080 px) : la sidebar passe en position fixe, masquée par défaut, ouverte par
  `.hamburger_btn`, fermée par le bouton X, un clic sur un lien ou l'overlay. Le fil d'ariane
  est remplacé par une icône qui ouvre une pop-in.

## 5. Authentification et sessions

Ce n'est **pas** une sécurité serveur : c'est un contrôle d'accès côté interface.

- **Session principale** (`js/session.js`) : profil choisi dans l'onglet `users` de la Sheet de
  paramètres (`listUsers`), authentifié par la colonne `M2p` (un profil sans `M2p` n'a pas
  d'accès). Clé : `urs_current_user`.
  - « Rester connecté(e) » coché → `localStorage` ; sinon → `sessionStorage`.
  - `getCurrentUser()` lit `localStorage` en priorité, puis `sessionStorage`.
- **Garde d'accès** : `protegerPage()` redirige vers `index.html` (`location.replace`) toute page
  autre que l'accueil quand aucun utilisateur n'est connecté.
  - **Exception** : `class.html` / `pfe.html` avec `gclasse` et `mod.html` avec `gmodule`
    (accès invité), qui restreignent eux-mêmes l'interface.
- **bfcache** : au retour arrière, une page restaurée du cache est rechargée
  (`pageshow` → `persisted`) pour ne pas afficher un état connecté périmé.
- **Session coordination** (`coord.html`) : indépendante, clé `urs_coord_user`. Profils dans
  l'onglet `coord` de la Sheet de paramètres (`Initiales | Nom | M2p | Etablissement | Classes`).
  Les classes affichées sont celles dont le nom contient l'établissement **et** une des
  valeurs de `Classes` du profil (valeurs multiples séparées par `;`).

## 6. Briques JS partagées

| Fichier | Rôle | API principale |
|---|---|---|
| `config.js` | URL du déploiement Apps Script | `GAS_API_URL` |
| `api.js` | Client générique | `apiCall(action, payload)` ; `api.list/create/update/remove(sheetName, …)` |
| `session.js` | Session + garde | `getCurrentUser`, `setCurrentUser`, `clearCurrentUser`, `seDeconnecterEtRediriger`, `renderUserBadge`, `initialesUtilisateur` |
| `spinner.js` | Chargement | `Spinner.*`, `setBtnSaving` (§8) |
| `format.js` | Montants | `formatMontant(valeur, avecDevise = true)` → `1 234,500 TND` (3 décimales, virgule) ; `"----"` si non numérique |
| `modal_forms.js` | Modales de fiche | `openFormModal`, `closeFormModal`, `attemptCloseFormModal` (compare l'état à l'instantané, affiche « Données à enregistrer ! » dans l'en-tête et demande confirmation à la fermeture si modifié ; désactivé par `data-no-dirty` sur une modale ou sur `<body>` — posé sur `fi`, `plan`, `bilan`, `class`, `mod`, `pfe`, dont le badge de navbar suffit) |
| `smig.js` | Modale Smig | `initSmigShared({ buttonId, modalId, tableId, currentYear, apiCaller, alerterSiVide })` ; actions `listSmig` / `saveSmig` ; boutons `[data-smig-copy]`, `[data-smig-save]`, `[data-smig-cancel]` |
| `sidebar_menu.js` | Menu latéral | Liste `MODULES` ; `<nav class="sidebar_nav" data-page="…">` |
| `sidebar_toggle.js` | Sidebar mobile | Hamburger, overlay, scroll-spy (désactivé en mode `toggle`) |
| `section_toggles.js` | Sections à chevron | Une seule section dépliée à la fois par groupe `.block_metiers_accordion` |
| `sticky_metiers.js` | Sticky pages autonomes | Variables `--btns-metiers-height`, `--infos-metiers-height` |
| `sticky_panels.js` | Sticky pages à sidebar | Variable `--panel-header-h` par `.panel` |
| `navbar_breadcrumb.js` | Fil d'ariane mobile | Injecte le bouton et la pop-in |

**Pourquoi `Content-Type: text/plain` ?** Apps Script ne gère pas le preflight CORS (`OPTIONS`).
Un POST en `text/plain` est une requête « simple » : le navigateur n'envoie pas de preflight.

## 7. Briques CSS partagées

- `variables.css` : palette « registre administratif » — Ink (encre), Paper (papier), Seal (sceau
  doré, `--color_seal`). Toute couleur passe par un token.
- `layout.css` : `.app_shell` (grille sidebar + contenu), `.panel`, `.data_table`,
  `.block_metiers` (sections des pages autonomes), boutons, modales, `.error_state`,
  `.btn_saving`, boutons d'action de ligne (`.row_actions` / `.row_action` + `_edit`, `_delete`,
  `_reset`, `_view`, `_print` : icône seule, un seul style pour toutes les pages autonomes).
- `navbar.css` : navbar sticky, au-dessus des en-têtes de bloc (z-index).
- `sidebar.css` : sidebar, volet de sections au survol (desktop), chevron (mobile).
- `smig.css` : bouton et modale Smig.
- `index.css` : défini pour l'accueil mais **non chargé** (`index.html` embarque ses styles).
- `spinner.css` : voir §8.

`index.html` ne charge que `smig.css` et `spinner.css` : il porte ses propres styles en inline
(`variables.css`, `layout.css`, `navbar.css` ne sont pas chargés).

## 8. Spinner (chargement)

Source unique : `css/spinner.css` (style) + `js/spinner.js` (balisage et API). Aucun autre
fichier ne définit de spinner.

- **Rendu** : un arc plein sur un anneau transparent, **une seule couleur** (`--spinner_color`,
  par défaut `--color_seal`). Pour changer la couleur partout : modifier cette variable.
- **Classes** :
  - `.spinner` : centré dans son conteneur (cellule, liste, bloc).
  - `.spinner_sm` : petite taille (navbar).
  - `.spinner_inline` : dans un bouton, hérite la couleur du texte du bouton.
  - `.is_loading` : sur un conteneur (panneau, modale, formulaire) — contenu estompé et inerte,
    spinner au milieu.
- **API JS** :

| Appel | Effet |
|---|---|
| `Spinner.html([classe])` | Balisage d'un spinner, à insérer dans un `innerHTML` |
| `Spinner.tableRow(n)` | Ligne de tableau (`colspan` = n) avec spinner centré |
| `Spinner.show(el)` / `Spinner.hide(el)` | Ajoute / retire `.is_loading` (+ `aria-busy`) |
| `Spinner.navbar(visible)` | Affiche / masque `#navbar_loading` |
| `setBtnSaving(btn, saving, label)` | Bouton « Enregistrement… » : spinner, désactivation, restauration du contenu d'origine |

- **HTML statique** : `<span class="spinner" role="status" aria-label="Chargement"></span>`.
- Chaque page charge `css/spinner.css` et `js/spinner.js` dans le `<head>`.
- `prefers-reduced-motion` : rotation ralentie (2 s).

## 9. Backend Apps Script

### 9.1 Mise à jour du code

Le code qui s'exécute vit dans l'éditeur en ligne ; **`Code.gs` (racine) en est la copie de
référence** (versioning). Pas de `clasp`, pas de dossier `gas/`.

1. Ouvrir le projet « CNFCPP API » sur [script.google.com](https://script.google.com).
2. Coller le contenu de `Code.gs` dans l'éditeur.
3. **Déployer > Gérer les déploiements > Modifier (crayon) > Nouvelle version > Déployer.**
   Ne **jamais** créer un « Nouveau déploiement » : l'URL `/exec` changerait et casserait
   `js/config.js` (qui doit rester synchronisée avec l'URL notée en tête de `Code.gs`).

Script **autonome** : il n'est attaché à aucune Sheet ; chaque module référence sa Sheet ou son
dossier Drive par ID.

### 9.2 Protocole

`POST` sur `GAS_API_URL`, corps JSON `{ "action": "…", …paramètres }`.
Réponse : `{ "ok": true, "result": … }` ou `{ "ok": false, "error": "…" }`.
`doPost` enchaîne des `if (action === "…")` ; une action inconnue renvoie
`Action inconnue : <action>`. `apiCall()` lève une `Error` si `!res.ok` ou `!data.ok`.

### 9.3 Actions (99, relevées dans `Code.gs`)

| Domaine | Actions |
|---|---|
| Paramètres | `getSmig`, `listSmig`, `saveSmig`, `getFraisPP` |
| Utilisateurs | `listUsers`, `listUsersCoord`, `getContactsIndex` |
| Entreprises (`eses`) | `listEses`, `createEse`, `updateEse`, `deleteEse` |
| Cabinets de formation | `listCabinets`, `createCabinet`, `updateCabinet`, `deleteCabinet` |
| Cabinets sanctionnés | `listCabsan`, `createCabsan`, `updateCabsan`, `deleteCabsan` |
| Partenaires | `listPartPP`, `createPartPP`, `updatePartPP`, `deletePartPP`, `listPartDTC` |
| Prospection | `listProspSuivi`, `createProspSuivi`, `updateProspSuivi`, `deleteProspSuivi` |
| Calculs FI | `exportToDrive`, `listCalculs`, `chargerCalcul`, `mettreAJourCalcul`, `supprimerCalcul` |
| Plans DTI | `listPlansDti`, `listTousPlansDti`, `exportPlanToDrive`, `chargerPlan`, `mettreAJourPlan`, `listFichiersPlan`, `infosLettreApprobation`, `uploadLettrePdf`, `enregistrerEnvoiDecision`, `confirmerActionsPlan` |
| Suivi des actions | `listActionsConfirmees`, `modifierDateControleAction`, `modifierChargeControleAction`, `listActionsPlanifieesNonConfirmees` |
| Commissions DTI | `listCommissions`, `enregistrerCommission`, `enregistrerLettreCommission`, `listCommissionsTableauDTI`, `detailCommissionDTI`, `listCommissionsPrevuesDTI` |
| DTC | `listCommissionsDTC`, `enregistrerCommissionDTC`, `listConsultationsDTC`, `enregistrerConsultationDTC`, `listPlansDTC`, `enregistrerPlanDTC` |
| Crédit d'impôt | `listBilansCI`, `exportBilanToDrive`, `chargerBilan`, `supprimerBilan`, `chargerTdb`, `sauvegarderTdb` |
| PP — campagnes / demandes / dossiers / inscrits | `list/create/update/delete` × `CampagnePP`, `DemandePP`, `DossierPP` ; `listInscritsPP`, `createInscritPP`, `updateInscritPP`, `archiverInscritPP`, `archiverDossierPP` |
| PP — spécialités | `listSpecialitesPP`, `listSpecialitesDetailPP`, `createSpecialitePP` |
| PP — classes / modules | `listClassesPP`, `exportClasseToDrive`, `chargerClasse`, `trouverClassePrecedente`, `listModulesPP`, `exportModuleToDrive`, `chargerModule` |
| Enseignants | `listEnsForm`, `createEnsForm`, `updateEnsForm`, `deleteEnsForm` |
| Notification | `notifierCheckTutorat` (ntfy.sh) |
| Documents | `listManuels`, `getManuelHtml` |


### 9.4 Stockage

**Google Sheets**

| Constante | ID | Onglets |
|---|---|---|
| `PARAMS_SHEET_ID` | `1RTpJ2fl7zjOcjJ8H_WtdPthzJDyZpCOrORFib7hBOZI` | `smig` (`annee \| smig40 \| smig48`), `users`, `coord`, `fraispp` |
| `ESES_SHEET_ID` (Sheet « Base ») | `1_Xeo5zwB3fEpIkYUWRzfIw1ESSu95zIQ7KJk0S55qKU` | `eses`, `cabinets`, `cabsan`, `partpp`, `partdtc`, `ensform`, `prosp_suivi` |
| `PP_DEMANDES_SHEET_ID` (Sheet « PP ») | `1Anm0lULkknZygdGPQXlgvClO-ctp2xSrPuzTmkBZ6oE` | `campagne`, `Demandes`, `Dossiers`, `Inscrits`, `specialites` |

Les lignes de la Sheet « Base » et de la Sheet « PP » sont identifiées par leur **numéro de
ligne réel** (`_row`) ; les en-têtes réels de la Sheet font foi (aucune migration automatique).

**Google Drive** (un fichier HTML par entité, qui embarque ses données brutes)

| Constante | ID | Contenu |
|---|---|---|
| `FI_EXPORT_ROOT_FOLDER_ID` | `1wFWlwvaZAMf7Cv6H0U14miubfdlkk4R3` | Calculs FI, un sous-dossier par année |
| `PLANS_DTI_FOLDER_ID` | `1s3wKQ-Zon2_Z-yHlY1_KRLXnLwKeeheI` | Plans DTI, un sous-dossier par année ; chaque plan référence un `calculId` |
| `COMMISSIONS_FOLDER_ID` | `1IL7JYHLrbSv5nUIRewI0P49aOLzjZJNV` | **Un fichier unique par type**, tableau JSON embarqué : `COMMISSIONS DTI.html`, `COMMISSIONS DTC.html`, `CONSULTATIONS DTC.html`, `PLANS DTC.html` |
| `BILANS_CI_FOLDER_ID` | `1OCdOzWASaNAkGskso9Rp-lMdOqqQ5Uok` | Bilans CI, un fichier `#refbil_abbreviation.html` par bilan |
| `CLASSES_PP_FOLDER_ID` | `10Odqv7ySw6a2RL2HFzVW1WjGqa8GA3NX` | Classes FAD (un fichier par classe) ; sous-dossier `Modules` pour les modules |
| `MANUELS_FOLDER_ID` | `11Cva7ddNiAZm0iueLFPL8hu7w1BI4mLF` | Manuels de procédures (fichiers HTML) |

Une nouvelle Sheet se déclare de la même façon (constante `..._SHEET_ID` + accesseur).
Enregistrer une commission DTI propage sa date et ses numéros vers les plans concernés
(`enregistrerCommission` → `mettreAJourPlan`), qui deviennent alors en lecture seule dans
`plan.html`.

## 10. Flux métier

### 10.1 Formation initiale (DTI)

- `dti.html#formation_initiale` : récap des dossiers de l'année `n-1` (calculée côté client) —
  Entreprise / Budget / **Reprendre** / **Imprimer**. **Nouveau** ouvre `fi.html` vide.
- `fi.html` : bandeau, formulaire Entreprise / Année / Régime / Budget, 3 catégories de stages
  (Apprentissage, Alternance, Stages).
  - **Reprendre / Nouveau** : modale listant les calculs du dossier Drive de l'année active
    (`listCalculs`) + « Nouveau calcul ».
  - **Smig (⚙)** : modale lisant et écrivant l'onglet `smig`.
  - **Enregistrer** : crée ou met à jour le calcul, régénère l'export HTML dans Drive
    (`exportToDrive`) ; le fichier embarque les données brutes, relues par `chargerCalcul`.

### 10.2 Plans (DTI)

- `dti.html#plans` : plans de l'année DTI en cours (Entreprise / Date / État / Montant / Actions).
- **Nouveau plan** : modale listant les calculs FI déjà enregistrés. Un plan est **toujours
  rattaché** à un calcul FI existant → `plan.html?calcul=<calculId>&ese=<entreprise>`.
- **Afficher** → `plan.html?id=<planId>` ; **Editer** → modale légère (date / état / montant,
  plafond = budget du calcul FI lié), sans quitter `dti.html` (`mettreAJourPlan`).
- `plan.html` : trois sections repliables — **Actions** (table Réf / Thème / Jours / Heures /
  Cabinet / Formateur / CIN, édition en mémoire, alerte « Données à sauvegarder ! » jusqu'à
  **Enregistrer**), **Réalisation** et **Facturation** (à construire).
- **Enregistrer** exporte le fichier Drive du plan (`exportPlanToDrive`) : pas de Sheet dédiée,
  le fichier HTML exporté (métadonnées + actions) **est** le plan enregistré.
- `dti.html#commission` : commissions dérivées des plans N et N-1.

### 10.3 Promotion professionnelle

- `pp.html` : Campagne → Demandes → Dossiers → Inscrits → Classes.
- **Classes** : **Nouvelle classe** → `class.html` ; **Afficher** → `class.html?classe=<id>`.
  La saisie complète et la sauvegarde du fichier Drive de la classe se font dans `class.html`
  (`exportClasseToDrive`) ; `pp.html` ne modifie pas les champs gérés par `class.html`
  (facturation, heures par étudiant) pour ne pas les écraser.
- Modules : `mod.html` (`chargerModule`, `exportModuleToDrive`). PFE : `pfe.html`.
- Import Excel des inscrits via SheetJS (`class.html#liste_inscrits`, `pp.html`).
- `class.html#regroupements` gère aussi les **examens** : une journée d'examen est un dimanche
  déjà planifié en regroupement, avec une ou plusieurs séances (groupe, matière avec éval au plan
  d'étude, enseignant). Les examens comptent dans les compteurs comme des regroupements sans
  numéro de semaine. Stockés dans le fichier de la classe (`chargerClasse` / `exportClasseToDrive`).
- `class.html#compteurs` : document « Check Tutorat » (bouton d'envoi masqué par défaut).
- Enseignants : onglet `ensform` de la Sheet « Base » (`CIN | Nom | Rôle | Coordonnées | Banque | RIB`,
  `Nom` = « Prénom NOM », `Coordonnées` = Tél / Email / Adresse en une cellule multi-lignes).

### 10.4 Coordination (invités)

`coord.html` → connexion `urs_coord_user` → liste des classes filtrée → ouverture de
`class.html?gclasse=…`, `pfe.html?gclasse=…` ou `mod.html?gmodule=…` en mode invité.

## 11. Développement local

Le frontend fait des `fetch()` : ouvrir un `.html` en double-clic (`file://`) ne marche pas
(CORS). Servir le dossier :

```bash
python -m http.server 5500
```

ou utiliser l'extension VS Code « Live Server ». Sans utilisateur connecté, toute page autre
que `index.html` redirige vers l'accueil (§5).

## 12. Conventions de code

- Classes CSS en `snake_case` (jamais de `-`).
- CSS imbriqué natif, pas de préprocesseur.
- Les couleurs, espacements et tailles passent par les tokens de `variables.css`.
- Briques communes en fichiers séparés ; CSS et JS spécifiques à une page restent inline dans
  la page.
- Spinner : uniquement via `spinner.css` / `spinner.js` (§8). Pas de texte « Chargement… ».
- Montants : toujours `formatMontant()` (virgule décimale, 3 chiffres).
- Icônes : Bootstrap Icons (CDN).
- Pas de footer sur les pages.
- Interface et commentaires en français.
