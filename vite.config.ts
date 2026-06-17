import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Served from GitHub Pages at https://<user>.github.io/dynasty-drafter/, so the
// base path must match the repo name. Override with VITE_BASE if you fork/rename.
const base = process.env.VITE_BASE || "/dynasty-drafter/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Water Buffaloes — Draft Helper",
        short_name: "Buffaloes",
        description: "Dynasty IDP rookie-draft helper & league hub",
        theme_color: "#0f1216",
        background_color: "#0f1216",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell AND the league data JSON so the whole thing
        // works offline at the draft table.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { open: true },
});
