/* ============================================================
   STICKY_METIERS.JS
   Mesure en continu la hauteur du bandeau .btns_metiers (collé en haut
   de <main>, voir layout.css) pour que les .block_metiers_header,
   également collés au défilement, se placent juste en dessous au lieu
   de passer dessous. Utilisé par class.html, fi.html, bilan.html,
   pfe.html et plan.html.
   (Remplace l'ancien mécanisme par-page basé sur .fi_dossier, retiré
   du HTML lors de l'unification de .btns_metiers/.infos_metiers dans
   layout.css.)
   Mesure aussi la hauteur de chaque .block_metiers_header pour les
   en-têtes de tableau sticky à l'intérieur (voir wireBlockHeaderHeights
   plus bas et .block_metiers .data_table thead th dans layout.css).
   ============================================================ */
(function () {
  function wireStickyMetiersHeight() {
    const btnsMetiers = document.querySelector(".btns_metiers");
    const infosMetiers = document.querySelector(".infos_metiers");
    if (!btnsMetiers || typeof ResizeObserver === "undefined") return;

    const majHauteur = () => {
      document.documentElement.style.setProperty("--btns-metiers-height", `${btnsMetiers.offsetHeight}px`);
      const infosHeight = infosMetiers && !infosMetiers.hasAttribute("hidden") ? infosMetiers.offsetHeight : 0;
      document.documentElement.style.setProperty("--infos-metiers-height", `${infosHeight}px`);
    };

    const observer = new ResizeObserver(majHauteur);
    observer.observe(btnsMetiers);
    if (infosMetiers) observer.observe(infosMetiers);
    majHauteur();
  }

  // Mesure la hauteur de chaque .block_metiers_header et la pose en style
  // inline sur son propre .block_metiers (--block-header-h), pour que les
  // en-têtes de tableau à l'intérieur (.block_metiers .data_table thead th,
  // sticky via layout.css) se placent juste en dessous. Une variable par
  // section (et non globale) : chaque tableau colle sous SA propre section,
  // quel que soit le nombre de boutons dans son entête. Remplace les
  // anciennes variables dupliquées par tableau (--inscrits-header-height,
  // --plan-header-height, --frais-header-height, --enseignants-header-height,
  // --compteurs-header-height).
  function wireBlockHeaderHeights() {
    const headers = document.querySelectorAll(".block_metiers > .block_metiers_header");
    if (!headers.length || typeof ResizeObserver === "undefined") return;

    headers.forEach((header) => {
      const section = header.parentElement;
      const majHauteur = () => {
        section.style.setProperty("--block-header-h", `${header.offsetHeight}px`);
      };
      const observer = new ResizeObserver(majHauteur);
      observer.observe(header);
      majHauteur();
    });
  }

  document.addEventListener("DOMContentLoaded", wireStickyMetiersHeight);
  document.addEventListener("DOMContentLoaded", wireBlockHeaderHeights);
})();
