import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const tauriDevHost = process.env.TAURI_DEV_HOST;
const devHost = tauriDevHost || "0.0.0.0";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: devHost,
    hmr: tauriDevHost ? { protocol: "ws", host: tauriDevHost, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] }
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: devHost
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  }
});
