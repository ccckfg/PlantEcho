import type { FastifyInstance } from "fastify";
import { latestSyncEventId, listSyncEventsSince } from "./syncRepository.js";
import { onSyncEvent } from "./syncBus.js";
import type { SyncEvent } from "./syncTypes.js";
import { sendError } from "../../shared/http.js";
import { requireCurrentUser } from "../plants/plantAccess.js";
import { getPlant } from "../plants/plantRepository.js";

const parseSince = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const writeSse = (raw: NodeJS.WritableStream, event: string, data: unknown): void => {
  raw.write(`event: ${event}\n`);
  raw.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const registerSyncRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v1/sync/events", async (request, reply) => {
    try {
      const user = requireCurrentUser(request);
      const query = request.query as { since?: string; limit?: string };
      return {
        events: await listSyncEventsSince(parseSince(query.since), Number(query.limit ?? 200), user.id),
        latestEventId: await latestSyncEventId(user.id)
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/sync/stream", async (request, reply) => {
    let userId = "";
    try {
      userId = requireCurrentUser(request).id;
    } catch (error) {
      return sendError(reply, error);
    }
    const query = request.query as { since?: string };
    const origin = request.headers.origin ?? "*";
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "access-control-allow-origin": origin,
      vary: "Origin"
    });

    const canSend = async (event: SyncEvent): Promise<boolean> => {
      if (!event.plantId) return false;
      return Boolean(await getPlant(event.plantId, false, userId));
    };
    const send = async (event: SyncEvent): Promise<void> => {
      if (!await canSend(event)) return;
      if (!reply.raw.writableEnded) writeSse(reply.raw, "sync", event);
    };
    writeSse(reply.raw, "hello", { latestEventId: await latestSyncEventId(userId) });
    for (const event of await listSyncEventsSince(parseSince(query.since), 500, userId)) await send(event);

    const unsubscribe = onSyncEvent((event) => {
      void send(event);
    });
    const ping = setInterval(() => writeSse(reply.raw, "ping", { at: Date.now() }), 25_000);
    request.raw.on("close", () => {
      clearInterval(ping);
      unsubscribe();
    });
  });
};
