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

function serializeForm(form) {
  if (!form) return "";
  const entries = [];
  new FormData(form).forEach((value, key) => entries.push(`${key}=${value}`));
  return entries.sort().join("&");
}

function findModalForm(overlay) {
  return overlay ? overlay.querySelector("form") : null;
}

function resolveModalForm(overlayId, formId) {
  if (formId) return document.getElementById(formId);
  return findModalForm(document.getElementById(overlayId));
}

function openFormModal(overlayId, formId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  formModalSnapshots[overlayId] = serializeForm(resolveModalForm(overlayId, formId));
  overlay.classList.add("is_visible");
}

function closeFormModal(overlayId) {
  document.getElementById(overlayId)?.classList.remove("is_visible");
  delete formModalSnapshots[overlayId];
}

function attemptCloseFormModal(overlayId, formId) {
  const hasSnapshot = overlayId in formModalSnapshots;
  const isDirty = hasSnapshot && serializeForm(resolveModalForm(overlayId, formId)) !== formModalSnapshots[overlayId];
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

    overlay.querySelector("[data-modal-close]")
      ?.addEventListener("click", () => attemptCloseFormModal(overlay.id, formId));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = document.querySelector(".modal_overlay.is_visible");
    if (open) attemptCloseFormModal(open.id, findModalForm(open)?.id || null);
  });
}

document.addEventListener("DOMContentLoaded", wireFormModals);
