/* ============================================================
   PlantEcho 官网 · GSAP 编排与交互控制 (main.js)
   ============================================================ */
(function () {
  "use strict";

  const MOODS = window.MOODS;
  const REFLECTIONS = window.REFLECTIONS;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  let currentDemoIdx = -1, steps = [], arts = [];

  function setActiveStep(idx) {
    if (!steps.length) steps = $$(".lc-step");
    steps.forEach((s, i) => s.classList.toggle("active", i <= idx));
  }

  function setActiveDemo(idx) {
    if (!arts.length) arts = $$(".lc-art");
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

  function paintCard(mood) {
    const m = MOODS[mood];
    if (!m) return;
    $("#plantCard").dataset.mood = mood;
    const tagRow = $("#plantTags");
    tagRow.innerHTML = "";
    m.tags.forEach((t, i) => {
      const el = document.createElement("span"); el.className = "p-tag"; el.textContent = t;
      el.style.animationDelay = i * 0.07 + "s"; tagRow.appendChild(el);
    });
    const cap = $("#plantCaption");
    cap.style.opacity = "0";
    setTimeout(() => { cap.textContent = m.caption; cap.style.opacity = "1"; }, reduce ? 0 : 200);
    $$("#plantCard .bar").forEach((bar) => {
      bar.querySelector("i").style.setProperty("--v", m.bars[bar.dataset.key] + "%");
    });
    const nav = $("#navReflection");
    if (nav) {
      nav.style.opacity = "0";
      setTimeout(() => { nav.textContent = REFLECTIONS[mood] || REFLECTIONS.happy; nav.style.opacity = ".85"; }, reduce ? 0 : 220);
    }
  }

  function autoCycleHero() {
    const order = ["happy", "sunny", "thirsty", "offline"];
    let i = 0;
    paintCard(order[0]);
    if (reduce) return;
    let timer = setInterval(next, 3600);
    function next() { i = (i + 1) % order.length; paintCard(order[i]); }
    const card = $("#plantCard");
    card.addEventListener("mouseenter", () => clearInterval(timer));
    card.addEventListener("mouseleave", () => { timer = setInterval(next, 3600); });
  }

  function moodSwitcher() {
    const readout = $("#moodReadout"), bubble = $("#moodBubble"), tags = $("#moodTags"), note = $("#moodNote"), btns = $$(".mood-btn");
    const order = ["happy", "thirsty", "sunny", "offline"];
    let idx = 0, timer = null;

    function set(mood) {
      const m = MOODS[mood];
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
      if (reduce) return;
      timer = setInterval(() => {
        idx = (idx + 1) % order.length; set(order[idx]);
      }, 4000);
    }
    function stopCycle() { if (timer) { clearInterval(timer); timer = null; } }

    btns.forEach((b) => {
      b.addEventListener("click", () => { stopCycle(); set(b.dataset.mood); });
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
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function navScroll() {
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function gsapSetup() {
    if (typeof gsap === "undefined") { fallbackReveal(); return; }
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    $$(".reveal").forEach((el) => {
      if (el.closest(".section-head")) return;
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
      gsap.from(".hero-title .reveal", { opacity: 0, y: 24, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.1 });
      gsap.to(".mesh-1", { yPercent: 18, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
      gsap.to(".mesh-2", { yPercent: -14, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1 } });
      gsap.to(".mesh-3", { yPercent: 22, ease: "none", scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1.4 } });
      gsap.to("#plantCard", { y: -40, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 } });

      const stepsList = $$(".lc-step");
      const lcTl = gsap.timeline({
        scrollTrigger: { id: "lifecycleTrigger", trigger: "#lifecycle", start: "top 18%", end: "+=1600", pin: ".lifecycle-pin", scrub: 0.6 }
      });
      stepsList.forEach((s, i) => {
        lcTl.to("#lcProgress", { width: ((i + 1) / stepsList.length) * 100 + "%", duration: 1, ease: "none" }, i);
      });
      lcTl.eventCallback("onUpdate", () => {
        const p = lcTl.progress();
        const idx = Math.min(stepsList.length - 1, Math.floor(p * stepsList.length));
        setActiveStep(idx); setActiveDemo(idx);
      });

      gsap.to(".rv-path", { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut", stagger: 0.25, scrollTrigger: { trigger: ".retrieval", start: "top 70%", toggleActions: "play none none none" } });
      gsap.from(".rv-dst", { scale: 0, transformOrigin: "320px 120px", duration: 0.6, ease: "back.out(2)", delay: 0.9, scrollTrigger: { trigger: ".retrieval", start: "top 70%", toggleActions: "play none none none" } });
      gsap.fromTo(".translate-card", { opacity: 0, y: 34, rotationX: 12 }, { opacity: 1, y: 0, rotationX: 0, duration: 0.75, ease: "back.out(1.3)", stagger: 0.1, scrollTrigger: { trigger: ".translate-grid", start: "top 88%", toggleActions: "play none none none" } });
      gsap.fromTo(".arch-node", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out", stagger: 0.12, scrollTrigger: { trigger: ".arch-flow", start: "top 88%", toggleActions: "play none none none" } });

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

    mm.add("(prefers-reduced-motion: reduce)", () => {
      $$(".reveal").forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
      $$(".lc-step").forEach((s) => s.classList.add("active"));
      gsap.set(".rv-path", { strokeDashoffset: 0 });
    });
  }

  // setupImageZoom has been moved to a separate file zoom.js for modularity.

  document.addEventListener("DOMContentLoaded", () => {
    navScroll(); autoCycleHero(); moodSwitcher();
    setActiveStep(0); setActiveDemo(0);

    const stepsList = $$(".lc-step");
    stepsList.forEach((step, i) => {
      step.style.cursor = "pointer";
      step.addEventListener("click", () => {
        if (typeof ScrollTrigger !== "undefined" && typeof gsap !== "undefined" && !reduce) {
          const trigger = ScrollTrigger.getById("lifecycleTrigger");
          if (trigger) {
            const start = trigger.start, end = trigger.end;
            const targetScroll = start + (i / (stepsList.length - 1)) * (end - start);
            window.scrollTo({ top: targetScroll, behavior: "smooth" });
            return;
          }
        }
        setActiveStep(i); setActiveDemo(i);
      });
    });

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
        else if (i === (idx + 1) % 4) card.classList.add("next");
        else if (i === (idx - 1 + 4) % 4) card.classList.add("prev");
        else card.classList.add("back");
      });
      cIdx = idx;
    }
    function startCarousel() {
      if (reduce || window.innerWidth <= 760) return;
      cTimer = setInterval(() => { updateCarousel((cIdx + 1) % 4); }, 4500);
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
          startCarousel(); // 手动点击切换后，重新开启定时器，实现循环滚动不中断
        }
      });
    });
    const trigArea = $(".triggers");
    if (trigArea) {
      trigArea.addEventListener("mouseenter", stopCarousel);
      trigArea.addEventListener("mouseleave", startCarousel);
    }
    if (cards.length) { updateCarousel(0); startCarousel(); }

    if (typeof gsap !== "undefined" && !reduce) {
      gsap.fromTo(".scroll-cue span", { y: -4, opacity: 0.3 }, { y: 4, opacity: 1, duration: 1.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }

    gsapSetup();
    window.setupImageZoom();

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
