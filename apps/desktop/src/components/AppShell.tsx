import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SideNav } from "./SideNav";
import { Icon } from "./UI";
import { UserMenu } from "./UserMenu";
import { PendingDeviceWidget } from "./devices/PendingDeviceWidget";
import type { BackendConnection } from "@/lib/connection";

interface AppShellProps {
  children: ReactNode;
  connection?: BackendConnection;
  onDisconnect?: () => void;
  onLogout?: () => void;
}

const routeSection = (pathname: string): string => {
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "/";
};

export function AppShell({ children, connection, onDisconnect, onLogout }: AppShellProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // 滚动时给 header 加阴影分层 — 类似 Claude.ai 的呼吸感
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 路由切换时把主区域滚到顶部，避免新页面停留在上一页的滚动位置
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <SideNav />
      <div className="flex-1 h-full min-w-0 flex flex-col bg-surface">
        {connection ? (
          <header
            className={`shrink-0 flex items-center justify-end gap-sm bg-surface/70 backdrop-blur-md px-lg py-sm transition-all duration-300 ease-standard ${
              scrolled
                ? "border-b border-surface-container-highest/60 shadow-[0_1px_0_rgba(45,90,39,0.04),0_8px_20px_-12px_rgba(45,90,39,0.18)]"
                : "border-b border-transparent"
            }`}
          >
            <PendingDeviceWidget />
            {onLogout ? <UserMenu connection={connection} onLogout={onLogout} /> : null}
            <span
              className="min-w-0 inline-flex items-center gap-xs rounded-full bg-surface-container/80 px-md py-xs text-label-sm font-label-sm text-on-surface-variant ring-1 ring-surface-container-highest/40 transition-colors duration-200 hover:bg-surface-container"
              title={connection.baseUrl}
            >
              <Icon name="dns" className="text-[16px]" />
              <span className="truncate max-w-[280px]">{connection.baseUrl}</span>
            </span>
            {onDisconnect ? (
              <button
                type="button"
                onClick={onDisconnect}
                className="group inline-flex items-center gap-xs rounded-full px-md py-xs text-label-sm font-label-sm text-primary transition-all duration-200 ease-standard hover:bg-primary-container/30 focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Icon
                  name="sync_alt"
                  className="text-[16px] transition-transform duration-300 ease-emphasized group-hover:rotate-180"
                />
                更换后端
              </button>
            ) : null}
          </header>
        ) : null}
        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto bg-surface scroll-area"
        >
          {/* key 只取一级路径 — 同一页内切换 plantId 不重 mount，只在跨页时重新淡入 */}
          <div key={routeSection(location.pathname)} className="route-fade-in h-full min-h-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
