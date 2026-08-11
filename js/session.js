/* ============================================================
   SESSION.JS
   Utilisateur "connecté" — sélection d'un profil (onglet "users")
   authentifiée par mot de passe (colonne M2p ; un profil sans M2p
   n'a pas d'accès, voir modale de connexion sur index.html).
   "Rester connecté(e)" (case à cocher) détermine où la session est
   mémorisée :
     - coché   → localStorage (persiste après fermeture du navigateur)
     - décoché → sessionStorage (effacé à la fermeture de l'onglet)
   getCurrentUser() regarde les deux (localStorage en priorité).
   ============================================================ */

// Le bouton précédent/suivant du navigateur peut restaurer la page depuis
// le bfcache (back-forward cache) : le DOM réapparaît tel qu'il était AVANT
// le chargement du script, sans ré-exécuter DOMContentLoaded. Si on vient de
// se déconnecter puis qu'on revient en arrière sur cette page, elle
// réafficherait donc à tort l'état "connecté" alors que la session est bien
// effacée. On force un rechargement complet dans ce cas précis pour que
// tout (badge, boutons, cartes visibles...) soit recalculé à partir de
// getCurrentUser().
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

const URS_SESSION_KEY = "urs_current_user";

function getCurrentUser() {
  try {
    const brut = localStorage.getItem(URS_SESSION_KEY) || sessionStorage.getItem(URS_SESSION_KEY);
    return brut ? JSON.parse(brut) : null;
  } catch (err) {
    return null;
  }
}

// Garde d'accès : index.html gère sa propre modale de connexion, mais les
// pages sous /pages/ n'ont aucune protection propre — sans ceci, elles
// restent pleinement utilisables (contenu, formulaires...) même sans
// utilisateur connecté, y compris après une déconnexion + retour arrière.
// On exécute ce contrôle tout de suite (pas seulement à DOMContentLoaded)
// pour rediriger le plus tôt possible. replace() évite d'ajouter une entrée
// dans l'historique, pour ne pas pouvoir "revenir" sur la page protégée.
// Exception : class.html?gclasse=... est un accès "invité" venant de
// coord.html (session urs_coord_user, distincte de urs_current_user) — pas
// de session principale attendue dans ce cas, donc pas de redirection ;
// class.html se charge lui-même de restreindre l'UI en mode invité.
(function protegerPage() {
  if (!window.location.pathname.includes("/pages/")) return;
  if (getCurrentUser()) return;
  if (new URLSearchParams(window.location.search).has("gclasse")) return;
  window.location.replace("../index.html");
})();

function setCurrentUser(user, resterConnecte) {
  try {
    // On ne persiste jamais le mot de passe (M2p) dans le navigateur :
    // il n'a servi qu'à la vérification côté client au moment de la
    // connexion (voir onSubmitLoginPassword sur index.html) et n'est
    // plus utile ensuite. Seule une copie assainie de l'utilisateur
    // est stockée dans localStorage/sessionStorage.
    const { M2p, ...userSansMotDePasse } = user;
    const valeur = JSON.stringify(userSansMotDePasse);
    if (resterConnecte) {
      localStorage.setItem(URS_SESSION_KEY, valeur);
      sessionStorage.removeItem(URS_SESSION_KEY);
    } else {
      sessionStorage.setItem(URS_SESSION_KEY, valeur);
      localStorage.removeItem(URS_SESSION_KEY);
    }
  } catch (err) {
    // Stockage indisponible (navigation privée...) : session non persistée.
  }
}

function clearCurrentUser() {
  try {
    localStorage.removeItem(URS_SESSION_KEY);
    sessionStorage.removeItem(URS_SESSION_KEY);
  } catch (err) {
    // ignore
  }
}

// Déconnexion utilisable depuis n'importe quelle page de /pages/ (qui n'ont
// pas de modale de connexion) : efface la session puis renvoie vers
// index.html, qui rouvre automatiquement la modale (voir mettreAJourEtatConnexion
// + ouvrirModaleConnexion au chargement de index.html).
function seDeconnecterEtRediriger() {
  clearCurrentUser();
  const dansPages = window.location.pathname.includes("/pages/");
  window.location.href = dansPages ? "../index.html" : "index.html";
}

// Insère et connecte un bouton de déconnexion (icône) à côté d'un badge
// utilisateur existant. À appeler après renderUserBadge(badgeEl) :
//   renderUserBadge(document.getElementById("sidebar_user_badge"));
//   injecterBoutonDeconnexion(document.getElementById("sidebar_user_badge"));
function injecterBoutonDeconnexion(badgeEl, options) {
  if (!badgeEl || !getCurrentUser()) return;
  const opts = options || {};
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = opts.className || "btn_logout_mini";
  bouton.title = "Se déconnecter";
  bouton.innerHTML = '<i class="bi bi-box-arrow-right"></i>';
  bouton.addEventListener("click", (e) => {
    e.stopPropagation();
    seDeconnecterEtRediriger();
  });
  badgeEl.insertAdjacentElement("afterend", bouton);
}

// Auto-connexion du bouton de déconnexion de navbar (#navbar_btn_logout),
// présent sur les pages sans sidebar (prosp, fi, bilan, class) : pas besoin
// de câblage supplémentaire par page, il suffit d'ajouter le bouton au HTML.
document.addEventListener("DOMContentLoaded", () => {
  const boutonNavbar = document.getElementById("navbar_btn_logout");
  if (!boutonNavbar) return;
  boutonNavbar.hidden = !getCurrentUser();
  boutonNavbar.addEventListener("click", () => seDeconnecterEtRediriger());
});

function initialesUtilisateur(user) {
  if (!user) return "?";
  if (user.Initiales) return user.Initiales;
  if (user.Nom) {
    return user.Nom.trim().split(/\s+/).map((mot) => mot[0]).join("").toUpperCase().slice(0, 2);
  }
  return "?";
}

// Peuple un badge rond (ex: <span class="user_badge">) avec les initiales
// de l'utilisateur courant, et un titre (Nom) au survol.
function renderUserBadge(el) {
  if (!el) return;
  const user = getCurrentUser();
  el.textContent = initialesUtilisateur(user);
  el.title = user ? (user.Nom || "") : "Non connecté";
}