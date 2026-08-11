/**
 * ============================================================
 * CODE.GS — Backend générique CRUD sur Google Sheets
 * ============================================================
 * ⚠️ Ce fichier est une COPIE DE RÉFÉRENCE, gardée dans le dépôt
 * pour historique/versioning. Le code qui tourne réellement vit
 * dans l'éditeur Apps Script en ligne (script.google.com) — colle
 * ce fichier là-bas à chaque mise à jour, puis redéploie
 * (Gérer les déploiements > Modifier > Nouvelle version).
 *
 * Astuce CORS : le frontend envoie du "text/plain" en POST, donc le
 * navigateur ne déclenche pas de preflight OPTIONS (que Apps Script
 * ne sait pas gérer). On lit et parse manuellement le body ci-dessous.
 *
 * SCRIPT AUTONOME (standalone) : ce projet n'est PAS attaché à une
 * Sheet unique. Chaque module référence sa propre Sheet par ID
 * (PARAMS_SHEET_ID, ESES_SHEET_ID...), voire un dossier Drive pour les
 * modules qui n'utilisent pas de Sheet du tout (manuels, classes FAD).
 *
 * URL de déploiement actuelle (à garder synchronisée avec js/config.js) :
 * https://script.google.com/macros/s/AKfycbwZy067A0cNjftl3MJC4-sn4bZYqk86-FBE57BdC25-kY_1KiyFnZ5Kfa9A95k-A_d6/exec
 */

// Sheet de paramètres partagée entre modules (ex: onglet "smig" : annee | smig40 | smig48)
const PARAMS_SHEET_ID = "1RTpJ2fl7zjOcjJ8H_WtdPthzJDyZpCOrORFib7hBOZI";

// Dossier Drive racine des exports HTML (un sous-dossier par année de FI)
const FI_EXPORT_ROOT_FOLDER_ID = "1wFWlwvaZAMf7Cv6H0U14miubfdlkk4R3";

// Dossier Drive contenant les manuels de procédures (fichiers .pdf),
// affichés et ouverts directement depuis docs.html#manuels.
const MANUELS_FOLDER_ID = "11Cva7ddNiAZm0iueLFPL8hu7w1BI4mLF";

// Dossier Drive des classes FAD (Formation à distance, module PP) : chaque
// classe = un fichier HTML unique ("part_classe_..."), Créé/édité depuis class.html (pp.html
// ne fait qu'afficher le récap et rediriger).
const CLASSES_PP_FOLDER_ID = "10Odqv7ySw6a2RL2HFzVW1WjGqa8GA3NX";

// Sheet "Base" : partenaires (eses, cabinets, cabsan...), utilisée par fi.html et part.html
const ESES_SHEET_ID = "1_Xeo5zwB3fEpIkYUWRzfIw1ESSu95zIQ7KJk0S55qKU";

// Sheet "PP" : onglets Demandes / Dossiers / Inscrits, utilisée par la
// nouvelle section "Demandes-Dossiers-Inscrits" de pp.html (avant Classes).
const PP_DEMANDES_SHEET_ID = "1Anm0lULkknZygdGPQXlgvClO-ctp2xSrPuzTmkBZ6oE";

// ⚠️ Le module Crédit d'impôt (ci.html) n'utilise pas de Sheet : comme FI et
// les classes FAD, chaque dossier CI est un fichier .html unique dans un
// dossier Drive dédié. CI_SHEET_ID / GENERIC_SHEET_ROUTES ci-dessous
// (bilans_siliana / bilans_tunis) datent d'une ancienne approche jamais
// finalisée (l'ID n'a jamais été renseigné) et ne sont plus utilisés — à
// retirer une fois confirmé côté ci.html, et à remplacer par un dossier
// Drive + des fonctions exportDossierCiToDrive()/chargerDossierCi() sur le
// modèle de exportClasseToDrive()/chargerClasse().
const CI_SHEET_ID = "REPLACE_WITH_CI_SHEET_ID";

// Dossier Drive des bilans Crédit d'impôt (module CI) : comme les classes
// FAD, chaque bilan = un fichier HTML unique nommé "#refbil_abbreviation.html"
// (les "/" de la référence BPF/.../.../34 sont remplacés par "_").
// Créé/édité depuis bilan.html, listé par ci.html.
const BILANS_CI_FOLDER_ID = "1OCdOzWASaNAkGskso9Rp-lMdOqqQ5Uok";

function getParamsSS() {
  return SpreadsheetApp.openById(PARAMS_SHEET_ID);
}

function getEsesSS() {
  return SpreadsheetApp.openById(ESES_SHEET_ID);
}

function getPPDemandesSS() {
  return SpreadsheetApp.openById(PP_DEMANDES_SHEET_ID);
}

// Le CRUD générique (actions "list"/"create"/"update"/"delete") n'a plus de
// Sheet unique : l'app est reliée à plusieurs Google Sheets, chacune connue
// par son propre ID (PARAMS_SHEET_ID, ESES_SHEET_ID, CI_SHEET_ID...). Chaque
// onglet consommé par ce CRUD générique doit être déclaré ici, routé vers sa
// Sheet dédiée.
const GENERIC_SHEET_ROUTES = {
  bilans_siliana: () => SpreadsheetApp.openById(CI_SHEET_ID),
  bilans_tunis: () => SpreadsheetApp.openById(CI_SHEET_ID)
};

function getSpreadsheetForSheet(sheetName) {
  const route = GENERIC_SHEET_ROUTES[sheetName];
  if (!route) throw new Error(`Onglet "${sheetName}" non déclaré dans GENERIC_SHEET_ROUTES (Code.gs)`);
  return route();
}

function doGet(e) {
  return jsonResponse({ ok: true, result: "API CNFCPP active" });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, sheet, id, record, annee } = body;

    // Actions qui ne portent pas sur un onglet "métier" classique
    if (action === "getSmig") {
      return jsonResponse({ ok: true, result: getSmig(annee) });
    }
    if (action === "exportToDrive") {
      return jsonResponse({ ok: true, result: exportDossierToDrive(body.dossier, body.stages) });
    }
    if (action === "listCalculs") {
      return jsonResponse({ ok: true, result: listCalculs(body.annee) });
    }
    if (action === "chargerCalcul") {
      return jsonResponse({ ok: true, result: chargerCalcul(body.fileId) });
    }
    if (action === "listSmig") {
      return jsonResponse({ ok: true, result: listSmig() });
    }
    if (action === "saveSmig") {
      return jsonResponse({ ok: true, result: saveSmig(body.record) });
    }
    if (action === "getFraisPP") {
      return jsonResponse({ ok: true, result: getFraisPP() });
    }
    if (action === "listEses") {
      return jsonResponse({ ok: true, result: listEses() });
    }
    if (action === "createEse") {
      return jsonResponse({ ok: true, result: createEse(body.record) });
    }
    if (action === "updateEse") {
      return jsonResponse({ ok: true, result: updateEse(body._row, body.record) });
    }
    if (action === "deleteEse") {
      return jsonResponse({ ok: true, result: deleteEse(body._row) });
    }
    if (action === "listCabinets") {
      return jsonResponse({ ok: true, result: listCabinets() });
    }
    if (action === "createCabinet") {
      return jsonResponse({ ok: true, result: createCabinet(body.record) });
    }
    if (action === "updateCabinet") {
      return jsonResponse({ ok: true, result: updateCabinet(body._row, body.record) });
    }
    if (action === "deleteCabinet") {
      return jsonResponse({ ok: true, result: deleteCabinet(body._row) });
    }
    if (action === "listCabsan") {
      return jsonResponse({ ok: true, result: listCabsan() });
    }
    if (action === "createCabsan") {
      return jsonResponse({ ok: true, result: createCabsan(body.record) });
    }
    if (action === "updateCabsan") {
      return jsonResponse({ ok: true, result: updateCabsan(body._row, body.record) });
    }
    if (action === "deleteCabsan") {
      return jsonResponse({ ok: true, result: deleteCabsan(body._row) });
    }
    if (action === "listPartPP") {
      return jsonResponse({ ok: true, result: listPartPP() });
    }
    if (action === "createPartPP") {
      return jsonResponse({ ok: true, result: createPartPP(body.record) });
    }
    if (action === "updatePartPP") {
      return jsonResponse({ ok: true, result: updatePartPP(body._row, body.record) });
    }
    if (action === "deletePartPP") {
      return jsonResponse({ ok: true, result: deletePartPP(body._row) });
    }
    if (action === "listDemandesPP") {
      return jsonResponse({ ok: true, result: listDemandesPP() });
    }
    if (action === "createDemandePP") {
      return jsonResponse({ ok: true, result: createDemandePP(body.record) });
    }
    if (action === "updateDemandePP") {
      return jsonResponse({ ok: true, result: updateDemandePP(body._row, body.record) });
    }
    if (action === "deleteDemandePP") {
      return jsonResponse({ ok: true, result: deleteDemandePP(body._row) });
    }
    if (action === "listClassesPP") {
      return jsonResponse({ ok: true, result: listClassesPP() });
    }
    if (action === "exportClasseToDrive") {
      return jsonResponse({ ok: true, result: exportClasseToDrive(body.classe, body.matieres, body.regroupements, body.tutorat, body.etudiants, body.intervenants, body.examens, body.fileId, body.encadrements, body.soutenances) });
    }
    if (action === "chargerClasse") {
      return jsonResponse({ ok: true, result: chargerClasse(body.fileId) });
    }
    if (action === "trouverClassePrecedente") {
      return jsonResponse({ ok: true, result: trouverClassePrecedente(body.classe) });
    }
    if (action === "listBilansCI") {
      return jsonResponse({ ok: true, result: listBilansCI(body.antenne) });
    }
    if (action === "exportBilanToDrive") {
      return jsonResponse({ ok: true, result: exportBilanToDrive(body.bilan, body.fileId) });
    }
    if (action === "chargerBilan") {
      return jsonResponse({ ok: true, result: chargerBilan(body.fileId) });
    }
    if (action === "supprimerBilan") {
      return jsonResponse({ ok: true, result: supprimerBilan(body.fileId) });
    }
    if (action === "listEnsForm") {
      return jsonResponse({ ok: true, result: listEnsForm() });
    }
    if (action === "createEnsForm") {
      return jsonResponse({ ok: true, result: createEnsForm(body.record) });
    }
    if (action === "updateEnsForm") {
      return jsonResponse({ ok: true, result: updateEnsForm(body._row, body.record) });
    }
    if (action === "deleteEnsForm") {
      return jsonResponse({ ok: true, result: deleteEnsForm(body._row) });
    }
    if (action === "listUsers") {
      return jsonResponse({ ok: true, result: listUsers() });
    }
    if (action === "listUsersCoord") {
      return jsonResponse({ ok: true, result: listUsersCoord() });
    }
    if (action === "notifierCheckTutorat") {
      return jsonResponse({ ok: true, result: notifierCheckTutorat(body.classe, body.message) });
    }
    if (action === "listProspSuivi") {
      return jsonResponse({ ok: true, result: listProspSuivi() });
    }
    if (action === "createProspSuivi") {
      return jsonResponse({ ok: true, result: createProspSuivi(body.record) });
    }
    if (action === "updateProspSuivi") {
      return jsonResponse({ ok: true, result: updateProspSuivi(body._row, body.record) });
    }
    if (action === "deleteProspSuivi") {
      return jsonResponse({ ok: true, result: deleteProspSuivi(body._row) });
    }
    if (action === "listManuels") {
      return jsonResponse({ ok: true, result: listManuels() });
    }
    if (action === "getManuelHtml") {
      return jsonResponse({ ok: true, result: getManuelHtml(body.id) });
    }

    if (!sheet) throw new Error("Paramètre 'sheet' manquant");

    let result;
    switch (action) {
      case "list":
        result = listRecords(sheet);
        break;
      case "create":
        result = createRecord(sheet, record);
        break;
      case "update":
        result = updateRecord(sheet, id, record);
        break;
      case "delete":
        result = deleteRecord(sheet, id);
        break;
      default:
        throw new Error(`Action inconnue : ${action}`);
    }

    return jsonResponse({ ok: true, result });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/* ---------------- Utilisateurs (connexion) ----------------
   Onglet "users" de la Sheet de paramètres : Initiales | Nom | Role.
   Pour l'instant, simple sélection dans la liste (pas de mot de passe) —
   un vrai mécanisme de connexion (m2p) est prévu pour plus tard. */

function listUsers() {
  const sh = getParamsSS().getSheetByName("users");
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0]; // Initiales | Nom | Role
  return values.slice(1)
    .filter((row) => row[0] !== "")
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

/* ---------------- Utilisateurs coord (coord.html) ----------------
   Onglet "coord" de la Sheet de paramètres : Initiales | Nom | M2p |
   Etablissement | Classes. Connexion indépendante de l'onglet "users"
   (comptes principaux de l'app) : sert uniquement coord.html, qui
   filtre la section Classes (copie de celle de pp.html) aux classes
   dont le nom contient l'Etablissement (ex. "ISETS") et les Classes
   (ex. "LATI Pr") du profil connecté. */

function listUsersCoord() {
  const sh = getParamsSS().getSheetByName("coord");
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0]; // Initiales | Nom | M2p | Etablissement | Classes
  return values.slice(1)
    .filter((row) => row[0] !== "")
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

/* ---------------- Notifications — Check Tutorat ----------------
   Bouton "Envoyer notification" du document Check Tutorat (class.html) :
   envoie un email à l'admin (Ferid) pour lui demander de vérifier le
   compteur tutorat d'une classe. Remplace l'ancien envoi push ntfy.sh. */

function notifierCheckTutorat(classe, message) {
  const destinataire = "ferid.melliti@cnfcpp.tn";
  const sujet = "Check Tutorat" + (classe ? ` — ${classe}` : "");
  const texte = message || `Vérification du compteur tutorat demandée${classe ? ` pour la classe ${classe}` : ""}.`;
  const corps = `${texte}\n\nMerci de vérifier le compteur tutorat de la classe${classe ? ` "${classe}"` : ""} sur URSApp.`;

  try {
    MailApp.sendEmail({
      to: destinataire,
      subject: sujet,
      body: corps
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/* ---------------- Paramètres (SMIG) ---------------- */

function getSmig(annee) {
  const sh = getParamsSS().getSheetByName("smig");
  if (!sh) throw new Error("Onglet 'smig' introuvable dans la Sheet de paramètres");

  const values = sh.getDataRange().getValues();
  const headers = values[0]; // annee | smig40 | smig48
  const idxAnnee = headers.indexOf("annee");
  const idxSmig40 = headers.indexOf("smig40");
  const idxSmig48 = headers.indexOf("smig48");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idxAnnee]) === String(annee)) {
      return { smig40: values[i][idxSmig40], smig48: values[i][idxSmig48] };
    }
  }
  return null; // aucune ligne pour cette année
}

function listSmig() {
  const sh = getParamsSS().getSheetByName("smig");
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0] !== "")
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function saveSmig(record) {
  const sh = getParamsSS().getSheetByName("smig");
  if (!sh) throw new Error("Onglet 'smig' introuvable dans la Sheet de paramètres");

  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idxAnnee = headers.indexOf("annee");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idxAnnee]) === String(record.annee)) {
      const row = headers.map((h) => (record[h] !== undefined ? record[h] : values[i][headers.indexOf(h)]));
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return record;
    }
  }

  const row = headers.map((h) => (record[h] !== undefined ? record[h] : ""));
  sh.appendRow(row);
  return record;
}

/* ---------------- Paramètres (Frais PP : taux horaire / taux de retenue) ----------------
   Onglet "fraispp" de la Sheet de paramètres (getParamsSS()), même Sheet que
   "smig". En-têtes exacts : tauxhor | retenu — une seule ligne de données
   (pas de clé "annee" comme pour "smig" : le taux en vigueur est toujours
   celui de la ligne 2). "tauxhor" = taux horaire en DT (ex : 21,28).
   "retenu" = taux de retenue (ex : 15%) : accepté aussi bien en cellule
   format "Pourcentage" Google Sheets (valeur brute lue = 0.15) qu'en
   cellule Nombre simple (valeur brute lue = 15) — voir normalisation
   ci-dessous. Toujours renvoyé au front sous forme de fraction (0.15).
   Utilisé par class.html (mémoires de règlement/formation/coordination et
   frais de coordination) pour calculer montant brut / retenues / montant
   net, à la place des valeurs auparavant codées en dur (21.28 DT/h, 15%). */
function getFraisPP() {
  const sh = getParamsSS().getSheetByName("fraispp");
  if (!sh) throw new Error("Onglet 'fraispp' introuvable dans la Sheet de paramètres");

  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error("Onglet 'fraispp' vide : aucune ligne de taux définie");

  const headers = values[0];
  const idxTauxHor = headers.indexOf("tauxhor");
  const idxRetenu = headers.indexOf("retenu");
  if (idxTauxHor === -1 || idxRetenu === -1) {
    throw new Error("Onglet 'fraispp' : en-têtes 'tauxhor'/'retenu' introuvables");
  }
  const row = values[1];
  // Normalisation : une cellule au format "Pourcentage" Google Sheets pour
  // "15%" a une valeur brute déjà en fraction (0.15) ; une cellule Nombre
  // simple pour "15" a une valeur brute de 15. On traite tout ce qui est
  // > 1 comme un pourcentage à diviser par 100, et tout le reste comme une
  // fraction déjà prête à l'emploi.
  const retenuBrut = Number(row[idxRetenu]) || 0;
  const tauxRetenue = retenuBrut > 1 ? retenuBrut / 100 : retenuBrut;

  return {
    tauxHoraire: Number(row[idxTauxHor]) || 0,
    tauxRetenue
  };
}

/* ---------------- CRUD générique "Sheet Base" (par numéro de ligne réel _row) ----------------
   Utilisé pour tous les onglets de la Sheet "Base" (eses, cabinets, cabsan...)
   qui n'ont pas de colonne "id" dédiée : chaque enregistrement est identifié
   par son numéro de ligne réel dans l'onglet (_row), au lieu d'un UUID. */

// ss (optionnel) : classeur à utiliser à la place de la Sheet "Base"
// (getEsesSS()) par défaut — permet de réutiliser ce CRUD générique pour
// d'autres classeurs (ex : getPPDemandesSS() pour Demandes/Dossiers/Inscrits).
function listBaseRows(tabName, ss) {
  const sh = (ss || getEsesSS()).getSheetByName(tabName);
  if (!sh) throw new Error(`Onglet '${tabName}' introuvable dans la Sheet`);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .map((row, idx) => {
      if (row.every((c) => c === "")) return null;
      const obj = { _row: idx + 2 }; // numéro de ligne réel dans la Sheet
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    })
    .filter(Boolean);
}

function createBaseRow(tabName, record, ss) {
  const sh = (ss || getEsesSS()).getSheetByName(tabName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => (record[h] !== undefined ? record[h] : ""));
  sh.appendRow(row);
  return record;
}

function updateBaseRow(tabName, rowNumber, record, ss) {
  const sh = (ss || getEsesSS()).getSheetByName(tabName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => (record[h] !== undefined ? record[h] : ""));
  sh.getRange(Number(rowNumber), 1, 1, row.length).setValues([row]);
  return record;
}

function deleteBaseRow(tabName, rowNumber, ss) {
  const sh = (ss || getEsesSS()).getSheetByName(tabName);
  sh.deleteRow(Number(rowNumber));
  return { deleted: rowNumber };
}

/* ---------------- Entreprises (Sheet "Base", onglet "eses") ---------------- */

function listEses() { return listBaseRows("eses"); }
function createEse(record) { return createBaseRow("eses", record); }
function updateEse(rowNumber, record) { return updateBaseRow("eses", rowNumber, record); }
function deleteEse(rowNumber) { return deleteBaseRow("eses", rowNumber); }

/* ---------------- Cabinets de formation (Sheet "Base", onglet "cabinets") ---------------- */

function listCabinets() { return listBaseRows("cabinets"); }
function createCabinet(record) { return createBaseRow("cabinets", record); }
function updateCabinet(rowNumber, record) { return updateBaseRow("cabinets", rowNumber, record); }
function deleteCabinet(rowNumber) { return deleteBaseRow("cabinets", rowNumber); }

/* ---------------- Cabinets sanctionnés (Sheet "Base", onglet "cabsan") ----------------
   En-têtes (arabe) : رقم التسجيل | الولاية | المؤسسة | القرار التأديبي |
   عدد القرار | تاريخ القرار | تاريخ القرار 2 | الملاحظات.
   رقم التسجيل et المؤسسة sont normalement choisis depuis la liste "cabinets"
   (voir part.js), pas saisis librement. */

function listCabsan() { return listBaseRows("cabsan"); }
function createCabsan(record) { return createBaseRow("cabsan", record); }
function updateCabsan(rowNumber, record) { return updateBaseRow("cabsan", rowNumber, record); }
function deleteCabsan(rowNumber) { return deleteBaseRow("cabsan", rowNumber); }

/* ---------------- Partenaires PP (Sheet "Base", onglet "partpp") ----------------
   Fusion des sections "Centres de formation" et "Établissements
   d'enseignement supérieur" en une seule section "Partenaires PP".
   En-têtes : Etablissement | Arabe | Sigle | Domaine (Formation
   Professionnelle ou Enseignement supérieur) | Convention (1 ou
   plusieurs, séparés par ";" : FAD, MOD, ou vide) | Adresse | Mail |
   Téléphone | Fax | Directeur | Mail Directeur | Autre Contact | Mail Contact. */

function listPartPP() { return listBaseRows("partpp"); }
function createPartPP(record) { return createBaseRow("partpp", record); }
function updatePartPP(rowNumber, record) { return updateBaseRow("partpp", rowNumber, record); }
function deletePartPP(rowNumber) { return deleteBaseRow("partpp", rowNumber); }

/* ---------------- Demandes PP (Sheet PP_DEMANDES_SHEET_ID, onglet "Demandes") ----------------
   Nouvelle section de pp.html, avant "Classes". En-têtes : CIN | Prénom |
   Nom | Coordonnées | Spécialité. "Coordonnées" est une cellule composite
   (Tél / Tél2 / Email), une ligne "Label : valeur" par sous-champ, sur le
   même modèle que "Coordonnées" dans la Sheet "Base" (voir part.html /
   getCoordField() / buildCoordText()).
   Les onglets "Dossiers" et "Inscrits" existent déjà dans cette même Sheet
   (à câbler plus tard, sur le même modèle : listBaseRows("Dossiers",
   getPPDemandesSS()) / listBaseRows("Inscrits", getPPDemandesSS())). */

function listDemandesPP() { return listBaseRows("Demandes", getPPDemandesSS()); }
function createDemandePP(record) { return createBaseRow("Demandes", record, getPPDemandesSS()); }
function updateDemandePP(rowNumber, record) { return updateBaseRow("Demandes", rowNumber, record, getPPDemandesSS()); }
function deleteDemandePP(rowNumber) { return deleteBaseRow("Demandes", rowNumber, getPPDemandesSS()); }

/* ---------------- Classes FAD / PP (Drive, dossier CLASSES_PP_FOLDER_ID) ----------------
   Comme "Formation initiale" (fi.html/dti.html) : une classe = un fichier
   HTML unique dans ce dossier Drive, pas de Sheet. Le nom du fichier suit
   la nomenclature "part_classe_..." ; le récap (Partenaire PP, Classe,
   Spécialité, Promotion, Niveau, Semestre) est stocké en JSON compact
   dans la Description Drive du fichier, pour être listé sans avoir à
   ouvrir/parser chaque fichier (cf. listCalculs()).
   Création et édition se font depuis class.html, qui appelle
   exportClasseToDrive()/chargerClasse() sur ce même modèle que
   exportDossierToDrive()/chargerCalcul() pour la FI. pp.html se
   contente d'afficher ce récap et de rediriger vers class.html. */

function listClassesPP() {
  const folder = DriveApp.getFolderById(CLASSES_PP_FOLDER_ID);
  const it = folder.getFiles();
  const result = [];
  while (it.hasNext()) {
    const f = it.next();
    let recap = {};
    try {
      recap = JSON.parse(f.getDescription() || "{}");
    } catch (err) {
      recap = {};
    }
    result.push({
      id: f.getId(),
      url: f.getUrl(),
      name: f.getName().replace(/\.html$/i, ""),
      "Partenaire PP": recap["Partenaire PP"] || "",
      "Classe": recap["Classe"] || "",
      "Spécialité": recap["Spécialité"] || "",
      "Promotion": recap["Promotion"] || "",
      "Niveau": recap["Niveau"] || "",
      "Semestre": recap["Semestre"] || "",
      "Début": recap["Début"] || "",
      "Fin": recap["Fin"] || "",
      "Facturation": recap["Facturation"] || ""
    });
  }
  return result;
}

// Initiales d'un établissement : les mots déjà tout en majuscules
// (acronymes, ex. "ISET") sont conservés tels quels, les autres mots
// sont réduits à leur première lettre. Ex. "ISET Siliana" -> "ISETS".
// Miroir exact de initialesEtablissement() côté class.html.
function initialesEtablissement(nom) {
  const mots = String(nom || "").trim().split(/\s+/).filter(Boolean);
  return mots
    .map(mot => (mot.length > 1 && mot === mot.toUpperCase()) ? mot : mot.charAt(0).toUpperCase())
    .join('');
}

// Construit le nom de fichier Drive d'une classe. Nomenclature alignée
// sur genererNomFichier() côté class.html : "<Initiales établissement>_<Classe><Spécialité>_Pr<promotion>_<niveau>_<semestre>.html".
// Les caractères interdits par le système de fichiers résiduels sont
// neutralisés en tout dernier lieu, comme pour nomFichierExport().
function nomFichierClasse(classe) {
  const sigle = initialesEtablissement(classe.partenairePP) || "partenaire";
  const classeSpecialite = `${classe.classe || ""}${classe.specialite || ""}` || "CLASSE";
  const promotion = classe.promotion ? `Pr${classe.promotion}` : "Pr?";
  const niveau = String(classe.niveau || "Niv").replace(/\//g, "-");
  const semestre = classe.semestre || "Sem";

  const nom = `${sigle}_${classeSpecialite}_${promotion}_${niveau}_${semestre}`;
  return `${nom}.html`.replace(/[\\/:*?"<>|]/g, "_");
}

// Enregistre (création ou mise à jour) une classe FAD sous forme de
// fichier HTML dans CLASSES_PP_FOLDER_ID. Un éventuel export précédent
// du MÊME fichier (fileId fourni) est mis à jour en place ; sinon un
// nouveau fichier est créé (et un homonyme éventuel écrasé, comme pour
// exportDossierToDrive côté FI).
function exportClasseToDrive(classe, matieres, regroupements, tutorat, etudiants, intervenants, examens, fileId, encadrements, soutenances) {
  const folder = DriveApp.getFolderById(CLASSES_PP_FOLDER_ID);
  const fileName = nomFichierClasse(classe);
  const html = buildClasseHtml(classe, matieres, regroupements, tutorat, etudiants, intervenants, examens, encadrements, soutenances);
  const recap = {
    "Partenaire PP": classe.partenairePP || "",
    "Classe": classe.classe || "",
    "Spécialité": classe.specialite || "",
    "Promotion": classe.promotion || "",
    "Niveau": classe.niveau || "",
    "Semestre": classe.semestre || "",
    "Début": classe.dateDebut || "",
    "Fin": classe.dateFin || "",
    "Facturation": classe.facturationStatut || ""
  };

  if (fileId) {
    const file = DriveApp.getFileById(fileId);
    file.setContent(html);
    file.setName(fileName);
    file.setDescription(JSON.stringify(recap));
    return { url: file.getUrl(), id: file.getId() };
  }

  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const blob = Utilities.newBlob(html, "text/html", fileName);
  const file = folder.createFile(blob);
  file.setDescription(JSON.stringify(recap));
  return { url: file.getUrl(), id: file.getId() };
}

// Relit une classe déjà enregistrée : le fichier HTML embarque un bloc
// JSON complet (fiche signalétique + plan d'étude) — voir
// buildClasseHtml(). Utilisé par class.html?classe=<fileId>.
function chargerClasse(fileId) {
  const file = DriveApp.getFileById(fileId);
  const contenu = file.getBlob().getDataAsString("UTF-8");
  const match = contenu.match(/<script type="application\/json" id="classe-data">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Données introuvables dans ce fichier (format d'export trop ancien).");
  }
  return JSON.parse(match[1]);
}

// Cherche, dans le même dossier Drive (CLASSES_PP_FOLDER_ID), le fichier de
// la MÊME classe (établissement + classe + spécialité + promotion) mais au
// semestre précédent (niveau "i-1/N" au lieu de "i/N"). Utilisé par
// class.html pour proposer la récupération de la liste des inscrits sans
// ressaisie (voir doc en tête de section). S'appuie sur le récap léger
// stocké dans la Description Drive (déjà utilisé par listClassesPP), pas
// besoin d'ouvrir/parser chaque fichier.
// Retourne null si niveau = "i/N" avec i<=1 (aucun semestre précédent
// possible, ex. tout début du cycle) ou si aucun fichier ne correspond.
function trouverClassePrecedente(classe) {
  const niveau = String((classe && classe.niveau) || "");
  const parts = niveau.split("/");
  if (parts.length !== 2) return null;
  const i = Number(parts[0]);
  const n = Number(parts[1]);
  if (!i || !n || i <= 1) return null;
  const niveauPrecedent = `${i - 1}/${n}`;

  const folder = DriveApp.getFolderById(CLASSES_PP_FOLDER_ID);
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    let recap = {};
    try {
      recap = JSON.parse(f.getDescription() || "{}");
    } catch (err) {
      continue;
    }
    if (
      (recap["Partenaire PP"] || "") === (classe.partenairePP || "") &&
      (recap["Classe"] || "") === (classe.classe || "") &&
      (recap["Spécialité"] || "") === (classe.specialite || "") &&
      (recap["Promotion"] || "") === (classe.promotion || "") &&
      (recap["Niveau"] || "") === niveauPrecedent
    ) {
      return { id: f.getId(), url: f.getUrl(), name: f.getName().replace(/\.html$/i, "") };
    }
  }
  return null;
}

// Calcule le Total % FI d'une matière, comme dans le classeur Excel
// source : (Tutorat + Regroupement classe entière + Regroupement 1 seul
// groupe) x 100 / FI. Le regroupement du 2e groupe (regG2) n'est jamais
// compté (un étudiant n'appartient qu'à un seul groupe).
function totalPourcentFI(m) {
  const fi = Number(m.fi) || 0;
  if (fi === 0) return 0;
  const tutorat = Number(m.tutorat) || 0;
  const regClasse = Number(m.regClasse) || 0;
  const regG1 = Number(m.regG1) || 0;
  return Math.round(((tutorat + regClasse + regG1) * 100 / fi) * 100) / 100;
}

// Construit le document HTML exporté sur Drive pour une classe FAD : fiche
// signalétique + listes affichées (inscrits, plan d'étude), plus un bloc
// JSON embarqué (id="classe-data") qui sert de source de vérité pour le
// rechargement (chargerClasse). Les "intervenants" (Frais de coordination :
// montants, RIB, banque) sont inclus dans ce bloc JSON pour la persistance,
// mais volontairement PAS affichés dans le corps visible du document —
// données financières/bancaires, cohérent avec leur exclusion de la modale
// "Imprimer" côté class.html.
function buildClasseHtml(classe, matieres, regroupements, tutorat, etudiants, intervenants, examens, encadrements, soutenances) {
  const lignesEtudiants = (etudiants || []).map((e, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${e.nom || ""}</td>
      <td>${e.prenom || ""}</td>
      <td>${e.cin || ""}</td>
      <td>${e.telephone || ""}</td>
      <td>${e.telephone2 || ""}</td>
      <td>${e.email || ""}</td>
    </tr>`).join("");

  const lignesMatieres = (matieres || []).map((m) => `
    <tr>
      <td>${m.code || ""}</td>
      <td>${m.matiere || ""}</td>
      <td>${m.fi || 0}</td>
      <td>${m.tutorat || 0}</td>
      <td>${m.regClasse || 0}</td>
      <td>${m.regG1 || 0}</td>
      <td>${m.regG2 || 0}</td>
      <td>${m.eval || 0}</td>
      <td>${totalPourcentFI(m)}%</td>
      <td>${m.enseignant || ""}</td>
    </tr>`).join("");

  const totalTutorat = (matieres || []).reduce((s, m) => s + (Number(m.tutorat) || 0), 0);
  const totalRegEtudiant = (matieres || []).reduce((s, m) => s + (Number(m.regClasse) || 0) + (Number(m.regG1) || 0), 0);

  // PFE (classes de niveau 6/6, ouvertes depuis pfe.html) : encadrements et
  // soutenances remplacent le plan d'étude / tutorat / regroupements des
  // classes FAD classiques. Sections rendues seulement si des données
  // existent, pour ne rien changer à l'export des classes FAD.
  const lignesEncadrements = (encadrements || []).map((e) => `
    <tr>
      <td>${e.etudiant || ""}</td>
      <td>${e.sujet || ""}</td>
      <td>${e.encadrant || ""}</td>
      <td>${e.organisme || ""}</td>
      <td>${e.encadrantPro || ""}</td>
      <td>${e.dateDebut || ""}</td>
      <td>${e.dateFin || ""}</td>
      <td>${e.etat || ""}</td>
    </tr>`).join("");

  const blocEncadrements = (encadrements || []).length ? `
  <h2>Encadrants &amp; sujets PFE (${encadrements.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Étudiant</th><th>Sujet</th><th>Encadrant</th><th>Organisme</th>
        <th>Encadrant pro.</th><th>Début</th><th>Fin</th><th>État</th>
      </tr>
    </thead>
    <tbody>${lignesEncadrements}</tbody>
  </table>` : "";

  const lignesSoutenances = (soutenances || []).map((s) => `
    <tr>
      <td>${s.etudiant || ""}</td>
      <td>${s.sujet || ""}</td>
      <td>${s.date || ""}</td>
      <td>${s.heure || ""}</td>
      <td>${s.salle || ""}</td>
      <td>${s.president || ""}</td>
      <td>${s.rapporteur || ""}</td>
      <td>${s.encadrant || ""}</td>
      <td>${(s.note ?? "") !== "" ? s.note : ""}</td>
    </tr>`).join("");

  const blocSoutenances = (soutenances || []).length ? `
  <h2>Soutenances (${soutenances.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Étudiant</th><th>Sujet</th><th>Date</th><th>Heure</th><th>Salle</th>
        <th>Président</th><th>Rapporteur</th><th>Encadrant</th><th>Note</th>
      </tr>
    </thead>
    <tbody>${lignesSoutenances}</tbody>
  </table>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Classe FAD — ${classe.partenairePP || ""} ${classe.classe || ""} ${classe.specialite || ""} ${classe.promotion || ""}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #16262a; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  table td, table th { border: 1px solid #000; padding: 4px; text-align: center; }
  h1, h2 { text-align: center; }
  .fiche_grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 20px auto; max-width: 800px; }
  .fiche_grid div { padding: 4px 0; border-bottom: 1px dotted #999; }
</style>
</head>
<body>
  <h1>Fiche signalétique — Classe FAD</h1>
  <div class="fiche_grid">
    <div><strong>Partenaire PP :</strong> ${classe.partenairePP || ""}</div>
    <div><strong>Classe :</strong> ${classe.classe || ""}</div>
    <div><strong>Spécialité :</strong> ${classe.specialite || ""}</div>
    <div><strong>Promotion :</strong> ${classe.promotion || ""}</div>
    <div><strong>Niveau :</strong> ${classe.niveau || ""}</div>
    <div><strong>Semestre :</strong> ${classe.semestre || ""}</div>
    <div><strong>Cycle de formation :</strong> ${classe.cycle || ""}</div>
    <div><strong>Date début formation :</strong> ${classe.dateDebut || ""}</div>
    <div><strong>Date fin formation :</strong> ${classe.dateFin || ""}</div>
    <div><strong>Responsable :</strong> ${classe.responsableNom || ""} (${classe.responsableFonction || ""})</div>
    <div><strong>N° mémoire :</strong> ${classe.numeroMemoire || ""}</div>
    <div><strong>Date mémoire :</strong> ${classe.dateMemoire || ""}</div>
  </div>

  <h2>Liste des inscrits (${(etudiants || []).length})</h2>
  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Nom</th>
        <th>Prénom</th>
        <th>CIN</th>
        <th>Téléphone</th>
        <th>Téléphone 2</th>
        <th>Email</th>
      </tr>
    </thead>
    <tbody>${lignesEtudiants}</tbody>
  </table>

  <h2>Plan d'étude</h2>
  <table>
    <thead>
      <tr>
        <th>Code matière</th>
        <th>Matière</th>
        <th>FI (h)</th>
        <th>Tutorat (h)</th>
        <th>Regroupement<br>classe entière (h)</th>
        <th>Regroupement<br>G1 (h)</th>
        <th>Regroupement<br>G2 (h)</th>
        <th>Éval (h)</th>
        <th>Total % FI</th>
        <th>Enseignant</th>
      </tr>
    </thead>
    <tbody>${lignesMatieres}</tbody>
  </table>
  <p>
    Total tutorat (classe) : ${totalTutorat} h &nbsp;|&nbsp;
    Total regroupement par étudiant : ${totalRegEtudiant} h
  </p>
  ${blocEncadrements}
  ${blocSoutenances}

  <p style="color:#888;font-size:11px;margin-top:32px;">
    Export généré automatiquement le ${new Date().toLocaleString("fr-TN")}.
    Les mémoires (règlement, formation, coordination) ne sont pas encore
    générées par cet export — à implémenter.
  </p>
  <script type="application/json" id="classe-data">${JSON.stringify({ classe, matieres: matieres || [], regroupements: regroupements || [], tutorat: tutorat || [], etudiants: etudiants || [], intervenants: intervenants || [], examens: examens || [], encadrements: encadrements || [], soutenances: soutenances || [] }).replace(/</g, "\\u003c")}</script>
</body>
</html>`;
}

/* ---------------- Enseignants / intervenants FAD (Sheet "Base", onglet "ensform") ----------------
   En-têtes exacts (dans cet ordre) : CIN | Prénom | Nom | Rôle |
   Coordonnées | Banque | RIB | Fonction.
   - CIN : 8 chiffres.
   - Prénom / Nom : 2 colonnes séparées (prénom 1re lettre majuscule,
     nom de famille tout en majuscule), saisies via 2 champs distincts
     côté class.html. Le "nom complet" (Prénom + Nom) reste l'identifiant
     utilisé côté class.html pour relier un enseignant/intervenant aux
     données de la classe (matieres[i].enseignant, intervenants[i].nom,
     etc.) — voir nomCompletEns() dans class.html.
   - Rôle : "Enseignant", "Coordinateur", ou "Enseignant;Coordinateur"
     si la personne cumule les deux (même principe que "Convention"
     dans partpp).
   - Coordonnées : Tél / Email / Adresse saisis séparément côté
     class.html puis combinés en une seule cellule multi-lignes
     ("Tél : ...\nEmail : ...\nAdresse : ..."), même principe que les
     cellules "Coordonnées"/"Coordonnées DIR"/"Coordonnées CORD" de
     partpp.
   - RIB : 20 chiffres, en un seul champ (plus de RIB1/RIB2 séparés).
   - Fonction : intitulé libre saisi côté class.html, utilisé dans le
     mémoire individuel de coordination (FORM.PP.04) à la place du champ
     "Rôle" (qui reste "Enseignant"/"Coordinateur", pas un intitulé de
     fonction).
   IMPORTANT : ce schéma remplace un ancien jeu de colonnes plus large
   (CIN, Prénom, Nom, Rôle, Téléphone, Email, Adresse1, Adresse2,
   Banque, RIB1, RIB2), puis un schéma intermédiaire avec un seul champ
   "Nom" combiné (Prénom NOM) sans "Fonction" — la ligne d'en-têtes de
   l'onglet "ensform" doit être mise à jour manuellement dans la Sheet
   pour correspondre à ce nouveau schéma ; listBaseRows/createBaseRow
   lisent/écrivent selon les en-têtes réels de la feuille, donc aucune
   migration de données existantes n'est faite automatiquement ici (les
   enregistrements déjà saisis avec un seul champ "Nom" combiné devront
   être répartis manuellement entre "Prénom" et "Nom").
   Base réutilisable entre toutes les classes FAD — ne contient pas les
   matières enseignées, celles-ci étant connues via le Plan d'étude de
   chaque classe (class.html). Les classes elles-mêmes ne sont pas
   dans cette Sheet ni dans aucune Sheet : voir listClassesPP()
   ci-dessous (fichiers HTML dans Drive). */

function listEnsForm() { return listBaseRows("ensform"); }
function createEnsForm(record) { return createBaseRow("ensform", record); }
function updateEnsForm(rowNumber, record) { return updateBaseRow("ensform", rowNumber, record); }
function deleteEnsForm(rowNumber) { return deleteBaseRow("ensform", rowNumber); }

/* ---------------- Prospections (Sheet "Base", onglet "prosp_suivi") ----------------
   Journal des contacts/actions de prospection, lié à une entreprise par son
   nom (Raison sociale) — même convention que les calculs exportés depuis
   fi.html, pas de clé technique séparée. En-têtes : entreprise | date |
   type | notes | prochaine_action | prochaine_date | auteur. Utilisé par
   prosp.html, avec eses.Dispositif/eses.Statut pour organiser le pipeline. */

function listProspSuivi() { return listBaseRows("prosp_suivi"); }
function createProspSuivi(record) { return createBaseRow("prosp_suivi", record); }
function updateProspSuivi(rowNumber, record) { return updateBaseRow("prosp_suivi", rowNumber, record); }
function deleteProspSuivi(rowNumber) { return deleteBaseRow("prosp_suivi", rowNumber); }

/* ---------------- Manuels de procédures (Sheet "Base", dossier Drive MANUELS_FOLDER_ID) ----------------
   Chaque manuel est un fichier .html brut déposé dans MANUELS_FOLDER_ID
   (ex: Manuel_CI.html). listManuels() liste les fichiers du dossier ;
   getManuelHtml(id) renvoie le contenu HTML brut d'un fichier donné, pour
   être injecté via iframe.srcdoc dans pages/manuel.html. */

function listManuels() {
  const folder = DriveApp.getFolderById(MANUELS_FOLDER_ID);
  const files = folder.getFilesByType(MimeType.HTML);
  const out = [];
  while (files.hasNext()) {
    const f = files.next();
    out.push({
      id: f.getId(),
      name: f.getName().replace(/\.html?$/i, ""),
      updated: f.getLastUpdated()
    });
  }
  return out;
}

function getManuelHtml(fileId) {
  return DriveApp.getFileById(fileId).getBlob().getDataAsString("UTF-8");
}

/* ---------------- Export Drive (Formation initiale) ---------------- */

function exportDossierToDrive(dossier, stagesGrouped) {
  const rootFolder = DriveApp.getFolderById(FI_EXPORT_ROOT_FOLDER_ID);
  const anneeFolder = getOrCreateSubfolder(rootFolder, String(dossier.annee));

  const fileName = nomFichierExport(dossier);

  // Supprime un éventuel export précédent du même dossier pour éviter les doublons
  const existing = anneeFolder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const html = buildDossierHtml(dossier, stagesGrouped);
  const blob = Utilities.newBlob(html, "text/html", fileName);
  const file = anneeFolder.createFile(blob);
  file.setDescription(String(dossier.budget || "")); // lu par listCalculs() sans ouvrir le fichier

  return { url: file.getUrl(), id: file.getId() };
}

// Nomenclature inspirée du projet VB.NET : "DTI2026 FI2025 <entreprise>.html"
// (anneeCourante = année d'exécution du DTI, dossier.annee = année de FI /
// "année précédente"). Seuls les caractères interdits par le système de
// fichiers sont neutralisés ; espaces et accents sont conservés tels quels.
function nomFichierExport(dossier) {
  const anneeCourante = new Date().getFullYear();
  const nom = `DTI${anneeCourante} FI${dossier.annee} ${dossier.entreprise}`;
  return `${nom}.html`.replace(/[\\/:*?"<>|]/g, "_");
}

function getOrCreateSubfolder(parentFolder, name) {
  const it = parentFolder.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parentFolder.createFolder(name);
}

// Relit un calcul déjà enregistré : le fichier HTML exporté embarque un bloc
// JSON complet (entreprise, année, régime, smig, budget, stages) — voir
// buildDossierHtml(). Utilisé par "Reprendre" (fi.html) et "Afficher"
// (dti.html) pour recharger les stages dans les tableaux par catégorie,
// exactement comme au moment de la saisie.
function chargerCalcul(fileId) {
  const file = DriveApp.getFileById(fileId);
  const contenu = file.getBlob().getDataAsString("UTF-8");
  const match = contenu.match(/<script type="application\/json" id="fi-data">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Données introuvables dans ce fichier (format d'export trop ancien).");
  }
  return JSON.parse(match[1]);
}

/* ---------------- Aide au formatage (miroir de js/format.js côté serveur) ---------------- */

function formatMontantGS(valeur) {
  const n = Number(String(valeur ?? "0").replace(",", "."));
  if (Number.isNaN(n)) return "----";
  return `${n.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
}

function formatDureeGS(valeur) {
  const n = Number(valeur);
  return Number.isNaN(n) ? "----" : n.toFixed(2).replace(".", ",");
}

function formatGenreTexteGS(nb, masculin) {
  if (nb === 0) return masculin ? "Aucun homme" : "Aucune femme";
  if (nb === 1) return masculin ? "1 homme" : "1 femme";
  return masculin ? `${nb} hommes` : `${nb} femmes`;
}

// Reproduit calculerStatsCategorie() de fi.html côté serveur, à partir des
// lignes brutes envoyées par le frontend (numero, date_debut, date_fin,
// duree_declaree, duree_calculee, duree_agreee, genre).
function calculerStatsCategorieGS(rows, categorie, smig) {
  let nbH = 0, nbF = 0, total4 = 0, total6 = 0;

  rows.forEach((r) => {
    const durDec = parseFloat(String(r.duree_declaree || "").replace(",", "."));
    const durAgr = parseFloat(String(r.duree_agreee || "").replace(",", "."));
    if (!Number.isNaN(durDec)) total4 += durDec;
    if (!Number.isNaN(durAgr)) total6 += durAgr;

    const genre = String(r.genre || "").trim().toLowerCase();
    if (genre === "homme") nbH += 1;
    if (genre === "femme") nbF += 1;
  });

  total4 = Math.round(total4 * 100) / 100;
  total6 = Math.round(total6 * 100) / 100;

  const smigNum = Number(String(smig ?? "0").replace(",", "."));
  const montant = categorie === "apprentissage"
    ? Math.floor(total6 * smigNum * 0.5 * 1000) / 1000
    : Math.floor(total6 * smigNum * 1000) / 1000;

  return { nbH, nbF, total4, total6, montant, count: rows.length };
}

// Contenu de l'export : inspiré de la structure des calculs sauvegardés par
// le projet VB.NET (en-tête entreprise/budget, un bloc de stats par
// catégorie, puis le détail ligne par ligne des catégories renseignées).
function buildDossierHtml(dossier, stagesGrouped) {
  const anneeCourante = new Date().getFullYear();
  const categories = [
    { key: "apprentissage", label: "Apprentissage" },
    { key: "alternance", label: "Formation en alternance" },
    { key: "stages", label: "Stages pratiques et obligatoires" }
  ];

  const stats = categories.map(({ key, label }) => ({
    key, label, ...calculerStatsCategorieGS(stagesGrouped[key] || [], key, dossier.smig)
  }));

  const blocsStats = stats.map((s) => `
    <div style="border:1px solid #000;padding:10px;margin:15px auto;width:70%;text-align:left;">
      <h3 style="background:#d3d3d3;margin:-10px -10px 10px -10px;padding:6px;">${s.label}</h3>
      ${s.count > 0 ? `
        <div>${formatGenreTexteGS(s.nbH, true)}</div>
        <div>${formatGenreTexteGS(s.nbF, false)}</div>
        <div>Durée déclarée : ${formatDureeGS(s.total4)} mois</div>
        <div>Durée agréée : ${formatDureeGS(s.total6)} mois</div>
        <div>Mt agréé : ${formatMontantGS(s.montant)}</div>
      ` : `<div style="text-align:center;font-weight:bold;color:#666;">Aucun stage</div>`}
    </div>`).join("");

  const tables = stats.filter((s) => s.count > 0).map((s) => {
    const rows = stagesGrouped[s.key] || [];
    const rowsHtml = rows.map((r) => `
      <tr>
        <td>${r.numero || ""}</td>
        <td>${r.date_debut || ""}</td>
        <td>${r.date_fin || ""}</td>
        <td>${r.duree_declaree || ""}</td>
        <td>${r.duree_calculee || ""}</td>
        <td>${r.duree_agreee || ""}</td>
        <td>${r.genre || ""}</td>
      </tr>`).join("");

    return `
      <div style="page-break-before:always;padding-top:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <h2 style="margin:0;font-size:16px;">Droits de tirage individuels ${anneeCourante}</h2>
          <h2 style="margin:0;font-size:16px;">Formation initiale ${dossier.annee}</h2>
        </div>
        <div style="display:flex;justify-content:space-between;background:#d3d3d3;padding:10px;font-weight:bold;">
          <h2 style="margin:0;">${dossier.entreprise}</h2>
          <h2 style="margin:0;">${formatMontantGS(dossier.budget)}</h2>
        </div>
        <div style="background:#d3d3d3;padding:10px;">
          <h3 style="margin:0;">${s.label}</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:4px;">N°</th>
              <th style="border:1px solid #000;padding:4px;">Date début</th>
              <th style="border:1px solid #000;padding:4px;">Date fin</th>
              <th style="border:1px solid #000;padding:4px;">Durée déclarée</th>
              <th style="border:1px solid #000;padding:4px;">Durée calculée</th>
              <th style="border:1px solid #000;padding:4px;">Durée agréée</th>
              <th style="border:1px solid #000;padding:4px;">Genre</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }).join("");

  // Bloc de données machine-lisible embarqué dans le fichier : c'est ce qui
  // permet à "Reprendre" (fi.html) et "Afficher" (dti.html) de reconstruire
  // les tableaux de stages exactement comme au moment de la saisie, sans
  // dépendre d'une Sheet séparée. "</" est échappé pour ne jamais casser la
  // balise <script> si un nom d'entreprise (improbable) le contenait.
  const donnees = JSON.stringify({
    entreprise: dossier.entreprise,
    annee: dossier.annee,
    regime: dossier.regime || "",
    smig: dossier.smig || "",
    budget: dossier.budget,
    stages: stagesGrouped
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Formation initiale ${dossier.annee} — ${dossier.entreprise}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #16262a; }
  table td, table th { border: 1px solid #000; padding: 4px; text-align: center; }
</style>
</head>
<body>
  <div style="text-align:center;margin-top:20px;">
    <h1>Droits de tirage individuels ${anneeCourante}</h1>
    <h2>${dossier.entreprise}</h2>
    <h2>Budget global : ${formatMontantGS(dossier.budget)}</h2>
  </div>
  ${blocsStats}
  ${tables}
  <p style="color:#888;font-size:11px;margin-top:32px;">
    Export généré automatiquement le ${new Date().toLocaleString("fr-TN")}.
  </p>
  <script type="application/json" id="fi-data">${donnees}</script>
</body>
</html>`;
}

/* ---------------- Calculs existants (liste Drive) ----------------
   Le fichier HTML exporté (voir exportDossierToDrive) EST la trace
   persistante d'un calcul — pas de Sheet fi_dossiers/fi_stages : le
   dossier Drive (un sous-dossier par année de FI) est la seule source
   de vérité pour "quels calculs existent déjà". */

function listCalculs(annee) {
  const root = DriveApp.getFolderById(FI_EXPORT_ROOT_FOLDER_ID);
  const it = root.getFoldersByName(String(annee));
  if (!it.hasNext()) return [];

  const folder = it.next();
  const anneeCourante = new Date().getFullYear();
  const prefixe = `DTI${anneeCourante} FI${annee} `;

  const files = folder.getFiles();
  const result = [];
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName().replace(/\.html$/i, "");
    const entreprise = name.startsWith(prefixe) ? name.slice(prefixe.length) : name;
    result.push({ name, entreprise, budget: f.getDescription() || "", url: f.getUrl(), id: f.getId() });
  }
  return result;
}

/* ---------------- Helpers CRUD (Sheet métier) ---------------- */

function getOrCreateSheet(name) {
  const ss = getSpreadsheetForSheet(name);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(["id", "createdAt"]);
  }
  return sh;
}

function listRecords(sheetName) {
  const sh = getOrCreateSheet(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values.slice(1)
    .filter((row) => row[0] !== "") // ignore lignes vides
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}

function createRecord(sheetName, record) {
  const sh = getOrCreateSheet(sheetName);
  const headers = ensureHeaders(sh, record);

  const id = Utilities.getUuid();
  const fullRecord = { ...record, id, createdAt: new Date().toISOString() };

  const row = headers.map((h) => (fullRecord[h] !== undefined ? fullRecord[h] : ""));
  sh.appendRow(row);
  return fullRecord;
}

function updateRecord(sheetName, id, record) {
  const sh = getOrCreateSheet(sheetName);
  const { rowIndex, headers } = findRowById(sh, id);
  if (rowIndex === -1) throw new Error("Enregistrement introuvable");

  const existing = getRowAsObject(sh, rowIndex, headers);
  const updated = { ...existing, ...record, id };
  ensureHeaders(sh, updated);

  const finalHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = finalHeaders.map((h) => (updated[h] !== undefined ? updated[h] : ""));
  sh.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return updated;
}

function deleteRecord(sheetName, id) {
  const sh = getOrCreateSheet(sheetName);
  const { rowIndex } = findRowById(sh, id);
  if (rowIndex === -1) throw new Error("Enregistrement introuvable");
  sh.deleteRow(rowIndex);
  return { id };
}

function findRowById(sh, id) {
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("id");
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === id) {
      return { rowIndex: i + 1, headers };
    }
  }
  return { rowIndex: -1, headers };
}

function getRowAsObject(sh, rowIndex, headers) {
  const row = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach((h, i) => (obj[h] = row[i]));
  return obj;
}

// Ajoute automatiquement toute nouvelle clé du record comme colonne
function ensureHeaders(sh, record) {
  let headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  headers = headers.filter((h) => h !== "");

  const missing = Object.keys(record).filter((k) => !headers.includes(k));
  if (missing.length > 0) {
    headers = [...headers, ...missing];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
/* ---------------- Bilans Crédit d'impôt (Drive, dossier BILANS_CI_FOLDER_ID) ----------------
   Même modèle que les classes FAD (exportClasseToDrive/chargerClasse) : un
   bilan = un fichier HTML unique dans BILANS_CI_FOLDER_ID, nommé
   "#refbil_abbreviation.html" où refbil = "BPF/<numéro>/<année>/<34|11>"
   avec les "/" remplacés par "_". Le récap (antenne, entreprise, exercice,
   montant, statut) est stocké en JSON compact dans la Description Drive
   pour être listé par ci.html sans ouvrir chaque fichier. */

// Construit le nom de fichier Drive d'un bilan : "#refbil_abbreviation.html",
// "/" -> "_" (miroir de nomFichierBilan() côté bilan.html).
function nomFichierBilan(bilan) {
  const refbil = String((bilan && bilan.refbil) || "").replace(/\//g, "_");
  const abreviation = String((bilan && bilan.abreviation) || "").trim() || "sans-abreviation";
  return `#${refbil}_${abreviation}.html`.replace(/[\\/:*?"<>|]/g, "_");
}

function recapBilan(bilan) {
  return {
    "Antenne": bilan.antenne || "",
    "Entreprise": bilan.entreprise || "",
    "Abréviation": bilan.abreviation || "",
    "Référence": bilan.refbil || "",
    "Exercice": bilan.annee || "",
    "Montant": bilan.avance || "",
    "Statut": bilan.etat || "",
    // Utilisée par index.html (carte Crédit d'impôt) pour signaler les
    // bilans Siliana actifs dont le délai de clôture (2 mois après la fin
    // de la dernière action) est dépassé, sans ouvrir chaque fichier.
    "DateDerniereAction": bilan.dateDerniereAction || ""
  };
}

// Liste les bilans du dossier Drive, éventuellement filtrés sur l'antenne
// ("sa" = Siliana, "tn" = Tunis).
function listBilansCI(antenne) {
  const folder = DriveApp.getFolderById(BILANS_CI_FOLDER_ID);
  const it = folder.getFiles();
  const result = [];
  while (it.hasNext()) {
    const f = it.next();
    let recap = {};
    try {
      recap = JSON.parse(f.getDescription() || "{}");
    } catch (err) {
      recap = {};
    }
    if (antenne && recap["Antenne"] && recap["Antenne"] !== antenne) continue;
    result.push({
      id: f.getId(),
      url: f.getUrl(),
      name: f.getName().replace(/\.html$/i, ""),
      antenne: recap["Antenne"] || "",
      entreprise: recap["Entreprise"] || "",
      abreviation: recap["Abréviation"] || "",
      refbil: recap["Référence"] || "",
      exercice: recap["Exercice"] || "",
      montant: recap["Montant"] || "",
      statut: recap["Statut"] || "",
      dateDerniereAction: recap["DateDerniereAction"] || ""
    });
  }
  return result;
}

// Enregistre (création ou mise à jour) un bilan CI dans BILANS_CI_FOLDER_ID.
function exportBilanToDrive(bilan, fileId) {
  const folder = DriveApp.getFolderById(BILANS_CI_FOLDER_ID);
  const fileName = nomFichierBilan(bilan);
  const html = buildBilanHtml(bilan);
  const recap = recapBilan(bilan);

  if (fileId) {
    const file = DriveApp.getFileById(fileId);
    file.setContent(html);
    file.setName(fileName);
    file.setDescription(JSON.stringify(recap));
    return { url: file.getUrl(), id: file.getId(), name: fileName };
  }

  const existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  const blob = Utilities.newBlob(html, "text/html", fileName);
  const file = folder.createFile(blob);
  file.setDescription(JSON.stringify(recap));
  return { url: file.getUrl(), id: file.getId(), name: fileName };
}

// Relit un bilan déjà enregistré (bloc JSON embarqué id="bilan-data").
function chargerBilan(fileId) {
  const file = DriveApp.getFileById(fileId);
  const contenu = file.getBlob().getDataAsString("UTF-8");
  const match = contenu.match(/<script type="application\/json" id="bilan-data">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Données introuvables dans ce fichier (format d'export trop ancien).");
  }
  return JSON.parse(match[1]);
}

function supprimerBilan(fileId) {
  DriveApp.getFileById(fileId).setTrashed(true);
  return { ok: true };
}

// Document HTML exporté sur Drive pour un bilan CI : fiche lisible + bloc
// JSON embarqué qui sert de source de vérité au rechargement.
function buildBilanHtml(bilan) {
  const b = bilan || {};
  const ligne = (libelle, valeur) => `<tr><th>${libelle}</th><td>${valeur === null || valeur === undefined || valeur === "" ? "----" : valeur}</td></tr>`;
  const antenneLabel = b.antenne === "tn" ? "Tunis" : "Siliana";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${b.refbil || "Bilan"} - ${b.abreviation || ""}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
  h1 { font-size: 20px; }
  table { border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f4f2ee; width: 260px; }
</style>
</head>
<body>
<h1>Bilan Crédit d'impôt — ${antenneLabel}</h1>
<table>
${ligne("Référence bilan", b.refbil)}
${ligne("Abréviation", b.abreviation)}
${ligne("Entreprise", b.entreprise)}
${ligne("Numéro bilan", b.numero)}
${ligne("Année bilan", b.annee)}
${ligne("État", b.etat)}
${ligne("Avance", b.avance)}
${ligne("Base", b.base)}
${ligne("Nb employés permanents", b.nbEmployes)}
${ligne("PVCCE", b.pvcceDepose)}
${ligne("Date clôture", b.dateCloture)}
${ligne("Mois d'épuisement", b.moisEpuisement)}
${ligne("RNE", b.rne)}
</table>
<script type="application/json" id="bilan-data">${JSON.stringify(b)}</` + `script>
</body>
</html>`;
}