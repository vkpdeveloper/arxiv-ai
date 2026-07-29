import { crx } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Loaded unpacked extensions keep their manifest in memory until the
        // extension is reloaded. Stable filenames prevent a normal rebuild
        // from deleting the modules that already-open Chrome tabs reference.
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
