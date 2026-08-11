/* ============================================================
   STICKY_METIERS.JS
   Mesure en continu la hauteur du bandeau .btns_metiers (collé en haut
   de <main>, voir layout.css) pour que les .block_metiers_header,
   également collés au défilement, se placent juste en dessous au lieu
   de passer dessous. Utilisé par class.html, fi.html et bilan.html.
   (Remplace l'ancien mécanisme par-page basé sur .fi_dossier, retiré
   du HTML lors de l'unification de .btns_metiers/.infos_metiers dans
   layout.css.)
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

  document.addEventListener("DOMContentLoaded", wireStickyMetiersHeight);
})();
