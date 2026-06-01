import type { ReactNode } from "react";

interface MobileFrameProps {
  children: ReactNode;
}

/**
 * 移动端根容器 —— 替代桌面 DesktopFrame。
 * 不渲染 WindowTitleBar（手机没有窗口最小化/最大化/关闭）。
 * 顶部留出状态栏安全区，整体占满屏高，内部由 MobileShell 接管布局。
 */
export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface text-on-surface">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
