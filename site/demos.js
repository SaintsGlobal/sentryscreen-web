// Start each "What it does" loop only while it is on screen, and reset it
// when it leaves, so a visitor always sees a loop from its first frame.
// styles.css: `.js .demo:not(.is-live) *` turns the animations off.
// Threshold 0.35: a desk starts once about a third of it is visible, so it
// does not fire while only its top edge peeks in under the fold.
// After CYCLES_MS on screen a desk is marked .is-done and stops on its
// covered frame for good (WCAG 2.2.2). 24 s = two of the 12 s loops in
// styles.css (@keyframes demo-*); keep the two in step.
(function () {
  var CYCLES_MS = 24000;
  var desks = document.querySelectorAll(".demo");
  if (!desks.length || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  var timers = new Map();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var desk = e.target;
      desk.classList.toggle("is-live", e.isIntersecting);
      clearTimeout(timers.get(desk));
      if (!e.isIntersecting) return;
      timers.set(desk, setTimeout(function () {
        desk.classList.add("is-done");
        io.unobserve(desk);
      }, CYCLES_MS));
    });
  }, { threshold: 0.35 });
  desks.forEach(function (d) { io.observe(d); });
})();
