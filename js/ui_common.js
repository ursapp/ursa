/* ============================================================
   UI_COMMON.JS
   setBtnSaving() : bascule un bouton en état "Enregistrement..."
   (spinner + libellé personnalisable + désactivation), et le restaure
   dans son état d'origine ensuite. Utilisé par tous les boutons
   "Enregistrer"/"Supprimer"/"Archiver"... des modales de fiche, sur
   toutes les pages (bilan.html, class.html, fi.html, pfe.html,
   plan.html) — remplace les 5 copies identiques auparavant dupliquées
   par page.
   ============================================================ */
function setBtnSaving(btn, saving, savingLabel = "Enregistrement...") {
  if (!btn) return;
  if (saving) {
    if (btn.dataset.originalHtml === undefined) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="btn_saving_spinner"></span> ${savingLabel}`;
    btn.classList.add("btn_saving");
    btn.disabled = true;
  } else {
    if (btn.dataset.originalHtml !== undefined) btn.innerHTML = btn.dataset.originalHtml;
    btn.classList.remove("btn_saving");
    btn.disabled = false;
  }
}
