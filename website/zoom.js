/* ============================================================
   PlantEcho 官网 · 截图缩放预览逻辑 (zoom.js)
   ============================================================ */
(function (global) {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function setupImageZoom() {
    const modal = document.createElement("div");
    modal.className = "img-zoom-modal";
    modal.innerHTML = '<div class="img-zoom-wrap"><img src="" alt="Zoomed screenshot" /><span class="img-zoom-close">&times;</span></div>';
    document.body.appendChild(modal);

    modal.addEventListener("click", () => {
      if (typeof gsap !== "undefined" && !reduce) {
        gsap.to(modal, { opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.inOut", onComplete: () => { modal.style.display = "none"; } });
      } else { modal.style.display = "none"; }
    });

    $$(".shot img").forEach((img) => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.querySelector("img").src = img.src;
        modal.style.display = "flex";
        if (typeof gsap !== "undefined" && !reduce) {
          gsap.fromTo(modal, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" });
        }
      });
    });
  }

  global.setupImageZoom = setupImageZoom;
})(window);
