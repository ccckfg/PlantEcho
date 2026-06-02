/* ============================================================
   PlantEcho 官网 · GSAP 编排与交互控制 (main.js)
   ============================================================ */
(function () {
  "use strict";

  const MOODS = window.MOODS;
  const REFLECTIONS = window.REFLECTIONS;
  const TIMINGS = Object.assign({
    heroMoodCycleMs: 3000,
    moodSwitchCycleMs: 2600,
    proactiveCarouselCycleMs: 3200,
  }, window.PAGE_TIMINGS || {});

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function paintCard(mood) {
    const m = MOODS[mood];
    if (!m) return;
    const plantCard = $("#plantCard");
    if (!plantCard) return;
    plantCard.dataset.mood = mood;
    const tagRow = $("#plantTags");
    if (!tagRow) return;
    tagRow.innerHTML = "";
    m.tags.forEach((t, i) => {
      const el = document.createElement("span"); el.className = "p-tag"; el.textContent = t;
      el.style.animationDelay = i * 0.07 + "s"; tagRow.appendChild(el);
    });
    const cap = $("#plantCaption");
    if (cap) {
      cap.style.opacity = "0";
      setTimeout(() => { cap.textContent = m.caption; cap.style.opacity = "1"; }, reduce ? 0 : 200);
    }
    $$("#plantCard .bar").forEach((bar) => {
      const fill = bar.querySelector("i");
      if (fill) fill.style.setProperty("--v", m.bars[bar.dataset.key] + "%");
    });
    const nav = $("#navReflection");
    if (nav) {
      nav.style.opacity = "0";
      setTimeout(() => { nav.textContent = REFLECTIONS[mood] || REFLECTIONS.happy; nav.style.opacity = ".85"; }, reduce ? 0 : 220);
    }
  }

  function autoCycleHero() {
    const order = ["happy", "sunny", "thirsty", "offline"];
    const card = $("#plantCard");
    if (!card) return;
    let i = 0, timer = null;
    paintCard(order[0]);
    function next() { i = (i + 1) % order.length; paintCard(order[i]); }
    function start() {
      if (reduce || timer) return;
      timer = setInterval(next, TIMINGS.heroMoodCycleMs);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    card.addEventListener("mouseenter", stop);
    card.addEventListener("mouseleave", start);
    start();
  }

  function moodSwitcher() {
    const readout = $("#moodReadout"), bubble = $("#moodBubble"), tags = $("#moodTags"), note = $("#moodNote"), btns = $$(".mood-btn");
    if (!readout || !bubble || !tags || !note || !btns.length) return;
    const order = ["happy", "thirsty", "sunny", "offline"];
    let idx = 0, timer = null;

    function set(mood) {
      const m = MOODS[mood];
      if (!m) return;
      readout.dataset.mood = mood;
      if (!reduce) { bubble.style.opacity = "0"; bubble.style.transform = "translateY(6px)"; }
      setTimeout(() => {
        bubble.textContent = m.bubble; bubble.style.opacity = "1"; bubble.style.transform = "none";
      }, reduce ? 0 : 180);
      tags.innerHTML = "";
      m.tags.forEach((t, i) => {
        const el = document.createElement("span"); el.className = "p-tag"; el.textContent = t;
        el.style.animationDelay = i * 0.07 + "s"; tags.appendChild(el);
      });
      note.textContent = "心情：" + m.label + " · 这是它此刻最想说的话";
      btns.forEach((b) => b.classList.toggle("is-active", b.dataset.mood === mood));
      idx = order.indexOf(mood);
    }

    function startCycle() {
      if (reduce || timer) return;
      timer = setInterval(() => {
        idx = (idx + 1) % order.length; set(order[idx]);
      }, TIMINGS.moodSwitchCycleMs);
    }
    function stopCycle() { if (timer) { clearInterval(timer); timer = null; } }

    btns.forEach((b) => {
      b.addEventListener("click", () => { stopCycle(); set(b.dataset.mood); startCycle(); });
    });
    const stage = $(".mood-stage");
    if (stage) {
      stage.addEventListener("mouseenter", stopCycle);
      stage.addEventListener("mouseleave", startCycle);
    }

    set("happy");
    startCycle();
  }

  function fallbackReveal() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function navScroll() {
    const nav = $("#nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function gsapSetup() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") { fallbackReveal(); return; }
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    $$(".reveal").forEach((el) => {
      if (el.closest(".section-head") || el.closest(".hero-title")) return;
      gsap.fromTo(el, { opacity: 0, y: 100 }, {
        opacity: 1, y: 0, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
      });
    });

    $$(".section-head").forEach((head) => {
      const revs = $$(".reveal", head);
      if (revs.length) {
        gsap.fromTo(revs, { opacity: 0, y: 60 }, {
          opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
          scrollTrigger: { trigger: head, start: "top 88%", toggleActions: "play none none none" }
        });
      }
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(".hero-title .reveal", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.1 });
      gsap.to(".mesh-1", { yPercent: 18, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
      gsap.to(".mesh-2", { yPercent: -14, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
      gsap.to(".mesh-3", { yPercent: 22, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1.4 } });
      gsap.to("#plantCard", { y: -40, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 } });

      gsap.to(".rv-path", { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", stagger: 0.25, scrollTrigger: { trigger: ".retrieval", start: "top 70%", toggleActions: "play none none none" } });
      gsap.from(".rv-dst", { scale: 0, transformOrigin: "320px 120px", duration: 0.6, ease: "back.out(2)", delay: 0.9, scrollTrigger: { trigger: ".retrieval", start: "top 70%", toggleActions: "play none none none" } });
      gsap.fromTo(".translate-card", { opacity: 0, y: 34, rotationX: 12 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.75, ease: "back.out(1.3)", stagger: 0.1, scrollTrigger: { trigger: ".translate-grid", start: "top 88%", toggleActions: "play none none none" } });

      $$(".shot").forEach((sh) => {
        gsap.fromTo(sh, { opacity: 0, y: 50, rotationX: 10, perspective: 1000 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: sh, start: "top 90%", toggleActions: "play none none none" } });
      });
      gsap.fromTo(".leaf-mark.big", { y: -5 }, { y: 5, duration: 2.2, ease: "sine.inOut", repeat: -1, yoyo: true });

      $$(".num b").forEach((el) => {
        const num = parseInt(el.textContent, 10);
        if (isNaN(num)) return;
        const obj = { v: 0 };
        gsap.to(obj, { v: num, duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: ".numbers", start: "top 80%", toggleActions: "play none none none" }, onUpdate() { el.childNodes[0].nodeValue = Math.round(obj.v); } });
      });
    });
    setTimeout(() => gsap.set(".hero-title .reveal", { opacity: 1, y: 0 }), 1400);

    mm.add("(prefers-reduced-motion: reduce)", () => {
      $$(".reveal").forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
      gsap.set(".rv-path", { strokeDashoffset: 0 });
    });
  }

  // setupImageZoom has been moved to a separate file zoom.js for modularity.

  document.addEventListener("DOMContentLoaded", () => {
    navScroll(); autoCycleHero(); moodSwitcher();

    const plantCard = $("#plantCard");
    if (plantCard && !reduce && typeof gsap !== "undefined") {
      plantCard.addEventListener("mousemove", (e) => {
        const rect = plantCard.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(plantCard, { rotateX: -y * 0.06, rotateY: x * 0.06, transformPerspective: 800, duration: 0.4, ease: "power2.out" });
      });
      plantCard.addEventListener("mouseleave", () => {
        gsap.to(plantCard, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power2.out" });
      });
    }

    // 3D 旋转木马主动发言触发器控制
    let cIdx = 0, cTimer = null;
    const cards = $$(".trigger");
    function updateCarousel(idx) {
      cards.forEach((card, i) => {
        card.classList.remove("active", "prev", "next", "back");
        if (i === idx) card.classList.add("active");
        else if (i === (idx + 1) % cards.length) card.classList.add("next");
        else if (i === (idx - 1 + cards.length) % cards.length) card.classList.add("prev");
        else card.classList.add("back");
      });
      cIdx = idx;
    }
    function startCarousel() {
      if (reduce || window.innerWidth <= 760 || cTimer) return;
      cTimer = setInterval(() => { updateCarousel((cIdx + 1) % cards.length); }, TIMINGS.proactiveCarouselCycleMs);
    }
    function stopCarousel() { if (cTimer) { clearInterval(cTimer); cTimer = null; } }
    cards.forEach((card, i) => {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (window.innerWidth > 760) {
          stopCarousel();
          if (!card.classList.contains("active")) {
            e.preventDefault(); e.stopPropagation(); updateCarousel(i);
          } else if (typeof gsap !== "undefined") {
            gsap.fromTo(card, { scale: 0.95 }, { scale: 1.05, duration: 0.35, yoyo: true, repeat: 1, ease: "back.out(2.5)", overwrite: "auto" });
          }
          startCarousel();
        }
      });
    });
    if (cards.length) { updateCarousel(0); startCarousel(); }
    window.addEventListener("resize", () => {
      if (window.innerWidth <= 760) stopCarousel();
      else startCarousel();
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopCarousel();
      else startCarousel();
    });

    if (typeof gsap !== "undefined" && !reduce) {
      gsap.fromTo(".scroll-cue span", { y: -4, opacity: 0.3 }, { y: 4, opacity: 1, duration: 1.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }

    try {
      gsapSetup();
    } catch (err) {
      console.warn("GSAP setup failed; using reveal fallback.", err);
      fallbackReveal();
    }
    if (typeof window.setupImageZoom === "function") window.setupImageZoom();

    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = $(a.getAttribute("href"));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
      });
    });
  });

  window.addEventListener("load", () => {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
})();
