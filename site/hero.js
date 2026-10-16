// The hero's motion: the Detector bobs, blinks, waves now and then, and its
// ink lines boil. All of it is CSS (styles.css, .hero-scene.is-animated);
// this script switches it on, shows the pause control, and pauses the motion
// while the room is off screen. Nothing moves without it, and nothing moves
// under prefers-reduced-motion (the control then stays hidden).
(function () {
  var scene = document.getElementById("hero-scene");
  var toggle = document.getElementById("motion-toggle");
  if (!scene || !toggle) return;
  var label = toggle.querySelector(".motion-label");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var paused = false;

  function apply() {
    var moving = !reduce.matches;
    scene.classList.toggle("is-animated", moving);
    scene.classList.toggle("is-paused", paused);
    toggle.hidden = !moving;
    label.textContent = paused ? "Play" : "Pause";
  }

  toggle.addEventListener("click", function () {
    paused = !paused;
    apply();
  });
  if (reduce.addEventListener) reduce.addEventListener("change", apply);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      scene.classList.toggle("is-offscreen", !entries[0].isIntersecting);
    }).observe(scene);
  }
  apply();
})();
