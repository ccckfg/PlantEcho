import { useState } from "react";
import type { BackendConnection } from "@/lib/connection";
import { AccountDialog } from "@/components/account/AccountDialog";
import { Icon } from "./UI";

interface UserMenuProps {
  connection: BackendConnection;
  onLogout: () => void;
}

export function UserMenu({ connection, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container/80 text-label-sm font-label-sm text-on-surface-variant ring-1 ring-surface-container-highest/40 transition-all duration-200 hover:bg-surface-container active:scale-95 sm:h-auto sm:w-auto sm:gap-xs sm:px-md sm:py-xs"
        title={connection.user.displayName}
      >
        <Icon name="person" className="text-[16px]" />
        <span className="hidden max-w-[160px] truncate sm:inline">
          {connection.user.displayName}
        </span>
      </button>
      {open ? (
        <AccountDialog
          connection={connection}
          onLogout={onLogout}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
