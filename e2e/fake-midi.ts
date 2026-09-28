// Giả lập Web MIDI: thay navigator.requestMIDIAccess bằng 1 "đàn ảo" có 1 cổng IN + 1 cổng OUT.
// Test điều khiển đàn ảo qua window.__fakeMidi (gửi byte MIDI, rút/cắm cáp, xem byte đã phát ra đàn).

import type { Page } from "@playwright/test";

export async function installFakeMidi(page: Page) {
  await page.addInitScript(() => {
    const input = { name: "Clavinova (ảo)", onmidimessage: null as null | ((e: unknown) => void) };
    const sent: number[][] = [];
    const output = { name: "Clavinova (ảo)", send: (d: number[]) => { sent.push([...d]); } };
    let connected = true;
    const access = {
      onstatechange: null as null | (() => void),
      get inputs() { return new Map(connected ? [["in", input]] : []); },
      get outputs() { return new Map(connected ? [["out", output]] : []); },
    };
    Object.defineProperty(navigator, "requestMIDIAccess", { value: async () => access });
    (window as unknown as Record<string, unknown>).__fakeMidi = {
      send(data: number[]) {
        input.onmidimessage?.({ data: new Uint8Array(data), timeStamp: performance.now() });
      },
      setConnected(on: boolean) { connected = on; access.onstatechange?.(); },
      sent,
    };
  });
}

type FakeMidi = { send(d: number[]): void; setConnected(on: boolean): void; sent: number[][] };

export const midiSend = (page: Page, data: number[]) =>
  page.evaluate((d) => (window as unknown as { __fakeMidi: FakeMidi }).__fakeMidi.send(d), data);

export const setConnected = (page: Page, on: boolean) =>
  page.evaluate((v) => (window as unknown as { __fakeMidi: FakeMidi }).__fakeMidi.setConnected(v), on);

export const sentBytes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __fakeMidi: FakeMidi }).__fakeMidi.sent);

export const need = (page: Page) =>
  page.evaluate(() => (window as unknown as { __piano: { need(): number[] } }).__piano.need());
