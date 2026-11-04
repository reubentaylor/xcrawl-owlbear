import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  server: { cors: true },
  preview: { cors: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
      },
    },
  },
});
