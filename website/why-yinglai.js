/**
 * ============================================================
 * "Why 应籁" 专题页专属逻辑与 GSAP 滚动剧场动画 (why-yinglai.js)
 * 严格执行 SoC 职责分离，拒绝臃肿 (限制 300 行以内)
 * ============================================================
 */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. 动态渲染三籁卡片与对话流
  function renderContent() {
    const data = window.YingLaiData;
    if (!data) return;

    // 渲染三籁卡片
    const laisContainer = document.getElementById("laisCardsContainer");
    if (laisContainer && data.THREE_LAIS) {
      laisContainer.innerHTML = data.THREE_LAIS.map(lai => `
        <article class="lai-card reveal-item" id="card-${lai.id}">
          <div class="lai-card-content">
            <span class="lai-icon" aria-hidden="true">${lai.icon}</span>
            <h3>${lai.title}</h3>
            <span class="lai-source">${lai.source}</span>
            <p class="lai-desc">${lai.description}</p>
          </div>
        </article>
      `).join("");
    }

    // 渲染对话气泡时间线
    const chatContainer = document.getElementById("chatTimelineContainer");
    if (chatContainer && data.CONVERSATION_LOGS) {
      chatContainer.innerHTML = data.CONVERSATION_LOGS.map(log => `
        <div class="chat-bubble-wrap ${log.side} reveal-chat">
          <div class="chat-bubble">
            <p class="chat-message-text">${log.text}</p>
            <span class="chat-time" aria-label="对话发送时间">${log.time}</span>
          </div>
        </div>
      `).join("");
    }
  }

  // 2. 巨幕 Hero 入场错峰动画
  function playHeroIntro() {
    if (typeof gsap === "undefined") return;

    const tl = gsap.timeline();

    // 设置初始状态防闪烁
    gsap.set([".intro-eyebrow", ".title-line", ".hero-desc", ".down-cue"], {
      opacity: 0,
      y: 20
    });

    if (reduceMotion) {
      gsap.to([".intro-eyebrow", ".title-line", ".hero-desc", ".down-cue"], {
        opacity: 1,
        y: 0,
        duration: 0.5
      });
      return;
    }

    tl.to(".intro-eyebrow", {
      opacity: 0.8,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    })
    .to(".title-line", {
      opacity: 1,
      y: 0,
      duration: 1.0,
      stagger: 0.2,
      ease: "power3.out"
    }, "-=0.5")
    .to(".hero-desc", {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.6")
    .to(".down-cue", {
      opacity: 0.7,
      y: 0,
      duration: 0.6,
      ease: "power1.out"
    }, "-=0.4");
  }

  // 3. ScrollTrigger 滚动剧场动画
  function initScrollTheatre() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || reduceMotion) {
      // 降级体验：直接将元素显示
      const selectors = [".reveal-item", ".echo-glass-card", ".reveal-chat"];
      if (typeof gsap !== "undefined") {
        gsap.set(selectors, { opacity: 1, y: 0 });
      } else {
        document.querySelectorAll(selectors.join(",")).forEach((element) => {
          element.style.opacity = "1";
          element.style.transform = "translateY(0)";
        });
      }
      return;
    }

    // 注册插件
    gsap.registerPlugin(ScrollTrigger);

    // 三籁卡片：“清风发牌”扇形错峰飞入
    gsap.set(".reveal-item", { opacity: 0, y: 40, rotation: 3, scale: 0.95 });
    ScrollTrigger.batch(".reveal-item", {
      start: "top 85%",
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.18,
        ease: "back.out(1.5)",
        overwrite: "auto"
      }),
      once: true
    });

    // 听见与回声大玻璃卡片：视差软化淡入
    gsap.fromTo(".echo-glass-card",
      { opacity: 0, y: 50, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.0,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".why-section-echo",
          start: "top 80%",
          toggleActions: "play none none none"
        }
      }
    );

    // 公式区在进入视口时的闪亮放大微动效
    gsap.fromTo(".f-result",
      { scale: 0.9, opacity: 0.5 },
      {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: "elastic.out(1.2, 0.4)",
        scrollTrigger: {
          trigger: ".formula-box",
          start: "top 90%",
          toggleActions: "play none none none"
        }
      }
    );

    // 对话气泡：打字般沿轴依次滑出弹入（左侧左弹，右侧右弹）
    const chatItems = gsap.utils.toArray(".reveal-chat");
    chatItems.forEach((chat) => {
      const isRight = chat.classList.contains("right");
      gsap.fromTo(chat,
        {
          opacity: 0,
          x: isRight ? 40 : -40,
          y: 20,
          rotation: isRight ? 2 : -2
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: chat,
            start: "top 92%",
            toggleActions: "play none none none"
          }
        }
      );
    });
  }

  // DOM 载入完成初始化
  document.addEventListener("DOMContentLoaded", () => {
    renderContent();

    // 延后微秒运行，防排版抖动与重绘冲突
    setTimeout(() => {
      playHeroIntro();
      initScrollTheatre();
    }, 80);
  });
})();
