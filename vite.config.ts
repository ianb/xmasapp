import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    cloudflare(),
    // The PWA plugin only applies to the browser build, not the Worker bundle.
    ...VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-32.png"],
      manifest: {
        name: "Christmas Carols",
        short_name: "Carols",
        description: "Lyrics for Christmas carols, for singing along.",
        start_url: "/",
        display: "standalone",
        background_color: "#fdfbf7",
        theme_color: "#b3261e",
        icons: [
          { src: "/icon-128.png", sizes: "128x128", type: "image/png" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }).map((plugin) => ({ ...plugin, applyToEnvironment: (env: { name: string }) => env.name === "client" })),
  ],
});
