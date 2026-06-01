import type { ReactNode } from "react";
import { WindowTitleBar } from "./WindowTitleBar";

interface DesktopFrameProps {
  children: ReactNode;
}

export function DesktopFrame({ children }: DesktopFrameProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <WindowTitleBar />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
