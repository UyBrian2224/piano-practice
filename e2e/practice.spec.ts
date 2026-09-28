import { expect, test, type Page } from "@playwright/test";
import { installFakeMidi, midiSend, need, sentBytes, setConnected } from "./fake-midi";

/** Chơi đúng mọi bước cho đến hết bài, qua "đàn ảo" (byte MIDI thật: Note On rồi Note Off dạng 0x90 vel 0) */
async function playToEnd(page: Page) {
  for (let i = 0; i < 1000; i++) {
    const notes = await need(page);
    if (notes.length === 0) return i;
    for (const n of notes) await midiSend(page, [0x90, n, 80]);
    for (const n of notes) await midiSend(page, [0x90, n, 0]);
  }
  throw new Error("Bài không kết thúc sau 1000 bước");
}

async function openSong(page: Page, file: string) {
  await page.selectOption("#song", file);
  await expect(page.locator("#hint")).toContainText("Cần bấm");
}

test.beforeEach(async ({ page }) => {
  await installFakeMidi(page);
  await page.goto("/");
  await expect(page.locator("#midi-status")).toContainText("Clavinova");
  await expect(page.locator("#hint")).toContainText("Cần bấm");
});

test("chơi hết Bài 1 bằng MIDI → hiện kết quả 100%", async ({ page }) => {
  const steps = await playToEnd(page);
  expect(steps).toBeGreaterThan(5);
  await expect(page.locator("#result")).toContainText("chính xác 100%");
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("practice-log") ?? "[]"));
  expect(log).toHaveLength(1);
});

test("nốt sai: nháy đỏ, tăng số sai, không đi tiếp", async ({ page }) => {
  const before = await need(page);
  const wrong = before[0] + 1;
  await midiSend(page, [0x90, wrong, 80]);
  await expect(page.locator(`[data-midi="${wrong}"]`)).toHaveClass(/wrong/);
  await expect(page.locator("#stats")).toContainText("Sai: 1");
  expect(await need(page)).toEqual(before);
});

test("bỏ qua Active Sensing (0xFE) liên tục", async ({ page }) => {
  for (let i = 0; i < 50; i++) await midiSend(page, [0xfe]);
  await expect(page.locator("#stats")).toContainText("Đúng: 0 · Sai: 0");
});

test("Bài 4 (hợp âm) hai tay chơi hết được", async ({ page }) => {
  await openSong(page, "04-hop-am-C-F-G.musicxml");
  await playToEnd(page);
  await expect(page.locator("#result")).toContainText("chính xác 100%");
});

test("Ode to Joy: tập riêng tay phải / tay trái đều kết thúc được", async ({ page }) => {
  await openSong(page, "03-ode-to-joy.musicxml");
  for (const hands of ["right", "left"]) {
    await page.selectOption("#hands", hands);
    await playToEnd(page);
    await expect(page.locator("#result")).toContainText("Xong");
  }
});

test("đổi bài giữa chừng: thống kê về 0", async ({ page }) => {
  await midiSend(page, [0x90, 1, 80]); // 1 nốt sai
  await openSong(page, "02-5-ngon-tay-trai.musicxml");
  await expect(page.locator("#stats")).toContainText("Đúng: 0 · Sai: 0");
});

test("pedal sustain sáng/tắt", async ({ page }) => {
  await midiSend(page, [0xb0, 64, 127]);
  await expect(page.locator("#pedal")).toHaveClass(/on/);
  await midiSend(page, [0xb0, 64, 0]);
  await expect(page.locator("#pedal")).not.toHaveClass(/on/);
});

test("rút cáp → cảnh báo; cắm lại → tự nhận", async ({ page }) => {
  await setConnected(page, false);
  await expect(page.locator("#midi-status")).toHaveClass(/warn/);
  await setConnected(page, true);
  await expect(page.locator("#midi-status")).toContainText("Clavinova");
});

test("Nghe mẫu phát đúng nốt cần bấm ra MIDI OUT", async ({ page }) => {
  const notes = await need(page);
  await page.click("#btn-listen");
  const sent = await sentBytes(page);
  expect(sent.filter((d) => d[0] === 0x90).map((d) => d[1]).sort()).toEqual([...notes].sort());
});

test("đo độ trễ: 50 nốt → có kết luận p95, không tính vào bài", async ({ page }) => {
  await page.click("#btn-latency");
  const dlg = page.locator("dialog.latency");
  await expect(dlg).toBeVisible();
  for (let i = 0; i < 50; i++) {
    await midiSend(page, [0x90, 60, 80]);
    await midiSend(page, [0x90, 60, 0]);
  }
  await expect(dlg.locator(".lat-count")).toHaveText("50 / 50");
  await expect(dlg.locator(".lat-verdict")).toContainText("p95");
  await dlg.getByText("Đóng").click();
  await expect(page.locator("#stats")).toContainText("Đúng: 0 · Sai: 0");
});
