import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    // iPad reaches the dev server through a Cloudflare quick tunnel
    allowedHosts: [".trycloudflare.com"],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "PageBuddy",
        short_name: "PageBuddy",
        description: "English practice from your own book",
        display: "standalone",
        orientation: "any",
        start_url: ".",
        scope: ".",
        theme_color: "#4f7cff",
        background_color: "#f5f8ff",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // precache app shell + spike assets only; pack audio/images (~100MB+)
        // are cached at runtime on first play (CacheFirst) — avoids a huge
        // upfront download while still ending up fully offline-capable.
        globPatterns: [
          "**/*.{js,css,html,svg,woff2}",
          "icons/*.png",
          "spike/*.{png,wav}",
          "art/*.png",
        ],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // pack manifests (index.json, pack.json) must stay fresh —
            // CacheFirst here hid a newly-synced pack for 90 days.
            urlPattern: /\/packs\/[^/]+\/pack\.json|\/packs\/index\.json/,
            handler: "NetworkFirst",
            options: {
              cacheName: "pack-manifests",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // binaries (audio/images) are content-addressed — CacheFirst
            urlPattern: /\/packs\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "pack-assets",
              expiration: { maxEntries: 3000, maxAgeSeconds: 90 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
