/* ============================================================
   SIDEBAR_MENU.JS
   Menu latéral unique, généré à partir d'une seule liste de modules
   (plus de menu recopié en dur dans chaque page).

   Utilisation : dans chaque page module, juste après l'ouverture de la nav :
     <nav class="sidebar_nav" data-page="dti">
       <script src="js/sidebar_menu.js"></script>
     </nav>
   (script synchrone => menu présent avant les initSectionToggle() des pages)

   Comportement :
   - Toutes les pages sont listées, dans le même ordre sur chaque page ;
     la page en cours est mise en évidence.
   - Les sections de la page en cours sont affichées sous son lien ;
     celles des AUTRES pages sont repliées.
   - Survol (ou focus clavier) d'un lien de page => ses sections s'affichent
     dans un volet à droite du menu (desktop) ou sous le lien (mobile, via
     le chevron).
   - Clic sur le lien d'une page => page ouverte sur sa section par défaut.
     Clic sur une section => page ouverte directement sur cette section.
   - Droits (js/permissions.js, onglet "users") : un module sans droit n'a
     aucun lien dans le menu ; pour « Promotion professionnelle », seules les
     sections autorisées (pp.Compagne / Demandes / Dossiers / Inscrits /
     Classes) sont listées et la section par défaut est la 1re autorisée.
   - Pour la page en cours, les liens de section gardent href="#id" avec la
     classe .sidebar_section_link : les initSectionToggle() existants de
     chaque page continuent de fonctionner (changement de section sans
     rechargement + classe .is_active).
   ============================================================ */
(function () {
  // Ordre d'affichage = ordre de ce tableau. `def` = section affichée par défaut
  // (doit correspondre à la section initiale de la page).
  const MODULES = [
    { page: "ci", href: "ci.html", icon: "bi-percent", label: "Crédit d'impôt", def: "tdb",
      sections: [["tdb", "Tableau de bord"], ["bilans_siliana", "Bilans Siliana"], ["bilans_tunis", "Bilans Tunis"]] },
    { page: "dti", href: "dti.html", icon: "bi-building", label: "Droits de tirage individuels", def: "formation_initiale",
      sections: [["formation_initiale", "Formation initiale"], ["plans", "Plans"], ["commission", "Commissions"]] },
    { page: "dtc", href: "dtc.html", icon: "bi-buildings", label: "Droits de tirage collectifs", def: "commissions",
      sections: [["commissions", "Commissions"], ["consultations", "Consultations"], ["plans", "Plans"]] },
    { page: "pp", href: "pp.html", icon: "bi-mortarboard", label: "Promotion professionnelle", def: "demandes",
      sections: [["campagne", "Campagne"], ["demandes", "Demandes"], ["dossiers", "Dossiers"], ["inscrits", "Inscrits"], ["classes", "Classes"]] },
    { page: "part", href: "part.html", icon: "bi-diagram-3", label: "Partenaires", def: "entreprises",
      sections: [["entreprises", "Entreprises"], ["cabinets_formation", "Cabinets de formation"], ["organismes", "Organismes"], ["partenaires_pp", "Partenaires PP"]] },
    { page: "docs", href: "docs.html", icon: "bi-file-earmark-text", label: "Documents", def: "notes",
      sections: [["convpp", "Convention PP"], ["notes", "Notes de service"], ["manuels", "Manuels de procédures"]] },
  ];

  const nav = document.currentScript && document.currentScript.parentElement;
  if (!nav) return;
  const current = nav.dataset.page || "";
  const DESKTOP = window.matchMedia("(min-width: 1081px)");

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Droits d'accès (permissions.js chargé avant ce script ; s'il manque, tout s'affiche).
  const P = window.URSPerm;
  const visibles = P
    ? MODULES.filter((m) => P.moduleVisible(m.page)).map((m) => {
        const sections = m.sections.filter(([id]) => P.sectionVisible(m.page, id));
        return { ...m, sections, def: P.sectionParDefaut(m.page, m.def) };
      })
    : MODULES;

  const groups = visibles.map((m) => {
    const isCur = m.page === current;
    const subs = m.sections.map(([id, label]) => {
      const href = isCur ? `#${id}` : `${m.href}#${id}`;
      const active = isCur && id === m.def ? " is_active" : "";
      return `<a class="sidebar_section_link${active}" href="${esc(href)}">${esc(label)}</a>`;
    }).join("");
    return `
      <div class="sidebar_group${isCur ? " is_current" : ""}" data-page="${m.page}">
        <div class="sidebar_group_head">
          <a class="sidebar_module_link" href="${m.href}" data-default="${m.def}"${isCur ? ' aria-current="page"' : ""}>
            <i class="bi ${m.icon}"></i><span>${esc(m.label)}</span>
          </a>
          <button type="button" class="sidebar_group_toggle" aria-expanded="false"
                  aria-label="Afficher les sections de ${esc(m.label)}">
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
        <div class="sidebar_sub" role="group" aria-label="Sections de ${esc(m.label)}">${subs}</div>
      </div>`;
  }).join("");

  nav.insertAdjacentHTML("afterbegin", `
    <a class="sidebar_module_link sidebar_home_link" href="index.html"><i class="bi bi-house"></i><span>Accueil</span></a>
    <div class="sidebar_divider"></div>
    ${groups}`);

  /* ---- Page en cours : clic sur son lien => section par défaut, sans rechargement ---- */
  const curGroup = nav.querySelector(".sidebar_group.is_current");
  if (curGroup) {
    const head = curGroup.querySelector(".sidebar_module_link");
    head.addEventListener("click", (e) => {
      e.preventDefault();
      const target = curGroup.querySelector(`.sidebar_section_link[href="#${head.dataset.default}"]`);
      if (target) target.click(); // passe par le initSectionToggle() de la page
    });
  }

  /* ---- Desktop : volet de sections positionné à droite du menu ---- */
  function placeFlyout(group) {
    if (!DESKTOP.matches || group.classList.contains("is_current")) return;
    const sub = group.querySelector(".sidebar_sub");
    const aside = nav.closest(".sidebar") || nav;
    const headRect = group.querySelector(".sidebar_group_head").getBoundingClientRect();
    sub.style.left = aside.getBoundingClientRect().right + "px";
    sub.style.top = headRect.top + "px";
    // Recaler dans la fenêtre si le volet déborde en bas.
    const h = sub.offsetHeight || 0;
    const maxTop = window.innerHeight - h - 8;
    sub.style.top = Math.max(8, Math.min(headRect.top, maxTop)) + "px";
  }
  nav.querySelectorAll(".sidebar_group").forEach((g) => {
    g.addEventListener("mouseenter", () => placeFlyout(g));
    g.addEventListener("focusin", () => placeFlyout(g));
  });
  // Le menu défile : le volet ouvert suit le lien au scroll (évite un volet décalé).
  nav.closest(".sidebar")?.addEventListener("scroll", () => {
    const open = nav.querySelector(".sidebar_group:not(.is_current):hover, .sidebar_group:not(.is_current):focus-within");
    if (open) placeFlyout(open);
  }, { passive: true });

  /* ---- Mobile / tactile : chevron => déplie les sections sous le lien ---- */
  nav.querySelectorAll(".sidebar_group_toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".sidebar_group");
      const open = !group.classList.contains("is_expanded");
      nav.querySelectorAll(".sidebar_group.is_expanded").forEach((g) => {
        g.classList.remove("is_expanded");
        g.querySelector(".sidebar_group_toggle").setAttribute("aria-expanded", "false");
      });
      group.classList.toggle("is_expanded", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
})();
