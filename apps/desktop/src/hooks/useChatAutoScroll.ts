import { useEffect, useRef, type RefObject } from "react";

export function useChatAutoScroll({
  scrollRef,
  resetKey,
  loading,
  tailKey
}: {
  scrollRef: RefObject<HTMLElement>;
  resetKey: string;
  loading: boolean;
  tailKey: string;
}) {
  const instantPendingRef = useRef(true);
  const lastResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      instantPendingRef.current = true;
    }
  }, [resetKey]);

  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (!el) return;

    const instant = instantPendingRef.current;
    const frame = window.requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: instant ? "auto" : "smooth"
      });
      instantPendingRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loading, resetKey, tailKey, scrollRef]);
}
