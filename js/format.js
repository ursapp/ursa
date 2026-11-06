/* ============================================================
   FORMAT.JS
   Formatage commun des montants : virgule décimale + 3 chiffres
   après la virgule (convention "0,000" utilisée dans les bases
   Sheets — colonnes smig, budgets, montants agréés...).
   ============================================================ */

/**
 * Formate un nombre (ou une chaîne "1234.5" / "1234,5") en "1 234,500".
 * @param {number|string} valeur
 * @param {boolean} avecDevise  Ajoute " TND" si true (par défaut).
 * @returns {string} "----" si la valeur n'est pas numérique.
 */
function formatMontant(valeur, avecDevise = true) {
  if (valeur === null || valeur === undefined || valeur === "") return "----";
  const n = Number(String(valeur).trim().replace(",", "."));
  if (Number.isNaN(n)) return "----";
  const texte = n.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return avecDevise ? `${texte} TND` : texte;
}
