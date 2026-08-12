process.env.DB_PROVIDER = process.env.DB_PROVIDER || "sqlite";
process.env.DATABASE_URL = process.env.DATABASE_URL || "";
process.env.PROACTIVE_STARTUP_DELAY_MS = process.env.PROACTIVE_STARTUP_DELAY_MS || "0";
const testDataRoot = process.env.DYN_DATA_DIR || ".tmp/server-tests";
process.env.DYN_DATA_DIR = `${testDataRoot}-worker-${process.pid}`;
