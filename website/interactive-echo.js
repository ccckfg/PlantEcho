/* ============================================================
   PlantEcho <-> 应籁 3D Morph 交互脚本 (interactive-echo.js)
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. 递归遍历替换 DOM 中的 "PlantEcho" 文本节点
  function makeEchoInteractive() {
    const walk = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          
          // 排除表单输入框、代码块、脚本或已经是包装类内的节点
          if (
            tag === "script" ||
            tag === "style" ||
            tag === "textarea" ||
            tag === "input" ||
            tag === "code" ||
            tag === "pre" ||
            parent.closest(".interactive-echo-text")
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // 仅匹配包含 "PlantEcho" 的文本
          if (/PlantEcho/i.test(node.nodeValue)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      },
      false
    );

    const nodes = [];
    while (walk.nextNode()) {
      nodes.push(walk.currentNode);
    }

    // 倒序替换以防对 DOM tree 遍历造成索引扰动
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const text = node.nodeValue;
      const parent = node.parentNode;
      if (!parent) continue;

      const fragment = document.createDocumentFragment();
      const regex = /(PlantEcho)/gi;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }

        const matchedWord = match[0];

        // 构造具有 3D 景深的外部容器
        const container = document.createElement("span");
        container.className = "interactive-echo-container";

        // 内部 3D 置换核心 span
        const textSpan = document.createElement("span");
        textSpan.className = "interactive-echo-text";
        textSpan.dataset.state = "english";
        textSpan.dataset.english = matchedWord;
        textSpan.dataset.chinese = "应籁";
        textSpan.textContent = matchedWord;

        container.appendChild(textSpan);
        fragment.appendChild(container);

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      parent.replaceChild(fragment, node);
    }
  }

  // 2. 创建平滑淡出的绿色“回声”声波涟漪
  function createRipple(element, event) {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "echo-ripple";
    document.body.appendChild(ripple);

    const size = Math.max(rect.width, rect.height) * 2;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // 从点击坐标扩散以提供极致跟手感；无坐标则从元素中心扩散
    let rippleX, rippleY;
    if (event && event.clientX && event.clientY) {
      rippleX = event.clientX + scrollLeft;
      rippleY = event.clientY + scrollTop;
    } else {
      rippleX = rect.left + scrollLeft + rect.width / 2;
      rippleY = rect.top + scrollTop + rect.height / 2;
    }

    if (typeof gsap !== "undefined" && !reduce) {
      gsap.set(ripple, {
        width: size,
        height: size,
        left: rippleX - size / 2,
        top: rippleY - size / 2,
        scale: 0.1,
        opacity: 0.8
      });

      gsap.to(ripple, {
        scale: 1.6,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      });
    } else {
      ripple.remove();
    }
  }

  // 3. 全局代理点击动画执行
  function initClickDelegation() {
    document.body.addEventListener("click", function (e) {
      const target = e.target.closest(".interactive-echo-text");
      if (!target) return;

      // 阻止超链接默认的页面顶部跳转等行为
      e.preventDefault();
      e.stopPropagation();

      if (target.classList.contains("animating")) return;
      target.classList.add("animating");

      const state = target.dataset.state;
      const isEng = state === "english";
      const nextState = isEng ? "chinese" : "english";
      const nextText = isEng ? target.dataset.chinese : target.dataset.english;

      // 播放“唤醒”涟漪声波
      createRipple(target, e);

      // 唤醒上方气泡Popover (仅在“英文”切换成“中文”时触发；反向点击则销毁气泡)
      const popover = window.WhyYinglaiPopover;
      if (popover) {
        if (isEng) popover.show(target);
        else popover.destroy();
      }

      if (typeof gsap === "undefined" || reduce) {
        // 无 GSAP 动画或用户限制动效时的极速切换降级
        target.textContent = nextText;
        target.dataset.state = nextState;
        target.classList.remove("animating");
        return;
      }

      // GSAP 3D 翻转置换
      const tl = gsap.timeline({
        onComplete: () => {
          target.classList.remove("animating");
        }
      });

      tl.to(target, {
        rotateX: isEng ? 90 : -90,
        opacity: 0,
        y: isEng ? -3 : 3,
        scale: 0.9,
        duration: 0.22,
        ease: "power2.in",
        onComplete: () => {
          target.textContent = nextText;
          target.dataset.state = nextState;
          gsap.set(target, {
            rotateX: isEng ? -90 : 90,
            y: isEng ? 3 : -3
          });
        }
      });

      tl.to(target, {
        rotateX: 0,
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.38,
        ease: "back.out(2.2)"
      });
    });
  }

  // 4. 三层架构卡片“自适应发牌展开”动效
  function initCardDealingAnimation() {
    const nodes = Array.from(document.querySelectorAll(".arch-node"));
    const links = Array.from(document.querySelectorAll(".arch-link"));
    if (!nodes.length || typeof gsap === "undefined") return;

    if (reduce) {
      gsap.set(nodes, { opacity: 1, y: 0 });
      gsap.set(links, { opacity: 1, scaleX: 1 });
      return;
    }

    const firstNode = nodes[0];
    const originLeft = firstNode.offsetLeft;

    // 自适应位移设置，像手牌一样扇形重叠在第一张卡片的位置
    nodes.forEach((node, i) => {
      const offset = -(node.offsetLeft - originLeft);
      gsap.set(node, {
        x: offset,
        rotation: -8 + i * 4,
        opacity: 0,
        scale: 0.85,
        transformOrigin: "center center"
      });
    });

    gsap.set(links, { scaleX: 0, transformOrigin: "left center", opacity: 0 });

    const archTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".arch-flow",
        start: "top 85%",
        toggleActions: "play none none none"
      }
    });

    nodes.forEach((node, i) => {
      // 发牌飞出回弹
      archTl.to(node, {
        x: 0,
        rotation: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "back.out(1.5)"
      }, i * 0.24);

      if (i < links.length) {
        archTl.to(links[i], {
          scaleX: 1,
          opacity: 1,
          duration: 0.45,
          ease: "power2.out"
        }, i * 0.24 + 0.35);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // 延后少许时间执行，确保基础组件结构已经完成渲染
    setTimeout(() => {
      makeEchoInteractive();
      initClickDelegation();
      initCardDealingAnimation();
      if (window.WhyYinglaiPopover) window.WhyYinglaiPopover.bindGlobalDismiss();
    }, 100);
  });
})();
