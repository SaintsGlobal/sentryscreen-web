// The paper room / night room switch (DESIGN.md "The two rooms").
//
// Loaded without defer at the top of every page's <head>, before the
// stylesheet, so a reader's saved choice is on <html> before the first paint
// and the page never flashes the other room. Without this script the page
// follows the system setting (styles.css), and the toggle stays hidden.
//
// The choice is kept in localStorage under "sentry-theme" ("light" or
// "dark"). Storage can be missing or throw (private windows, blocked site
// data); then the choice lasts for this page only.
(function (global) {
  var KEY = "sentry-theme";
  var COLOR = { light: "#f0e2c4", dark: "#2a1f18" }; // --wall, design/theme.mjs

  function read(storage) {
    try {
      var v = storage && storage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function write(storage, value) {
    try {
      if (storage) storage.setItem(KEY, value);
    } catch (e) {
      /* the choice still applies to this page */
    }
  }

  // The room the page shows now: the saved choice, else the system's.
  function current(doc, media) {
    var chosen = doc.documentElement.getAttribute("data-theme");
    if (chosen === "light" || chosen === "dark") return chosen;
    return media && media.matches ? "dark" : "light";
  }

  function apply(doc, theme) {
    var root = doc.documentElement;
    if (theme) root.setAttribute("data-theme", theme);
    var metas = doc.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      if (theme) metas[i].setAttribute("content", COLOR[theme]);
    }
  }

  // Every .theme-toggle is a real button: "Dark mode", pressed when the page
  // shows the night room.
  function sync(doc, media) {
    var on = current(doc, media) === "dark";
    var buttons = doc.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
  }

  function wire(doc, storage, media) {
    var chosen = doc.documentElement.getAttribute("data-theme");
    if (chosen) apply(doc, chosen); // theme-color metas parsed after start()
    var buttons = doc.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = current(doc, media) === "dark" ? "light" : "dark";
        apply(doc, next);
        write(storage, next);
        sync(doc, media);
      });
    }
    sync(doc, media);
    if (media && media.addEventListener) media.addEventListener("change", function () { sync(doc, media); });
  }

  // Runs in <head>: mark script on (styles.css shows the toggles), apply the
  // saved choice, then wire the buttons once the body exists.
  function start(doc, storage, media) {
    doc.documentElement.classList.add("has-js");
    var saved = read(storage);
    if (saved) apply(doc, saved);
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", function () { wire(doc, storage, media); });
    } else {
      wire(doc, storage, media);
    }
  }

  var api = { KEY: KEY, COLOR: COLOR, read: read, write: write, current: current, apply: apply, sync: sync, wire: wire, start: start };
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else if (global.document) {
    var storage = null;
    try {
      storage = global.localStorage;
    } catch (e) {
      storage = null;
    }
    var media = global.matchMedia ? global.matchMedia("(prefers-color-scheme: dark)") : null;
    start(global.document, storage, media);
  }
})(typeof window !== "undefined" ? window : globalThis);
