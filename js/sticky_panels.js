/* ============================================================
   STICKY_PANELS.JS
   Mesure en continu la hauteur de chaque .panel_header (collé en haut
   de son .panel, voir layout.css) pour que les en-têtes de tableau
   (.panel .data_table thead th), également collés au défilement, se
   placent juste en dessous au lieu de passer dessous.
   Même principe que js/sticky_metiers.js (pages autonomes), décliné ici
   pour les pages à sidebar : ci.html, docs.html, dti.html, part.html,
   pp.html.
   ============================================================ */
(function () {
  function wireStickyPanelsHeight() {
    const headers = document.querySelectorAll(".panel > .panel_header");
    if (!headers.length || typeof ResizeObserver === "undefined") return;

    headers.forEach((header) => {
      const panel = header.parentElement;
      const majHauteur = () => {
        panel.style.setProperty("--panel-header-h", `${header.offsetHeight}px`);
      };
      const observer = new ResizeObserver(majHauteur);
      observer.observe(header);
      majHauteur();
    });
  }

  document.addEventListener("DOMContentLoaded", wireStickyPanelsHeight);
})();
