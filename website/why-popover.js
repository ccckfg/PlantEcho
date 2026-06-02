/* ============================================================
   PlantEcho 官网 · Why 应籁浮层交互 (why-popover.js)
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activePopover = null;
  let listenersBound = false;

  function destroy() {
    const popover = document.querySelector(".why-popover");
    if (!popover) return;

    if (typeof gsap !== "undefined" && !reduce) {
      gsap.to(popover, {
        opacity: 0,
        scale: 0.8,
        y: 12,
        duration: 0.24,
        ease: "power2.in",
        onComplete: () => {
          popover.remove();
          activePopover = null;
        }
      });
      return;
    }

    popover.remove();
    activePopover = null;
  }

  function getPosition(target) {
    const rect = target.getBoundingClientRect();
    const left = Math.max(32, window.innerWidth * 0.04);
    const clickCenterY = rect.top + rect.height / 2;
    const top = rect.top < 80
      ? 150
      : Math.max(140, Math.min(clickCenterY, window.innerHeight - 140));

    return { left, top };
  }

  function render() {
    const popover = document.createElement("div");
    popover.className = "why-popover";
    popover.setAttribute("role", "tooltip");
    popover.innerHTML = `
      <span class="why-popover-title"><em>Why</em> “应籁”</span>
      <a href="why-yinglai.html" class="why-popover-link">了解一下 →</a>
    `;
    document.body.appendChild(popover);
    activePopover = popover;
    return popover;
  }

  function show(target) {
    destroy();

    const popover = render();
    const { left, top } = getPosition(target);

    if (typeof gsap !== "undefined" && !reduce) {
      gsap.set(popover, {
        left,
        top,
        yPercent: -50,
        opacity: 0,
        scale: 0.9,
        x: -30
      });

      gsap.to(popover, {
        opacity: 1,
        scale: 1,
        x: 0,
        duration: 0.45,
        ease: "back.out(1.4)"
      });

      gsap.to(popover.querySelector(".why-popover-link"), {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay: 0.24,
        ease: "power2.out"
      });
      return;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.transform = "translate(0, -50%)";
    popover.style.opacity = "1";
    popover.querySelector(".why-popover-link").style.opacity = "1";
  }

  function bindGlobalDismiss() {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".why-popover") && !event.target.closest(".interactive-echo-text")) {
        destroy();
      }
    });

    window.addEventListener("scroll", destroy, { passive: true });
  }

  window.WhyYinglaiPopover = {
    bindGlobalDismiss,
    destroy,
    show
  };
})();
