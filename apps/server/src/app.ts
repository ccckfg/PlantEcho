import cors from "@fastify/cors";
import Fastify from "fastify";
import { corsMethods } from "./config/http.js";
import { migrate } from "./db/migrate.js";
import { registerAppAuth } from "./modules/auth/appAuth.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerChatRoutes } from "./modules/chat/routes.js";
import { registerDeviceRoutes } from "./modules/devices/routes.js";
import { createMqttBroker } from "./modules/iot/mqttBroker.js";
import { createJobHandlers } from "./modules/jobs/registry.js";
import { createJobWorker } from "./modules/jobs/jobWorker.js";
import { registerMemoryRoutes } from "./modules/memory/routes.js";
import { registerOpenAiCompatRoutes } from "./modules/openaiCompat/routes.js";
import { registerPhotoRoutes } from "./modules/photos/routes.js";
import { registerPlantRoutes } from "./modules/plants/routes.js";
import { createProactiveEngine } from "./modules/proactive/engine.js";
import { registerSyncRoutes } from "./modules/sync/routes.js";
import { registerWeatherRoutes } from "./modules/weather/routes.js";

export const buildApp = async () => {
  migrate();
  const app = Fastify({ logger: true });
  const worker = createJobWorker(createJobHandlers(), {
    info: (message) => app.log.info(message),
    warn: (message) => app.log.warn(message),
    error: (message) => app.log.error(message)
  });
  const mqttBroker = createMqttBroker({
    info: (message) => app.log.info(message),
    warn: (message) => app.log.warn(message),
    error: (message) => app.log.error(message)
  });
  const proactiveEngine = createProactiveEngine({
    info: (message) => app.log.info(message),
    warn: (message) => app.log.warn(message),
    error: (message) => app.log.error(message)
  });
  await app.register(cors, { origin: true, methods: corsMethods });
  await registerAppAuth(app);

  app.get("/health", async () => ({ ok: true, service: "dyn-server" }));
  app.get("/api/v1/auth/check", async (request) => ({ ok: true, user: request.currentUser ?? null }));
  await app.register(registerAuthRoutes);
  await app.register(registerDeviceRoutes);
  await app.register(registerPlantRoutes);
  await app.register(registerChatRoutes);
  await app.register(registerOpenAiCompatRoutes);
  await app.register(registerMemoryRoutes);
  await app.register(registerPhotoRoutes);
  await app.register(registerSyncRoutes);
  await app.register(registerWeatherRoutes);

  app.addHook("onReady", async () => {
    worker.start();
    await mqttBroker.start();
    proactiveEngine.start();
  });
  app.addHook("onClose", async () => {
    await proactiveEngine.stop();
    await mqttBroker.stop();
    await worker.stop();
  });

  return app;
};
