/* ============================================================
   NAVBAR_BREADCRUMB.JS
   Sur mobile (<1080px), le fil d'ariane texte (.navbar_breadcrumb)
   est masqué (voir navbar.css) et remplacé par une icône. Un clic
   sur cette icône affiche son contenu dans une pop-in ancrée en
   haut à droite de l'écran. Inclus sur toutes les pages qui ont
   un .navbar_breadcrumb (dti, cdi, part, fi...).
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const breadcrumb = document.querySelector(".navbar_breadcrumb");
  if (!breadcrumb) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "navbar_breadcrumb_toggle";
  toggle.setAttribute("aria-label", "Afficher le fil d'ariane");
  toggle.innerHTML = '<i class="bi bi-signpost-split"></i>';

  const popover = document.createElement("div");
  popover.className = "navbar_breadcrumb_popover";
  popover.innerHTML = breadcrumb.innerHTML;
  popover.hidden = true;

  breadcrumb.insertAdjacentElement("beforebegin", toggle);
  document.body.appendChild(popover);

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.hidden = !popover.hidden;
  });

  document.addEventListener("click", (e) => {
    if (!popover.hidden && !popover.contains(e.target) && e.target !== toggle) {
      popover.hidden = true;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") popover.hidden = true;
  });
});
