/* ============================================================
   MODAL_FORMS.JS
   Système générique de modales de fiche (Entreprise, Cabinet,
   Bilan, etc.), partagé par toutes les pages module.

   Structure HTML attendue :
     <div class="modal_overlay" id="xxx_modal">
       <div class="modal_dialog">
         <div class="modal_header">
           <h3>Titre</h3>
           <button type="button" class="modal_close" data-modal-close>…</button>
         </div>
         <div class="modal_body">
           <form id="xxx_form">…</form>
         </div>
       </div>
     </div>

   Comportement :
   - openFormModal(overlayId[, formId]) : mémorise un instantané du
     formulaire (FormData sérialisée), puis affiche la modale.
     Appeler APRÈS avoir rempli les champs (reset + pré-remplissage).
   - closeFormModal(overlayId) : ferme directement, sans confirmation
     (à utiliser après un enregistrement/suppression réussi).
   - attemptCloseFormModal(overlayId[, formId]) : compare l'état
     courant du formulaire à l'instantané ; si différent, demande
     confirmation avant de fermer. C'est cette fonction qu'il faut
     brancher sur "Annuler", la croix, et tout ce qui doit respecter
     la présence de modifications non enregistrées.
   - Le câblage de la croix (data-modal-close), du clic en dehors de
     la boîte (sur le fond assombri) et de la touche Échap est fait
     automatiquement pour toute .modal_overlay présente au chargement
     de la page — aucun code supplémentaire nécessaire pour ça.
   ============================================================ */

const formModalSnapshots = {}; // overlayId -> instantané sérialisé du formulaire

// Conteneur surveillé : le <form> s'il existe, sinon le .modal_body (pages
// dont les champs ne sont pas dans un <form> : ci, dtc, dti).
function serializeForm(root) {
  if (!root) return "";
  const entries = [];
  if (root.tagName === "FORM") {
    new FormData(root).forEach((value, key) => entries.push(`${key}=${value}`));
  } else {
    root.querySelectorAll("input, select, textarea").forEach((el, i) => {
      if (el.type === "button" || el.type === "submit" || el.hasAttribute("data-no-dirty")) return;
      const key = el.name || el.id || `#${i}`;
      const val = el.type === "checkbox" || el.type === "radio" ? (el.checked ? "1" : "0") : el.value;
      entries.push(`${key}=${val}`);
    });
  }
  return entries.sort().join("&");
}

// État supplémentaire (hors champs HTML) pour les modales pilotées par un
// brouillon JS : registerModalState(overlayId, () => JSON.stringify(brouillon)).
const modalExtraState = {};
function registerModalState(overlayId, getter) { modalExtraState[overlayId] = getter; }

// <div class="modal_overlay" data-no-dirty> : modale de simple consultation ou
// de choix (aucune alerte ni confirmation à la fermeture).
function serializeModal(overlayId, formId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay || overlay.hasAttribute("data-no-dirty")) return "";
  const extra = modalExtraState[overlayId] ? modalExtraState[overlayId]() : "";
  return serializeForm(resolveModalForm(overlayId, formId)) + "|" + extra;
}

function findModalForm(overlay) {
  return overlay ? (overlay.querySelector("form") || overlay.querySelector(".modal_body")) : null;
}

function resolveModalForm(overlayId, formId) {
  if (formId) return document.getElementById(formId);
  return findModalForm(document.getElementById(overlayId));
}

// Alerte "Données à enregistrer" dans le .modal_header, affichée dès que le
// formulaire diffère de l'instantané pris à l'ouverture.
function getModalAlert(overlay) {
  const header = overlay?.querySelector(".modal_header");
  if (!header) return null;
  let el = header.querySelector(".modal_alert");
  if (!el) {
    el = document.createElement("span");
    el.className = "modal_alert";
    el.hidden = true;
    el.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Données à enregistrer !';
    // .modal_close n'est pas toujours un enfant direct du .modal_header (ex. dans
    // .modal_header_actions) : on insère dans son vrai parent, sinon insertBefore
    // lève NotFoundError et la modale ne s'ouvre jamais.
    const ref = header.querySelector(".modal_close");
    (ref ? ref.parentNode : header).insertBefore(el, ref || null);
  }
  return el;
}

function refreshModalAlert(overlayId, formId) {
  const overlay = document.getElementById(overlayId);
  const el = getModalAlert(overlay);
  if (!el) return;
  const dirty = overlayId in formModalSnapshots &&
    serializeModal(overlayId, formId) !== formModalSnapshots[overlayId];
  el.hidden = !dirty;
}

function openFormModal(overlayId, formId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  formModalSnapshots[overlayId] = serializeModal(overlayId, formId);
  const alertEl = getModalAlert(overlay);
  if (alertEl) alertEl.hidden = true;
  overlay.classList.add("is_visible");
}

function closeFormModal(overlayId) {
  document.getElementById(overlayId)?.classList.remove("is_visible");
  delete formModalSnapshots[overlayId];
}

function attemptCloseFormModal(overlayId, formId) {
  const hasSnapshot = overlayId in formModalSnapshots;
  const isDirty = hasSnapshot && serializeModal(overlayId, formId) !== formModalSnapshots[overlayId];
  if (isDirty && !confirm("Des modifications non enregistrées seront perdues. Fermer quand même ?")) {
    return;
  }
  closeFormModal(overlayId);
}

function wireFormModals() {
  document.querySelectorAll(".modal_overlay").forEach((overlay) => {
    const formId = findModalForm(overlay)?.id || null;

    // Un clic en dehors de la boîte (sur le fond assombri) tente une
    // fermeture — donc passe par la même confirmation que la croix.
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) attemptCloseFormModal(overlay.id, formId);
    });

    ["input", "change"].forEach((evt) =>
      overlay.addEventListener(evt, () => refreshModalAlert(overlay.id, formId))
    );

    overlay.querySelectorAll("[data-modal-close], [data-close-modal]").forEach((btn) =>
      btn.addEventListener("click", () => attemptCloseFormModal(overlay.id, formId))
    );
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = document.querySelector(".modal_overlay.is_visible");
    if (open) attemptCloseFormModal(open.id, findModalForm(open)?.id || null);
  });
}

document.addEventListener("DOMContentLoaded", wireFormModals);
