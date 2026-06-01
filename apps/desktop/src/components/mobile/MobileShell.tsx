import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/UI";
import { PendingDeviceWidget } from "@/components/devices/PendingDeviceWidget";
import { UserMenu } from "@/components/UserMenu";
import type { BackendConnection } from "@/lib/connection";
import { MobileTabBar } from "./MobileTabBar";

interface MobileShellProps {
  children: ReactNode;
  connection?: BackendConnection;
  onDisconnect?: () => void;
  onLogout?: () => void;
}

const routeSection = (pathname: string): string => {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "/";
};

const TITLES: Record<string, string> = {
  "/": "我的花园",
  "/plant": "植物详情",
  "/chat": "植响对话",
  "/journal": "成长日记",
  "/album": "相册"
};

export function MobileShell({ children, connection, onDisconnect, onLogout }: MobileShellProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const section = routeSection(location.pathname);
  const title = useMemo(() => TITLES[section] ?? "PlantEcho", [section]);

  // 仅在主页("/")与详情页("/plant")显示全局顶栏 Header。对话/日记/相册去除全局顶栏，展示局部独立标题，留白更显高级。
  const showHeader = useMemo(() => {
    return ["/", "/plant"].includes(section);
  }, [section]);

  // 滚动时给顶栏加分层阴影，呼应桌面端的呼吸感
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 跨页时把主区域滚回顶部
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {showHeader ? (
        <header
          className={`relative z-20 flex shrink-0 items-center gap-sm bg-surface/80 px-margin-mobile backdrop-blur-md transition-all duration-300 ease-standard ${
            scrolled
              ? "border-b border-surface-container-highest/60 bg-surface/90 shadow-[0_1px_0_rgba(45,90,39,0.04),0_8px_20px_-12px_rgba(45,90,39,0.18)]"
              : "border-b border-transparent"
          }`}
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 16px)",
            paddingBottom: "10px"
          }}
        >
          <BrandMark size="sm" className="h-7 w-7 shrink-0" />
          <h1 className="min-w-0 flex-1 truncate font-display text-headline-md text-primary leading-tight">
            {title}
          </h1>
          <PendingDeviceWidget />
          {connection && onLogout ? <UserMenu connection={connection} onLogout={onLogout} /> : null}
          {connection && onDisconnect ? (
            <button
              type="button"
              onClick={onDisconnect}
              aria-label="更换后端"
              title={connection.baseUrl}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-all duration-200 ease-standard hover:bg-secondary-container/40 hover:text-primary active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Icon name="sync_alt" className="text-[18px]" />
            </button>
          ) : null}
          {/* 顶部边缘空气感淡出渐变条：完美贴合 Header 底边，使得滑动内容在进入 Header 之前自然羽化 */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 z-10 h-6 bg-gradient-to-b from-surface/80 via-surface/30 to-transparent" />
        </header>
      ) : null}

      <main
        ref={mainRef}
        className="scroll-area min-h-0 flex-1 overflow-y-auto bg-surface"
        style={{
          paddingTop: showHeader ? 0 : "calc(env(safe-area-inset-top) + 20px)"
        }}
      >
        {/* key 只取一级路径 — 同页内切 plantId 不重 mount */}
        <div key={section} className="route-fade-in h-full min-h-0">
          {children}
        </div>
      </main>

      <MobileTabBar />
    </div>
  );
}
