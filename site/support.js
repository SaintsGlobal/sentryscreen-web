// The support address on /support/ (2026-09-27): no mailto link, and
// the address is not in the page as one string. The page spells it out in
// words for readers without script; with script, "Show email address"
// assembles it here, as plain text a reader can select and copy.
(function () {
  var button = document.getElementById("show-email");
  var out = document.getElementById("support-email");
  if (!button || !out) return;
  button.addEventListener("click", function () {
    out.textContent = ["support", "sentry-screen.com"].join("@");
    out.hidden = false;
    button.hidden = true;
    out.focus();
  });
})();
