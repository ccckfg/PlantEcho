import { getCurrentWindow } from "@tauri-apps/api/window";
import { APP_BRAND } from "@/config/branding";
import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/UI";
import { InteractiveEcho } from "@/components/InteractiveEcho";

/** 仅在真正的 Tauri webview 内才有 __TAURI_INTERNALS__；普通浏览器里为 undefined。 */
const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const runWindowAction = (action: (appWindow: ReturnType<typeof getCurrentWindow>) => Promise<void>) => {
  if (!isTauri()) return;
  void action(getCurrentWindow()).catch(() => undefined);
};

export function WindowTitleBar() {
  return (
    <header
      onDoubleClick={() => runWindowAction((appWindow) => appWindow.toggleMaximize())}
      className="h-9 shrink-0 select-none border-b border-surface-container-highest/55 bg-surface-container-lowest/96 text-on-surface shadow-[0_1px_0_rgba(45,90,39,0.04)]"
    >
      <div className="flex h-full items-center justify-between">
        <div className="flex h-full min-w-0 flex-1 items-center">
          <div data-tauri-drag-region className="flex h-full shrink-0 items-center pl-sm pr-xs">
            <BrandMark size="sm" className="h-6 w-6" />
          </div>
          <div
            className="flex min-w-0 items-center"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <InteractiveEcho
              english={APP_BRAND.name}
              chinese="应籁"
              className="text-primary font-bold text-label-md truncate"
            />
          </div>
          <div data-tauri-drag-region className="h-full min-w-4 flex-1" />
        </div>
        <div className="flex h-full items-stretch">
          <TitleBarButton
            label="最小化"
            icon="remove"
            onClick={() => runWindowAction((appWindow) => appWindow.minimize())}
          />
          <TitleBarButton
            label="最大化或还原"
            icon="crop_square"
            onClick={() => runWindowAction((appWindow) => appWindow.toggleMaximize())}
          />
          <TitleBarButton
            label="关闭"
            icon="close"
            danger
            onClick={() => runWindowAction((appWindow) => appWindow.close())}
          />
        </div>
      </div>
    </header>
  );
}

interface TitleBarButtonProps {
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}

function TitleBarButton({ label, icon, danger = false, onClick }: TitleBarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`grid h-full w-12 place-items-center text-on-surface-variant transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 ${
        danger ? "hover:bg-error hover:text-on-error" : "hover:bg-secondary-container/70 hover:text-primary"
      }`}
    >
      <Icon name={icon} className="text-[15px]" />
    </button>
  );
}
