import { useRef, type MouseEvent, type PointerEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// 注册使用 useGSAP 插件，保障生命周期与 contextRevert 的内存安全性
gsap.registerPlugin(useGSAP);

interface InteractiveEchoProps {
  english?: string;
  chinese?: string;
  className?: string;
}

export function InteractiveEcho({
  english = "PlantEcho",
  chinese = "应籁",
  className = ""
}: InteractiveEchoProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const { contextSafe } = useGSAP({ scope: containerRef });

  const stopTitleBarDrag = (event: MouseEvent<HTMLSpanElement> | PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation();
  };

  const handleRipple = contextSafe((event: MouseEvent<HTMLSpanElement>) => {
    const textEl = textRef.current;
    if (!textEl) return;
    const rect = textEl.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "echo-ripple-desktop";
    document.body.appendChild(ripple);

    const size = Math.max(rect.width, rect.height) * 2;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const rippleX = event.clientX + scrollLeft;
    const rippleY = event.clientY + scrollTop;

    gsap.set(ripple, {
      width: size,
      height: size,
      left: rippleX - size / 2,
      top: rippleY - size / 2,
      scale: 0.1,
      opacity: 0.8,
      position: "absolute",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(46, 204, 113, 0.4) 0%, rgba(46, 204, 113, 0) 70%)",
      pointerEvents: "none",
      zIndex: 9999
    });

    gsap.to(ripple, {
      scale: 1.6,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => ripple.remove()
    });
  });

  const handleClick = contextSafe((event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const el = textRef.current;
    if (!el || el.classList.contains("animating")) return;
    el.classList.add("animating");

    handleRipple(event);

    const isEng = el.dataset.state === "english";
    const nextState = isEng ? "chinese" : "english";
    const nextText = isEng ? el.dataset.chinese : el.dataset.english;
    if (!nextText) {
      el.classList.remove("animating");
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        el.classList.remove("animating");
        gsap.set(el, { clearProps: "transform,opacity,visibility" });
      }
    });

    tl.to(el, {
      rotateX: isEng ? 90 : -90,
      opacity: 0,
      y: isEng ? -3 : 3,
      scale: 0.9,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        el.textContent = nextText;
        el.dataset.state = nextState;
        gsap.set(el, {
          rotateX: isEng ? -90 : 90,
          y: isEng ? 3 : -3
        });
      }
    });

    // 翻转后半程并回弹 (90度 ➔ 0度)
    tl.to(el, {
      rotateX: 0,
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.38,
      ease: "back.out(2.2)"
    });
  });

  return (
    <span
      ref={containerRef}
      className={`inline-block select-none align-middle ${className}`}
      style={{ perspective: "400px", WebkitPerspective: "400px" }}
    >
      <span
        ref={textRef}
        data-state="english"
        data-english={english}
        data-chinese={chinese}
        onPointerDown={stopTitleBarDrag}
        onMouseDown={stopTitleBarDrag}
        onDoubleClick={stopTitleBarDrag}
        onClick={handleClick}
        className="inline-block cursor-pointer border-b-[1.5px] border-dashed border-primary/30 pb-[1px] font-semibold transition-[border-color,color,text-shadow] duration-300 hover:border-primary hover:text-primary hover:[text-shadow:0_0_8px_rgba(46,204,113,0.35)]"
        style={{
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
      >
        {english}
      </span>
    </span>
  );
}
