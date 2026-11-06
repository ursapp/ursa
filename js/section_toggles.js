/* ============================================================
   SECTION_TOGGLES.JS
   Comportement unifié des sections repliables à chevron
   (.block_metiers_accordion, sous-ensemble de .block_metiers — voir
   layout.css) : bilan.html (5 sections), fi.html (Apprentissage /
   Alternance / Stages), class.html (Plan d'étude / Répartition
   tutorat / Regroupements), pfe.html (Encadrements / Soutenances),
   plan.html (Actions / Réalisation / Facturation).

   Règles communes à toutes ces sections :
   - Repliées par défaut au chargement (.is_collapsed déjà présent
     dans le HTML de départ, voir chaque page).
   - Un clic sur le chevron (.section_toggle_btn) d'une section
     repliée déplie CETTE section et replie toutes les autres
     sections du même groupe .block_metiers_accordion — au plus une
     section dépliée à la fois par page/groupe.
   - Un clic sur le chevron d'une section dépliée la replie
     simplement (les autres restent repliées).
   - Le header de la section dépliée (.block_metiers_header) et
     l'en-tête de son tableau restent sticky en haut au défilement
     (voir layout.css / js/sticky_metiers.js) ; aucune section ne
     scrolle en interne, tout le scroll reste au niveau de la page.
   - Aucun scroll automatique au dépli ni au repli : les sections
     étant repliées par défaut, l'entête cliqué est déjà visible à
     l'écran (au pire sous la navbar/.btns_metiers/.infos_metiers,
     eux-mêmes sticky) ; un scroll programmatique y ajouterait un
     déplacement de page non désiré. Ne pas réintroduire de
     scrollIntoView() ici (cf. l'historique de ce fichier) — les
     boutons hors accordéon qui ouvrent un panneau depuis un point
     éloigné (ex: depuis une modale) gèrent leur propre scroll au cas
     par cas (voir ouvrirSection() dans pfe.html, class.html).

   Les boutons d'entête AUTRES que le chevron (ex: "Ajouter",
   "Editer"...) restent gérés au cas par cas par chaque page (leurs
   comportements diffèrent trop d'une page à l'autre pour être
   unifiés ici) ; ils peuvent réutiliser collapseMetierSection /
   expandMetierSection / collapseOtherMetierSections, exposées
   globalement ci-dessous, pour rester cohérents avec ce module —
   en particulier, tout code qui déplie une section par ce biais doit
   aussi replier les autres du même groupe pour préserver l'invariant
   "une seule section dépliée à la fois" (voir unhideSection() dans
   class.html/pfe.html, wireMetierHeaderCapture() dans plan.html).
   ============================================================ */
(function () {
  function collapseMetierSection(section) {
    if (!section) return;
    section.classList.add("is_collapsed");
    const btn = section.querySelector(".section_toggle_btn");
    if (btn) {
      btn.innerHTML = `<i class="bi bi-chevron-down"></i>`;
      btn.title = "Développer la section";
      btn.setAttribute("aria-label", btn.title);
    }
  }

  function expandMetierSection(section) {
    if (!section) return;
    section.classList.remove("is_collapsed");
    const btn = section.querySelector(".section_toggle_btn");
    if (btn) {
      btn.innerHTML = `<i class="bi bi-chevron-up"></i>`;
      btn.title = "Réduire la section";
      btn.setAttribute("aria-label", btn.title);
    }
  }

  // Replie toutes les sections .block_metiers_accordion de la page (ou
  // d'un conteneur donné) sauf celle passée en argument — pour ne
  // garder qu'une section dépliée à la fois dans le groupe. Passer
  // null comme exceptSection replie tout le groupe (retour à l'état
  // par défaut de la page).
  function collapseOtherMetierSections(exceptSection, scope) {
    const root = scope || document;
    root.querySelectorAll(".block_metiers_accordion").forEach((s) => {
      if (s !== exceptSection) collapseMetierSection(s);
    });
  }

  function wireMetierSectionToggles() {
    document.querySelectorAll(".block_metiers_accordion").forEach((section) => {
      const toggleBtn = section.querySelector(".section_toggle_btn");
      if (!toggleBtn) return;
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (section.classList.contains("is_collapsed")) {
          expandMetierSection(section);
          collapseOtherMetierSections(section);
        } else {
          collapseMetierSection(section);
        }
      });
    });
  }

  window.collapseMetierSection = collapseMetierSection;
  window.expandMetierSection = expandMetierSection;
  window.collapseOtherMetierSections = collapseOtherMetierSections;
  document.addEventListener("DOMContentLoaded", wireMetierSectionToggles);
})();
