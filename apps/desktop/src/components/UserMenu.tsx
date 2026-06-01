import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { AppUser } from "@dyn/shared";
import { authApi } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
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
        className="inline-flex items-center gap-xs rounded-full bg-surface-container/80 px-md py-xs text-label-sm font-label-sm text-on-surface-variant ring-1 ring-surface-container-highest/40 transition-colors duration-200 hover:bg-surface-container"
        title={connection.user.displayName}
      >
        <Icon name="person" className="text-[16px]" />
        <span className="max-w-[160px] truncate">{connection.user.displayName}</span>
      </button>
      {open ? (
        <UserDialog
          connection={connection}
          onLogout={onLogout}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function UserDialog({
  connection,
  onLogout,
  onClose
}: UserMenuProps & { onClose: () => void }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = connection.user.role === "admin";

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      setUsers((await authApi.listUsers(connection.baseUrl, connection.token)).users);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "用户列表暂时没有回来。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [connection.token]);

  const updateUser = async (userId: string, input: { isActive?: boolean; role?: "admin" | "user" }) => {
    setError("");
    try {
      const result = await authApi.updateUser(connection.baseUrl, connection.token, userId, input);
      setUsers((current) => current.map((user) => (user.id === userId ? result.user : user)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "这个调整没有保存下来。");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-md dialog-backdrop-in bg-inverse-surface/30 backdrop-blur-sm">
      <section className="dialog-pop-in w-[min(760px,calc(100vw-1.5rem))] max-h-[min(720px,calc(100vh-2rem))] overflow-hidden rounded-lg bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal">
        <header className="flex items-start justify-between gap-md border-b border-surface-container-highest/50 px-lg py-md">
          <div>
            <h2 className="font-display text-headline-lg text-on-surface">账号</h2>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              {connection.user.username} · {connection.user.role === "admin" ? "管理员" : "成员"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
            aria-label="关闭"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="scroll-area max-h-[calc(100vh-10rem)] overflow-y-auto px-lg py-md">
          <div className="flex flex-col gap-sm rounded-md bg-surface px-md py-sm ring-1 ring-surface-container-highest/50">
            <p className="text-title-sm font-title-sm text-on-surface">{connection.user.displayName}</p>
            <p className="text-body-sm text-on-surface-variant">{connection.baseUrl}</p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-xs inline-flex w-fit items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40"
            >
              <Icon name="logout" />
              退出登录
            </button>
          </div>

          {isAdmin ? (
            <div className="mt-lg flex flex-col gap-md">
              <div className="flex items-center justify-between gap-md">
                <h3 className="text-title-md font-title-md text-on-surface">用户管理</h3>
                <button
                  type="button"
                  onClick={loadUsers}
                  className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40"
                >
                  <Icon name={loading ? "progress_activity" : "refresh"} />
                  刷新
                </button>
              </div>
              <CreateUserForm connection={connection} onCreated={loadUsers} />
              {error ? (
                <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-sm">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selfId={connection.user.id}
                    onToggle={() => updateUser(user.id, { isActive: !user.isActive })}
                    onRole={() => updateUser(user.id, { role: user.role === "admin" ? "user" : "admin" })}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body
  );
}

function UserRow({
  user,
  selfId,
  onToggle,
  onRole
}: {
  user: AppUser;
  selfId: string;
  onToggle: () => void;
  onRole: () => void;
}) {
  const isSelf = user.id === selfId;
  return (
    <article className="flex flex-col gap-sm rounded-md bg-surface px-md py-sm ring-1 ring-surface-container-highest/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-title-sm font-title-sm text-on-surface">{user.displayName}</p>
        <p className="truncate text-body-sm text-on-surface-variant">
          {user.username} · {user.role === "admin" ? "管理员" : "成员"} · {user.isActive ? "可登录" : "已停用"}
        </p>
      </div>
      <div className="flex flex-wrap gap-xs">
        <button
          type="button"
          onClick={onRole}
          disabled={isSelf}
          className="rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40 disabled:opacity-50"
        >
          {user.role === "admin" ? "设为成员" : "设为管理员"}
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={isSelf}
          className="rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40 disabled:opacity-50"
        >
          {user.isActive ? "停用" : "启用"}
        </button>
      </div>
    </article>
  );
}

function CreateUserForm({
  connection,
  onCreated
}: {
  connection: BackendConnection;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || password.length < 8 || saving) return;
    setSaving(true);
    try {
      await authApi.createUser(connection.baseUrl, connection.token, {
        username,
        displayName: displayName.trim() || undefined,
        password,
        role
      });
      setUsername("");
      setDisplayName("");
      setPassword("");
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid grid-cols-1 gap-sm rounded-md bg-secondary-fixed/20 p-md md:grid-cols-[1fr_1fr_1fr_auto_auto]" onSubmit={submit}>
      <input className="rounded-md bg-surface px-md py-sm outline-none ring-1 ring-surface-container-highest focus:ring-primary" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账号" />
      <input className="rounded-md bg-surface px-md py-sm outline-none ring-1 ring-surface-container-highest focus:ring-primary" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="显示名称" />
      <input className="rounded-md bg-surface px-md py-sm outline-none ring-1 ring-surface-container-highest focus:ring-primary" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="初始密码" type="password" />
      <select className="rounded-md bg-surface px-md py-sm outline-none ring-1 ring-surface-container-highest focus:ring-primary" value={role} onChange={(event) => setRole(event.target.value as "admin" | "user")}>
        <option value="user">成员</option>
        <option value="admin">管理员</option>
      </select>
      <button className="inline-flex items-center justify-center gap-xs rounded-full bg-primary px-md py-sm text-label-md font-label-md text-on-primary disabled:opacity-50" disabled={saving || !username.trim() || password.length < 8}>
        <Icon name={saving ? "progress_activity" : "person_add"} />
        添加
      </button>
    </form>
  );
}
