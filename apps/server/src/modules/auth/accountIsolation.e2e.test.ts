import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import Fastify from "fastify";

const sampleReading = {
  capturedAt: new Date().toISOString(),
  soilRaw: 2100,
  soilPercent: 42,
  airTempC: 24,
  airHumidityPercent: 55,
  lightLux: 1200,
  rssi: -58,
  batteryMv: null
};

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axm4nQAAAAASUVORK5CYII=";

test("authenticated users cannot access another user's plant data", async () => {
  process.env.DYN_DATA_DIR = `.codex_tmp/account-isolation-${randomUUID()}`;
  process.env.PROACTIVE_ENABLED = "false";

  const { migrate } = await import("../../db/migrate.js");
  const { closeDb } = await import("../../db/connection.js");
  const { registerAppAuth } = await import("./appAuth.js");
  const { registerAuthRoutes } = await import("./routes.js");
  const { registerPlantRoutes } = await import("../plants/routes.js");
  const { registerChatRoutes } = await import("../chat/routes.js");
  const { registerCareRecordRoutes } = await import("../careRecords/routes.js");
  const { registerDeviceRoutes } = await import("../devices/routes.js");
  const { registerMemoryRoutes } = await import("../memory/routes.js");
  const { registerPhotoRoutes } = await import("../photos/routes.js");
  const { registerSyncRoutes } = await import("../sync/routes.js");
  const { addMessage } = await import("../chat/messageRepository.js");
  const { registerPendingDevice } = await import("../devices/deviceService.js");
  const { publishSyncEvent } = await import("../sync/syncBus.js");

  const app = Fastify({ logger: false });
  try {
    await migrate();
    await registerAppAuth(app);
    await app.register(registerAuthRoutes);
    await app.register(registerDeviceRoutes);
    await app.register(registerPlantRoutes);
    await app.register(registerChatRoutes);
    await app.register(registerCareRecordRoutes);
    await app.register(registerMemoryRoutes);
    await app.register(registerPhotoRoutes);
    await app.register(registerSyncRoutes);

    const register = async (username: string) => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { username, password: "garden-pass-1", displayName: username }
      });
      assert.equal(response.statusCode, 201);
      return response.json() as { token: string; user: { id: string; username: string } };
    };
    const userA = await register("owner_a");
    const userB = await register("owner_b");
    const authA = { authorization: `Bearer ${userA.token}` };
    const authB = { authorization: `Bearer ${userB.token}` };

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/plants",
      headers: authA,
      payload: { name: "小薄荷", species: "薄荷", location: "厨房" }
    });
    assert.equal(created.statusCode, 201);
    const plantId = (created.json() as { plant: { id: string } }).plant.id;

    await addMessage(plantId, 1, "user", "今天长势不错");
    await app.inject({
      method: "POST",
      url: `/api/v1/plants/${plantId}/care-records`,
      headers: authA,
      payload: { type: "water", note: "浇水" }
    });

    const photoResponse = await app.inject({
      method: "POST",
      url: `/api/v1/plants/${plantId}/photos`,
      headers: authA,
      payload: { fileName: "leaf.png", dataUrl: tinyPng }
    });
    assert.equal(photoResponse.statusCode, 201);
    const photoUrl = (photoResponse.json() as { photo: { contentUrl: string } }).photo.contentUrl;

    const deviceId = `esp32-${randomUUID()}`;
    await registerPendingDevice(deviceId, { ...sampleReading, userId: userA.user.id });
    const claimed = await app.inject({
      method: "POST",
      url: `/api/v1/devices/${deviceId}/claim`,
      headers: authA,
      payload: { mode: "existingPlant", plantId, deviceName: "薄荷传感器" }
    });
    assert.equal(claimed.statusCode, 201);
    const deviceApiKey = (claimed.json() as { deviceApiKey: string }).deviceApiKey;
    const reading = await app.inject({
      method: "POST",
      url: `/api/v1/devices/${deviceId}/readings`,
      headers: { "x-api-key": deviceApiKey },
      payload: sampleReading
    });
    assert.equal(reading.statusCode, 201);

    await publishSyncEvent({
      type: "plants.changed",
      plantId,
      payload: { action: "test", plantId }
    });

    const aPlants = await app.inject({ method: "GET", url: "/api/v1/plants", headers: authA });
    const bPlants = await app.inject({ method: "GET", url: "/api/v1/plants", headers: authB });
    assert.equal((aPlants.json() as { plants: Array<{ id: string }> }).plants.some((plant) => plant.id === plantId), true);
    assert.equal((bPlants.json() as { plants: Array<{ id: string }> }).plants.some((plant) => plant.id === plantId), false);

    for (const url of [
      `/api/v1/plants/${plantId}`,
      `/api/v1/plants/${plantId}/messages`,
      `/api/v1/plants/${plantId}/care-records`,
      `/api/v1/plants/${plantId}/photos`,
      `/api/v1/plants/${plantId}/readings/latest`,
      `/api/v1/plants/${plantId}/readings`,
      `/api/v1/plants/${plantId}/memories`,
      `/api/v1/plants/${plantId}/understandings`
    ]) {
      const response = await app.inject({ method: "GET", url, headers: authB });
      assert.equal(response.statusCode, 404, url);
    }

    const bPhoto = await app.inject({ method: "GET", url: photoUrl, headers: authB });
    assert.equal(bPhoto.statusCode, 404);
    const aPhoto = await app.inject({ method: "GET", url: photoUrl, headers: authA });
    assert.equal(aPhoto.statusCode, 200);

    const aDevices = await app.inject({ method: "GET", url: "/api/v1/devices", headers: authA });
    const bDevices = await app.inject({ method: "GET", url: "/api/v1/devices", headers: authB });
    assert.equal((aDevices.json() as { devices: Array<{ id: string }> }).devices.some((device) => device.id === deviceId), true);
    assert.equal((bDevices.json() as { devices: Array<{ id: string }> }).devices.some((device) => device.id === deviceId), false);

    const bSync = await app.inject({ method: "GET", url: "/api/v1/sync/events?since=0", headers: authB });
    assert.equal((bSync.json() as { events: Array<{ plantId: string | null }> }).events.some((event) => event.plantId === plantId), false);
  } finally {
    await app.close();
    await closeDb();
  }
});
