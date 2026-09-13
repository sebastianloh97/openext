/*
 * Shared behaviors: theme toggle only. TODO(project): extend with the product's
 * shared interactions (popovers, accordions, tabs), keeping this file the
 * single shared script every page links.
 */
(() => {
  const KEY = "design-theme"; // TODO(project): "<slug>-theme"

  const apply = (light) => document.body.classList.toggle("light-theme", light);

  const stored = localStorage.getItem(KEY);
  if (stored === "light") apply(true);
  if (stored === "dark") apply(false);

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-theme-toggle]");
    if (!trigger) return;
    const light = !document.body.classList.contains("light-theme");
    apply(light);
    localStorage.setItem(KEY, light ? "light" : "dark");
  });
})();
