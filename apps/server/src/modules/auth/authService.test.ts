import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("users can register, login and be managed by an admin", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/auth-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const {
    createManagedUser,
    listManagedUsers,
    loginUser,
    registerUser,
    updateManagedUser
  } = await import("./authService.js");

  try {
    migrate();
    const adminSession = registerUser({
      username: "admin_one",
      password: "garden-pass-1",
      displayName: "园丁"
    });
    assert.equal(adminSession.user.role, "admin");
    assert.ok(adminSession.token);

    const login = loginUser({ username: "admin_one", password: "garden-pass-1" });
    assert.equal(login.user.username, "admin_one");
    assert.ok(login.user.lastLoginAt);

    const created = createManagedUser(adminSession.user, {
      username: "member_one",
      password: "garden-pass-2",
      displayName: "成员",
      role: "user"
    });
    assert.equal(created.user.role, "user");
    assert.equal(listManagedUsers(adminSession.user).length, 2);

    const disabled = updateManagedUser(adminSession.user, created.user.id, { isActive: false });
    assert.equal(disabled.isActive, false);
    assert.throws(
      () => loginUser({ username: "member_one", password: "garden-pass-2" }),
      /账号或密码/
    );
  } finally {
    closeDb();
  }
});
