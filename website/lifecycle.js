/* ============================================================
   PlantEcho 官网 · 记忆生命周期滚动与演示动画 (lifecycle.js)
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  let currentDemoIdx = -1, steps = [], arts = [];

  function setProgress(idx) {
    const progress = $("#lcProgress");
    if (!progress || !steps.length) return;
    const width = ((idx + 1) / steps.length) * 100 + "%";
    if (typeof gsap !== "undefined" && !reduce) gsap.to(progress, { width, duration: 0.35, ease: "power2.out" });
    else progress.style.width = width;
  }

  function setActiveStep(idx) {
    steps.forEach((step, i) => step.classList.toggle("active", i <= idx));
    setProgress(idx);
  }

  function setActiveDemo(idx) {
    if (idx === currentDemoIdx) return;
    currentDemoIdx = idx;
    arts.forEach((art, i) => art.classList.toggle("is-active", i === idx));
    if (reduce || typeof gsap === "undefined") return;
    if (idx === 0) {
      gsap.fromTo(".note-leaf", { scale: 0.3, rotation: -30, y: -40, opacity: 0 }, { scale: 1, rotation: (i) => [-8, 6, -3][i], y: 0, opacity: 1, stagger: 0.08, duration: 0.55, ease: "back.out(1.8)", overwrite: "auto" });
    } else if (idx === 1) {
      gsap.fromTo(".folder-icon", { y: -30, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)", overwrite: "auto" });
      gsap.fromTo(".consolidate-sparkle", { scale: 0.2, opacity: 0 }, { scale: 1.6, opacity: 0.65, duration: 1, repeat: -1, yoyo: true, overwrite: "auto" });
    } else if (idx === 2) {
      gsap.fromTo(".diary-book", { rotateY: 90, scale: 0.8, opacity: 0 }, { rotateY: 0, scale: 1, opacity: 1, duration: 0.65, ease: "power2.out", overwrite: "auto" });
      gsap.fromTo(".diary-bars i", { width: 0 }, { width: (i) => ["85%", "50%"][i], duration: 0.7, stagger: 0.15, ease: "power2.out", delay: 0.25, overwrite: "auto" });
    } else if (idx === 3) {
      gsap.fromTo(".understand-orb", { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.7)", overwrite: "auto" });
    }
  }

  function activate(idx) {
    setActiveStep(idx);
    setActiveDemo(idx);
  }

  function bindStepClicks() {
    steps.forEach((step, i) => {
      step.style.cursor = "pointer";
      step.addEventListener("click", () => {
        const trigger = typeof ScrollTrigger !== "undefined" && ScrollTrigger.getById("lifecycleTrigger");
        if (trigger && window.innerWidth > 680 && !reduce) {
          const targetScroll = trigger.start + (i / (steps.length - 1)) * (trigger.end - trigger.start);
          window.scrollTo({ top: targetScroll, behavior: "smooth" });
        } else {
          activate(i);
          step.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        }
      });
    });
  }

  function initDesktopTimeline() {
    const tl = gsap.timeline({
      scrollTrigger: { id: "lifecycleTrigger", trigger: "#lifecycle", start: "top 18%", end: "+=1600", pin: ".lifecycle-pin", scrub: 0.6 }
    });
    steps.forEach((step, i) => {
      tl.to("#lcProgress", { width: ((i + 1) / steps.length) * 100 + "%", duration: 1, ease: "none" }, i);
    });
    tl.eventCallback("onUpdate", () => {
      const idx = Math.min(steps.length - 1, Math.floor(tl.progress() * steps.length));
      setActiveStep(idx);
      setActiveDemo(idx);
    });
    return () => { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); };
  }

  function initMobileTimeline() {
    const triggers = steps.map((step, i) => ScrollTrigger.create({
      trigger: step,
      start: "top 64%",
      end: "bottom 44%",
      onEnter: () => activate(i),
      onEnterBack: () => activate(i)
    }));
    return () => triggers.forEach((trigger) => trigger.kill());
  }

  function initLifecycle() {
    steps = $$(".lc-step");
    arts = $$(".lc-art");
    if (!steps.length || !arts.length) return;
    activate(0);
    bindStepClicks();

    if (reduce || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      steps.forEach((step) => step.classList.add("active"));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 681px)", initDesktopTimeline);
    mm.add("(max-width: 680px)", initMobileTimeline);
  }

  document.addEventListener("DOMContentLoaded", initLifecycle);
})();
