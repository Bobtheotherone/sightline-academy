import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // VITE_API_TARGET overrides the dev proxy target (parallel API instances).
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:8000",
          changeOrigin: false,
        },
      },
    },
  };
});
