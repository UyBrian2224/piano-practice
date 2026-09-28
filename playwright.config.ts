import { defineConfig, devices } from "@playwright/test";

// e2e: chạy app thật trong Chromium, MIDI được giả lập (xem e2e/fake-midi.ts)
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5174",
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 800 }, // gần với tablet ngang
  },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: true,
  },
});
