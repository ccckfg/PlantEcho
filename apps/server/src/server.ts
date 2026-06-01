import { env } from "./config/env.js";
import { closeDb } from "./db/connection.js";
import { buildApp } from "./app.js";

const app = await buildApp();

const shutdown = async () => {
  await app.close();
  closeDb();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ host: env.HOST, port: env.PORT });

