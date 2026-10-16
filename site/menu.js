// The header's Menu is a native <details>, so it opens and closes without
// script. This only adds what <details> lacks: it closes after a link in it
// is followed, on Escape (focus returns to the Menu button), and on a click
// outside it.
(function () {
  var menu = document.querySelector("details.nav-menu");
  if (!menu) return;
  var summary = menu.querySelector("summary");
  menu.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".nav-panel a")) menu.open = false;
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.open) {
      menu.open = false;
      if (summary) summary.focus();
    }
  });
  document.addEventListener("click", function (e) {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
})();
