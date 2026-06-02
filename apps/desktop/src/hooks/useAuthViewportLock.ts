import { useEffect, useState } from "react";

const KEYBOARD_DELTA_PX = 120;

const getViewportHeight = (): number =>
  Math.round(window.visualViewport?.height ?? window.innerHeight);

const lockScrollPosition = () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export function useAuthViewportLock(): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const previous = {
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyHeight: body.style.height,
      bodyInset: body.style.inset,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTouchAction: body.style.touchAction,
      bodyWidth: body.style.width,
      rootHeight: root?.style.height ?? "",
      rootInset: root?.style.inset ?? "",
      rootOverflow: root?.style.overflow ?? "",
      rootPosition: root?.style.position ?? ""
    };

    const applyViewport = () => {
      const height = getViewportHeight();
      html.style.setProperty("--auth-viewport-height", `${height}px`);
      setKeyboardOpen(window.innerHeight - height > KEYBOARD_DELTA_PX);
      lockScrollPosition();
    };

    const keepLocked = () => requestAnimationFrame(applyViewport);
    const preventMove = (event: TouchEvent) => event.preventDefault();

    html.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.inset = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    if (root) {
      root.style.position = "fixed";
      root.style.inset = "0";
      root.style.height = "var(--auth-viewport-height, 100dvh)";
      root.style.overflow = "hidden";
    }
    applyViewport();

    document.addEventListener("touchmove", preventMove, { passive: false });
    window.addEventListener("scroll", keepLocked, { capture: true });
    window.visualViewport?.addEventListener("resize", keepLocked);
    window.visualViewport?.addEventListener("scroll", keepLocked);

    return () => {
      document.removeEventListener("touchmove", preventMove);
      window.removeEventListener("scroll", keepLocked, { capture: true });
      window.visualViewport?.removeEventListener("resize", keepLocked);
      window.visualViewport?.removeEventListener("scroll", keepLocked);
      html.style.removeProperty("--auth-viewport-height");
      html.style.height = previous.htmlHeight;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      body.style.height = previous.bodyHeight;
      body.style.inset = previous.bodyInset;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.position = previous.bodyPosition;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.width = previous.bodyWidth;
      if (root) {
        root.style.height = previous.rootHeight;
        root.style.inset = previous.rootInset;
        root.style.overflow = previous.rootOverflow;
        root.style.position = previous.rootPosition;
      }
    };
  }, []);

  return keyboardOpen;
}
