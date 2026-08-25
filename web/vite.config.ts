import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // VITE_API_TARGET overrides the dev proxy target (parallel API instances).
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react(), tailwindcss()],
    // Never inline art as base64 into JS. The eager slot-URL globs cover ~1000
    // svg/avif/webp/png files; with the default 4 KB limit every small plate
    // rides in the bundle (measured: 472 KB of data URIs in the SlotArt chunk).
    // VISUAL_ASSETS §9.4: art ships as <img> URLs — cacheable, off the JS budget.
    build: { assetsInlineLimit: 0 },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:8000",
          changeOrigin: false,
        },
      },
    },
    preview: {
      // Public entrances. A leading dot allows every subdomain, which is what
      // Cloudflare quick tunnels need: their hostname is regenerated on each
      // start, so pinning one exact name would break the site on any restart.
      allowedHosts: [
        "unfixable-escapade-democrat.ngrok-free.dev",
        ".trycloudflare.com",
        "localhost",
        "127.0.0.1",
      ],
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:8022",
          changeOrigin: false,
        },
      },
    },
  };
});
