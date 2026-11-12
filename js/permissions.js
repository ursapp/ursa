/* ============================================================
   PERMISSIONS.JS
   Droits d'accès par module, lus dans l'onglet "users" de la Sheet
   Paramètres. Chaque colonne de droit vaut :
       (vide)    → aucun accès (page / section / lien masqués)
       "Lecture" → consultation seule (boutons d'écriture masqués,
                   fiches verrouillées, écritures bloquées côté api.js)
       "Edition" → accès complet

   Colonnes : prosp | ci | dti | dtc | part | docs
              pp.Compagne | pp.Demandes | pp.Dossiers | pp.Inscrits | pp.Classes
   (« pp.Campagne » est aussi accepté.)

   Pages autonomes : elles SUIVENT la page d'origine (voir PAGES_CLES) :
       fi, plan → dti        bilan → ci        class, mod, pfe → pp.Classes
       prosp a sa propre colonne.  coord.html (invité) n'est pas concerné.

   Ce n'est PAS une sécurité serveur (voir README §5) : c'est un contrôle
   d'interface, doublé d'un blocage des appels d'écriture dans apiCall().

   À charger juste après js/session.js, dans le <head> (la garde de page
   s'exécute immédiatement, avant l'affichage).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Tables de correspondance ---------- */

  // Clé de droit → colonnes possibles de l'onglet "users" (la 1re trouvée gagne).
  const COLONNES = {
    "prosp": ["prosp"],
    "ci": ["ci"],
    "dti": ["dti"],
    "dtc": ["dtc"],
    "part": ["part"],
    "docs": ["docs"],
    "pp.campagne": ["pp.Compagne", "pp.Campagne"],
    "pp.demandes": ["pp.Demandes"],
    "pp.dossiers": ["pp.Dossiers"],
    "pp.inscrits": ["pp.Inscrits"],
    "pp.classes": ["pp.Classes"],
  };
  const SECTIONS_PP = ["campagne", "demandes", "dossiers", "inscrits", "classes"];

  // Fichier de la page → clé de droit ("pp" = page à sections, droits par section).
  const PAGES_CLES = {
    ci: "ci", bilan: "ci",
    dti: "dti", fi: "dti", plan: "dti",
    dtc: "dtc",
    pp: "pp", class: "pp.classes", mod: "pp.classes", pfe: "pp.classes",
    part: "part", docs: "docs",
    prosp: "prosp",
  };
  const PAGES_AUTONOMES = ["fi", "plan", "bilan", "class", "mod", "pfe", "prosp"];

  /* ---------- Niveaux ---------- */

  const NON = 0, LECTURE = 1, EDITION = 2;

  function normaliser(v) {
    return String(v == null ? "" : v).trim().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function niveauDe(valeur) {
    const n = normaliser(valeur);
    if (n === "edition") return EDITION;
    if (n === "lecture") return LECTURE;
    return NON;
  }

  function nomPage() {
    const f = window.location.pathname.split("/").pop() || "index.html";
    return f.replace(/\.html?$/i, "") || "index";
  }

  // Accès invité (coord.html → class/pfe/mod) : pas de session principale,
  // ces pages restreignent elles-mêmes l'interface.
  function estInvite() {
    const p = new URLSearchParams(window.location.search);
    return p.has("gclasse") || p.has("gmodule");
  }

  function utilisateur() {
    return typeof getCurrentUser === "function" ? getCurrentUser() : null;
  }

  // Niveau (NON / LECTURE / EDITION) pour une clé précise ("ci", "pp.demandes"…)
  // ou pour "pp" (= meilleur niveau parmi les sections PP).
  function niveau(cle, user) {
    const u = user === undefined ? utilisateur() : user;
    if (!u) return NON;
    if (cle === "pp") {
      return Math.max(NON, ...SECTIONS_PP.map((s) => niveau("pp." + s, u)));
    }
    const colonnes = COLONNES[cle];
    if (!colonnes) return EDITION; // clé inconnue : pas de restriction
    for (const c of colonnes) {
      if (c in u) return niveauDe(u[c]);
    }
    return NON;
  }

  const peutVoir = (cle, user) => niveau(cle, user) >= LECTURE;
  const peutEditer = (cle, user) => niveau(cle, user) >= EDITION;

  /* ---------- Sections PP ---------- */

  function sectionsPPAutorisees(user) {
    return SECTIONS_PP.filter((s) => peutVoir("pp." + s, user));
  }

  // Section demandée si elle est autorisée, sinon la première autorisée
  // (ordre de la sidebar), sinon "" (aucune).
  function sectionPPAutorisee(demandee) {
    const ok = sectionsPPAutorisees();
    return ok.includes(demandee) ? demandee : (ok[0] || "");
  }

  /* ---------- Garde de page ---------- */

  function cleDeLaPage() {
    return PAGES_CLES[nomPage()] || null;
  }

  function redirigerAccueil() {
    window.location.replace("index.html");
  }

  // Session ouverte avant l'introduction des droits : aucune colonne de droit
  // dans le profil mémorisé (la reconnexion rechargera les profils à jour).
  function sessionObsolete(user) {
    const u = user === undefined ? utilisateur() : user;
    return !!u && !Object.values(COLONNES).flat().some((c) => c in u);
  }

  (function garde() {
    const cle = cleDeLaPage();
    if (!cle || estInvite()) return;
    const u = utilisateur();
    if (!u) return; // session.js (protegerPage) redirige déjà
    if (sessionObsolete(u)) {
      if (typeof clearCurrentUser === "function") clearCurrentUser();
      redirigerAccueil();
      return;
    }
    if (!peutVoir(cle, u)) redirigerAccueil();
  })();

  /* ---------- Blocage des écritures (utilisé par api.js) ---------- */

  const LECTURES = /^(list|get|charger|trouver|infos|detail|presence)/i;

  // Action Apps Script → clé de droit nécessaire pour l'écrire (null = clé de la page).
  const REGLES_ACTIONS = [
    [/CampagnePP$/i, "pp.campagne"],
    [/DemandePP$/i, "pp.demandes"],
    [/DossierPP$/i, "pp.dossiers"],
    [/InscritPP$/i, "pp.inscrits"],
    [/SpecialitePP$/i, "pp"],
    [/(Classe|Module|EnsForm)|notifierCheckTutorat/i, "pp.classes"],
    [/(Ese|Cabinet|Cabsan|PartPP|PartDTC)$/i, "part"],
    [/ProspSuivi$/i, "prosp"],
    [/DTC$/i, "dtc"],
    [/(Bilan|Tdb)/i, "ci"],
    [/(Calcul|Plan|Commission|ActionsPlan|Action$|ControleAction|EnvoiDecision|LettrePdf|LettreCommission|ToDrive)/i, "dti"],
  ];

  // Onglet Sheet (actions génériques create/update/delete) → clé de droit.
  const REGLES_FEUILLES = {
    eses: "part", cabinets: "part", cabsan: "part", partpp: "part", partdtc: "part",
    ensform: "pp.classes", prosp_suivi: "prosp",
    campagne: "pp.campagne", demandes: "pp.demandes", dossiers: "pp.dossiers",
    inscrits: "pp.inscrits", specialites: "pp",
  };

  function cleAction(action, payload) {
    if (payload && payload.sheet) {
      const k = REGLES_FEUILLES[normaliser(payload.sheet)];
      if (k) return k;
    }
    for (const [re, cle] of REGLES_ACTIONS) if (re.test(action)) return cle;
    return cleDeLaPage();
  }

  // Lève une Error si l'utilisateur n'a pas le droit d'écriture requis.
  function verifierAppel(action, payload) {
    if (LECTURES.test(String(action || ""))) return;
    const u = utilisateur();
    if (!u) return; // invité / accueil non connecté : rien à vérifier ici
    const cle = cleAction(String(action || ""), payload);
    if (!cle) return; // page sans droit propre (accueil) : pas de restriction
    const autorise = cle === "pp"
      ? SECTIONS_PP.some((s) => peutEditer("pp." + s, u))
      : peutEditer(cle, u);
    if (!autorise) {
      throw new Error("Accès en lecture seule : vous n'avez pas le droit de modifier ces données.");
    }
  }

  /* ---------- Interface : mode lecture ---------- */

  // Contrôles d'écriture masqués en mode Lecture. Convention de nommage des ids
  // (…_btn_nouveau, …_btn_enregistrer, …) + rôle visuel destructif + marqueur
  // explicite [data-edit-only] pour les cas particuliers.
  const SEL_ECRITURE = [
    '[id$="_btn_nouveau"]', '[id*="_btn_nouveau_"]', '[id*="_btn_nouvelle"]',
    '[id$="_btn_enregistrer"]', '[id*="_btn_enregistrer_"]',
    '[id$="_btn_valider"]', '[id$="_btn_supprimer"]', '[id$="_btn_archiver"]',
    '[id$="_btn_vider"]', '[id$="_btn_planifier"]', '[id$="_btn_editer"]',
    '[id*="_btn_import"]', '[id*="_btn_ajouter"]', '[id*="btn_passage"]',
    '[id$="_btn_save_statut"]', '[id$="_btn_propager"]',
    '[data-smig-save]', '.fi_add_btn',
    '.btn_danger', '.btn_danger_small',
    '.row_action_edit', '.row_action_delete', '.row_action_reset',
    '[data-edit-only]',
  ];
  // Un bouton marqué [data-read-ok] n'est jamais masqué.
  const SEL_ECRITURE_CSS = SEL_ECRITURE.map((s) => `.perm_lecture ${s}:not([data-read-ok])`).join(",\n");
  const SEL_SUBMIT = 'form button[type="submit"]';

  const style = document.createElement("style");
  style.textContent =
    `${SEL_ECRITURE_CSS},\n.perm_lecture ${SEL_SUBMIT}:not([data-read-ok]) { display: none !important; }
     .perm_lecture .perm_badge_lecture { display: inline-flex; }
     .perm_badge_lecture { display: none; align-items: center; gap: 4px; font-size: .75rem;
       padding: 2px 8px; border-radius: 999px; border: 1px solid currentColor; opacity: .75; }`;
  document.head.appendChild(style);

  const SEL_ECRITURE_JS = SEL_ECRITURE.concat([SEL_SUBMIT]).join(",");

  // Niveau applicable à un élément : [data-perm] le plus proche, sinon la page.
  function niveauElement(el) {
    const h = el.closest("[data-perm]");
    if (h) return niveau(h.dataset.perm);
    const cle = cleDeLaPage();
    return cle ? niveau(cle) : EDITION;
  }

  const SEL_CHAMPS = "input, select, textarea";
  function verrouillerChamps(racine) {
    racine.querySelectorAll(SEL_CHAMPS).forEach((el) => {
      if (el.dataset.permLocked || el.hasAttribute("data-read-ok")) return;
      const t = (el.type || "").toLowerCase();
      if (["hidden", "button", "submit", "reset", "search"].includes(t)) return;
      if (/_search(_|$)/.test(el.id || "")) return; // champs de recherche / filtres
      el.dataset.permLocked = "1";
      if (el.tagName === "SELECT" || ["checkbox", "radio", "file", "range", "color"].includes(t)) {
        el.disabled = true;
      } else {
        el.readOnly = true;
      }
    });
  }

  // Une modale n'est verrouillée que si elle sert à écrire (bouton d'écriture
  // ou formulaire) : les modales d'impression / de choix restent utilisables.
  function modaleEcriture(overlay) {
    return !!overlay.querySelector(SEL_ECRITURE_JS);
  }

  function appliquer() {
    const user = utilisateur();
    if (!user || estInvite()) return;
    const cle = cleDeLaPage();
    const pageAutonome = PAGES_AUTONOMES.includes(nomPage());

    // Marque chaque zone [data-perm] (sections PP, modales PP…) en lecture.
    document.querySelectorAll("[data-perm]").forEach((el) => {
      el.classList.toggle("perm_lecture", niveau(el.dataset.perm) === LECTURE);
    });
    // Niveau de la page elle-même (hors pp, dont les droits sont par section).
    if (cle && cle !== "pp") {
      document.body.classList.toggle("perm_lecture", niveau(cle) === LECTURE);
    }

    // Verrouillage des champs.
    document.querySelectorAll(".modal_overlay, .fi_modal_overlay").forEach((ov) => {
      if (niveauElement(ov) === LECTURE && modaleEcriture(ov)) verrouillerChamps(ov);
    });
    document.querySelectorAll("[data-perm-lock]").forEach((zone) => {
      if (niveauElement(zone) === LECTURE) verrouillerChamps(zone);
    });
    if (pageAutonome && cle && niveau(cle) === LECTURE) {
      document.querySelectorAll("main, .app_content, body > section, .block_metiers").forEach((zone) => {
        if (zone.closest(".modal_overlay, .fi_modal_overlay")) return;
        verrouillerChamps(zone);
      });
    }
  }

  let planifie = false;
  function planifier() {
    if (planifie) return;
    planifie = true;
    requestAnimationFrame(() => { planifie = false; appliquer(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    appliquer();
    // Contenus rendus dynamiquement (tableaux, modales) et modales qui s'ouvrent.
    new MutationObserver(planifier).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["class"],
    });
  });

  /* ---------- API publique ---------- */

  window.URSPerm = {
    NON, LECTURE, EDITION,
    niveau, peutVoir, peutEditer,
    SECTIONS_PP, sectionsPPAutorisees, sectionPPAutorisee,
    cleDeLaPage, verifierAppel, appliquer, sessionObsolete,
    // Pages à sidebar (sidebar_menu.js, cartes de l'accueil) :
    // le module est-il visible, quelles sections, laquelle par défaut ?
    moduleVisible: (page) => peutVoir(page),
    sectionVisible: (page, section) => (page === "pp" ? peutVoir("pp." + section) : peutVoir(page)),
    sectionParDefaut: (page, def) => (page === "pp" ? sectionPPAutorisee(def) : def),
  };
})();
