import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("users can register, login and be managed by an admin", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/auth-${randomUUID()}`;
  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { listAuthSessions } = await import("./authRepository.js");
  const { getApiKeyAuthByHash } = await import("./authApiKeyRepository.js");
  const { authTokenHash } = await import("./token.js");
  const {
    createManagedUser,
    generateOwnApiKey,
    getOwnApiKey,
    listManagedUsers,
    loginUser,
    registerUser,
    listOwnSessions,
    revokeOwnSession,
    rotateOwnApiKey,
    updateManagedUser
  } = await import("./authService.js");

  try {
    migrate();
    const adminSession = registerUser({
      username: "admin_one",
      password: "garden-pass-1",
      displayName: "园丁"
    }, {
      userAgent: "node:test",
      ipAddress: "127.0.0.1"
    });
    assert.equal(adminSession.user.role, "admin");
    assert.ok(adminSession.token);

    const login = loginUser({ username: "admin_one", password: "garden-pass-1" });
    assert.equal(login.user.username, "admin_one");
    assert.ok(login.user.lastLoginAt);
    const sessions = listAuthSessions();
    assert.equal(sessions.length, 2);
    assert.equal(sessions.some((session) => session.userAgent === "node:test"), true);
    assert.equal(sessions.some((session) => session.ipAddress === "127.0.0.1"), true);
    const ownSessions = listOwnSessions(adminSession.user, sessions[0]?.id);
    assert.equal(ownSessions.length, 2);
    assert.equal(ownSessions.some((session) => session.current), true);
    const revoked = revokeOwnSession(adminSession.user, ownSessions[0]!.id);
    assert.ok(revoked.revokedAt);

    const generatedKey = generateOwnApiKey(adminSession.user);
    assert.match(generatedKey.key, /^dyn_api_/);
    assert.equal(getOwnApiKey(adminSession.user)?.preview, generatedKey.apiKey.preview);
    assert.equal(
      getApiKeyAuthByHash(authTokenHash(generatedKey.key))?.user.id,
      adminSession.user.id
    );
    const rotatedKey = rotateOwnApiKey(adminSession.user);
    assert.notEqual(rotatedKey.key, generatedKey.key);
    assert.equal(getApiKeyAuthByHash(authTokenHash(generatedKey.key)), null);
    assert.equal(
      getApiKeyAuthByHash(authTokenHash(rotatedKey.key))?.user.id,
      adminSession.user.id
    );

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
