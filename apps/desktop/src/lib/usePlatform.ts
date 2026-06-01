import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

/** 安卓平台 webview 的 UA 标记；Tauri 安卓端也带 "Android"。 */
const isAndroidUA = (): boolean =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

const computeIsMobile = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isAndroidUA()) return true;
  return window.matchMedia(MOBILE_QUERY).matches;
};

/**
 * 运行时判定是否走移动端 UI：安卓平台 或 窄视口（<768px）。
 * 订阅 matchMedia 的 change 事件，浏览器缩窗即可实时切换，便于预览。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(computeIsMobile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 安卓端恒为移动 UI，无需随视口变化。
    if (isAndroidUA()) {
      setIsMobile(true);
      return;
    }
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
