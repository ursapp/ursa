/* ============================================================
   SPINNER.JS — unique point d'entrée des spinners (style : css/spinner.css).
   Spinner.html()          balisage d'un spinner centré (à insérer dans un innerHTML)
   Spinner.tableRow(n)     ligne de tableau (colspan n) avec spinner centré
   Spinner.show(el)/hide(el)  spinner au milieu d'un conteneur (.is_loading)
   Spinner.navbar(visible) spinner de la navbar (#navbar_loading)
   setBtnSaving(btn, saving, label)  bouton "Enregistrer..." (spinner + désactivation)
   ============================================================ */
const Spinner = {
  html(extraClass = "") {
    const cls = extraClass ? `spinner ${extraClass}` : "spinner";
    return `<span class="${cls}" role="status" aria-label="Chargement"></span>`;
  },
  tableRow(colspan) {
    return `<tr class="table_state_row"><td colspan="${colspan}">${Spinner.html()}</td></tr>`;
  },
  show(el) {
    if (!el) return;
    el.classList.add("is_loading");
    el.setAttribute("aria-busy", "true");
  },
  hide(el) {
    if (!el) return;
    el.classList.remove("is_loading");
    el.removeAttribute("aria-busy");
  },
  navbar(visible) {
    const el = document.getElementById("navbar_loading");
    if (el) el.hidden = !visible;
  }
};

function setBtnSaving(btn, saving, savingLabel = "Enregistrement...") {
  if (!btn) return;
  if (saving) {
    if (btn.dataset.originalHtml === undefined) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner spinner_inline"></span> ${savingLabel}`;
    btn.classList.add("btn_saving");
    btn.disabled = true;
  } else {
    if (btn.dataset.originalHtml !== undefined) btn.innerHTML = btn.dataset.originalHtml;
    btn.classList.remove("btn_saving");
    btn.disabled = false;
  }
}
