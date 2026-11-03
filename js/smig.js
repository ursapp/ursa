/* ============================================================
   SMIG SHARED LOGIC
   Comportement réutilisable pour la modale Smig sur l'accueil, FI et DTI.
   Attend des éléments du DOM avec ces IDs/attributs :
   - bouton  : ouvre la modale (ex. #fi_btn_smig_settings, #idx_btn_smig)
   - modale  : #fi_modal_smig / #dti_modal_smig (contient une table +
               un pied de modale avec les boutons ci-dessous)
   - table   : #fi_smig_table / #dti_smig_table
   - pied de modale (dans la modale) :
       [data-smig-copy]   bouton "Copier SMIG"  (affiché si ligne nouvelle)
       [data-smig-save]   bouton "Enregistrer"  (affiché si données modifiées)
       [data-smig-cancel] bouton "Annuler"      (toujours affiché)
   ============================================================ */

// État courant (par table) : valeurs d'origine chargées + s'agit-il d'une
// ligne "année courante" tout juste créée (pour Copier SMIG).
const smigStateShared = new Map();

function initSmigShared({
  buttonId,
  modalId,
  tableId,
  currentYear,
  apiCaller = apiCall,
  alerterSiVide = false
}) {
  const button = document.getElementById(buttonId);
  const modal = document.getElementById(modalId);
  const table = document.getElementById(tableId);

  if (!button || !modal || !table) return;

  button.addEventListener("click", () => ouvrirModalSmigShared(modal, table, currentYear, apiCaller));

  modal.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModalShared(modal));
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModalShared(modal);
  });

  wirePiedSmigShared(modal, table, currentYear, apiCaller, alerterSiVide ? button : null);

  if (alerterSiVide) {
    verifierSmigAnneeCouranteShared(button, currentYear, apiCaller);
  }
}

function ouvrirModalSmigShared(modal, table, currentYear, apiCaller) {
  if (!modal || !table) return;
  modal.classList.add("is_visible");
  chargerTableSmigShared(modal, table, currentYear, apiCaller);
}

async function chargerTableSmigShared(modal, table, currentYear, apiCaller) {
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr class="table_state_row"><td colspan="3"><span class="loading_state">Chargement...</span></td></tr>`;

  try {
    let rows = await apiCaller("listSmig", {});

    const existeDeja = rows.some((r) => String(r.annee) === String(currentYear));
    if (!existeDeja) {
      await apiCaller("saveSmig", { record: { annee: currentYear, smig40: "", smig48: "" } });
      rows = await apiCaller("listSmig", {});
    }

    const ligneCourante = rows.find((r) => String(r.annee) === String(currentYear));
    const ligneNouvelle = !ligneCourante
      || (!String(ligneCourante.smig40 || "").trim() && !String(ligneCourante.smig48 || "").trim());

    tbody.innerHTML = rows.map((r) => `
      <tr data-annee="${r.annee}">
        <td>${r.annee}</td>
        <td><input type="number" step="0.001" value="${r.smig40 || ""}" data-key="smig40" /></td>
        <td><input type="number" step="0.001" value="${r.smig48 || ""}" data-key="smig48" /></td>
      </tr>`).join("") || `<tr><td colspan="3">Aucune donnée.</td></tr>`;

    const original = {};
    rows.forEach((r) => {
      original[r.annee] = { smig40: r.smig40 || "", smig48: r.smig48 || "" };
    });

    smigStateShared.set(table, { original, ligneNouvelle, currentYear });

    tbody.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("input", () => majPiedSmigShared(modal, table));
    });

    majPiedSmigShared(modal, table);
  } catch (err) {
    tbody.innerHTML = `<tr class="table_state_row"><td colspan="3"><span class="error_state">Erreur : ${err.message}</span></td></tr>`;
  }
}

/* ---------------- Pied de modale : Copier SMIG / Enregistrer / Annuler ---------------- */

function wirePiedSmigShared(modal, table, currentYear, apiCaller, boutonAlerte) {
  modal.querySelector("[data-smig-copy]")?.addEventListener("click", () => copierSmigAnneePrecedenteShared(modal, table));
  modal.querySelector("[data-smig-save]")?.addEventListener("click", () => enregistrerSmigShared(modal, table, currentYear, apiCaller, boutonAlerte));
  modal.querySelector("[data-smig-cancel]")?.addEventListener("click", () => closeModalShared(modal));
}

function tableSmigModifieeShared(table) {
  const state = smigStateShared.get(table);
  if (!state) return false;

  let modifie = false;
  table.querySelectorAll("tbody tr[data-annee]").forEach((tr) => {
    const orig = state.original[tr.dataset.annee] || { smig40: "", smig48: "" };
    tr.querySelectorAll("input[data-key]").forEach((input) => {
      if (String(input.value || "") !== String(orig[input.dataset.key] || "")) modifie = true;
    });
  });
  return modifie;
}

function majPiedSmigShared(modal, table) {
  const state = smigStateShared.get(table);
  if (!state) return;

  const btnCopier = modal.querySelector("[data-smig-copy]");
  const btnEnregistrer = modal.querySelector("[data-smig-save]");

  if (btnCopier) btnCopier.hidden = !state.ligneNouvelle;
  if (btnEnregistrer) btnEnregistrer.hidden = !tableSmigModifieeShared(table);
}

function copierSmigAnneePrecedenteShared(modal, table) {
  const state = smigStateShared.get(table);
  if (!state || !state.ligneNouvelle) return;

  const anneePrecedente = String(Number(state.currentYear) - 1);
  const precedent = state.original[anneePrecedente];
  if (!precedent) {
    alert("Aucune donnée trouvée pour l'année précédente.");
    return;
  }

  const tr = table.querySelector(`tbody tr[data-annee="${state.currentYear}"]`);
  if (!tr) return;

  const inputSmig40 = tr.querySelector('[data-key="smig40"]');
  const inputSmig48 = tr.querySelector('[data-key="smig48"]');
  if (inputSmig40) inputSmig40.value = precedent.smig40;
  if (inputSmig48) inputSmig48.value = precedent.smig48;

  majPiedSmigShared(modal, table);
}

async function enregistrerSmigShared(modal, table, currentYear, apiCaller, boutonAlerte) {
  const state = smigStateShared.get(table);
  if (!state) return;

  const lignesModifiees = [];
  table.querySelectorAll("tbody tr[data-annee]").forEach((tr) => {
    const annee = tr.dataset.annee;
    const orig = state.original[annee] || { smig40: "", smig48: "" };
    const record = { annee };
    let modifie = false;

    tr.querySelectorAll("input[data-key]").forEach((input) => {
      record[input.dataset.key] = input.value;
      if (String(input.value || "") !== String(orig[input.dataset.key] || "")) modifie = true;
    });

    if (modifie) lignesModifiees.push(record);
  });

  if (!lignesModifiees.length) return;

  const btnEnregistrer = modal.querySelector("[data-smig-save]");
  if (btnEnregistrer) btnEnregistrer.disabled = true;

  try {
    for (const record of lignesModifiees) {
      await apiCaller("saveSmig", { record });
    }
    await chargerTableSmigShared(modal, table, currentYear, apiCaller);
    if (boutonAlerte) verifierSmigAnneeCouranteShared(boutonAlerte, currentYear, apiCaller);
  } catch (err) {
    alert(`Erreur : ${err.message}`);
  } finally {
    if (btnEnregistrer) btnEnregistrer.disabled = false;
  }
}

/* ---------------- Bouton d'ouverture en alerte (données de l'année courante vides) ---------------- */

async function verifierSmigAnneeCouranteShared(button, currentYear, apiCaller) {
  if (!button) return;
  try {
    const rows = await apiCaller("listSmig", {});
    const ligne = rows.find((r) => String(r.annee) === String(currentYear));
    const vide = !ligne || (!String(ligne.smig40 || "").trim() && !String(ligne.smig48 || "").trim());
    button.classList.toggle("smig_btn_alerte", vide);
  } catch (err) {
    console.error("Vérification Smig de l'année courante impossible :", err.message);
  }
}

function closeModalShared(modal) {
  modal?.classList.remove("is_visible");
}
