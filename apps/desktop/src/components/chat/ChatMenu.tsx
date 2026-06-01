import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/UI";

interface ChatMenuProps {
  open: boolean;
  plantId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function ChatMenu({ open, plantId, onClose, onRefresh }: ChatMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouse = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const itemClass =
    "group flex w-full items-center gap-sm rounded-md px-md py-sm text-left font-label-md text-label-md text-on-surface transition-colors duration-200 ease-standard hover:bg-secondary-container/40 hover:text-primary focus-visible:outline-none focus-visible:bg-secondary-container/50";

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-lg top-[72px] z-30 w-40 rounded-lg border border-surface-container-highest/60 bg-surface-container-lowest/95 backdrop-blur-md p-xs shadow-modal dialog-pop-in origin-top-right"
    >
      <Link to={`/plant/${encodeURIComponent(plantId)}`} onClick={onClose} className={itemClass} role="menuitem">
        <Icon name="psychiatry" className="text-[18px] text-secondary transition-transform duration-300 ease-emphasized group-hover:scale-110" />
        查看详情
      </Link>
      <Link to={`/journal/${encodeURIComponent(plantId)}`} onClick={onClose} className={itemClass} role="menuitem">
        <Icon name="menu_book" className="text-[18px] text-secondary transition-transform duration-300 ease-emphasized group-hover:scale-110" />
        成长日记
      </Link>
      <Link to="/album?upload=1" onClick={onClose} className={itemClass} role="menuitem">
        <Icon name="photo_camera" className="text-[18px] text-secondary transition-transform duration-300 ease-emphasized group-hover:scale-110" />
        上传照片
      </Link>
      <div className="my-xs h-px bg-surface-container-highest/50" />
      <button
        type="button"
        onClick={() => {
          onRefresh();
          onClose();
        }}
        className={itemClass}
        role="menuitem"
      >
        <Icon name="refresh" className="text-[18px] text-secondary transition-transform duration-500 ease-emphasized group-hover:rotate-180" />
        刷新消息
      </button>
    </div>
  );
}
