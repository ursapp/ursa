/* ============================================================
   SIDEBAR_TOGGLE.JS
   Sidebar écrite en dur dans chaque page module.
   Ce script gère uniquement : ouverture/fermeture mobile
   + surlignage de la section visible au scroll (optionnel).
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("sidebar_root");
  if (!root) return;

  root.querySelectorAll(".sidebar_section_link").forEach((link) => {
    link.addEventListener("click", closeMobileSidebar);
  });

  root.querySelector(".sidebar_close_btn")?.addEventListener("click", closeMobileSidebar);
  document.querySelector(".hamburger_btn")?.addEventListener("click", openMobileSidebar);
  document.getElementById("sidebar_overlay")?.addEventListener("click", closeMobileSidebar);

  // En mode "toggle" (ex: dti.html), la page gère elle-même l'affichage
  // section par section et l'état actif des liens — pas de scroll-spy ici.
  if (document.body.dataset.navMode !== "toggle") {
    highlightActiveSectionOnScroll(root);
  }
});

function openMobileSidebar() {
  document.getElementById("sidebar_root")?.classList.add("is_open");
  document.getElementById("sidebar_overlay")?.classList.add("is_visible");
  document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
  document.getElementById("sidebar_root")?.classList.remove("is_open");
  document.getElementById("sidebar_overlay")?.classList.remove("is_visible");
  document.body.style.overflow = "";
}

// Marque .is_active sur le lien de section correspondant à la section
// actuellement visible à l'écran (simple observation de scroll).
function highlightActiveSectionOnScroll(root) {
  const links = root.querySelectorAll(".sidebar_section_link[href^='#']");
  if (!links.length) return;

  const sections = Array.from(links)
    .map((l) => document.getElementById(l.getAttribute("href").slice(1)))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove("is_active"));
        root.querySelector(`.sidebar_section_link[href="#${entry.target.id}"]`)
          ?.classList.add("is_active");
      });
    },
    { rootMargin: "-40% 0px -50% 0px" }
  );

  sections.forEach((s) => observer.observe(s));
}
