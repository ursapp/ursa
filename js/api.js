/* ============================================================
   API.JS
   Client générique pour parler au Web App Apps Script.
   Astuce CORS : Content-Type "text/plain" en POST => pas de
   preflight OPTIONS (que Apps Script ne sait pas gérer nativement).
   ============================================================ */

async function apiCall(action, payload = {}) {
  const res = await fetch(GAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });

  if (!res.ok) throw new Error(`Erreur réseau (${res.status})`);

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erreur backend inconnue");
  return data.result;
}

// Raccourcis CRUD génériques : sheetName = nom de l'onglet Google Sheets
const api = {
  list: (sheetName) => apiCall("list", { sheet: sheetName }),
  create: (sheetName, record) => apiCall("create", { sheet: sheetName, record }),
  update: (sheetName, id, record) => apiCall("update", { sheet: sheetName, id, record }),
  remove: (sheetName, id) => apiCall("delete", { sheet: sheetName, id })
};
