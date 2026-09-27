import { defineConfig } from "vite";

// base "./" để chạy được cả trên GitHub Pages (thư mục con) lẫn máy local
export default defineConfig({
  base: "./",
  server: { host: true },
  // OSMD (hiển thị bản nhạc) tự nó đã ~1,3 MB (~340 kB gzip) — chấp nhận được với PWA dùng offline
  build: { chunkSizeWarningLimit: 1600 },
});
