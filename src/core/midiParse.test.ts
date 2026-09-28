import { describe, expect, it } from "vitest";
import { parseMidi } from "./midiParse";

describe("parseMidi()", () => {
  it("Note On (kênh 1 và kênh khác)", () => {
    expect(parseMidi([0x90, 60, 100])).toEqual({ type: "noteon", note: 60, velocity: 100 });
    expect(parseMidi([0x93, 48, 1])).toEqual({ type: "noteon", note: 48, velocity: 1 });
  });

  it("Note Off dạng 0x80 và dạng 0x90 velocity 0", () => {
    expect(parseMidi([0x80, 60, 64])).toEqual({ type: "noteoff", note: 60 });
    expect(parseMidi([0x90, 60, 0])).toEqual({ type: "noteoff", note: 60 });
  });

  it("Pedal sustain CC64: ≥ 64 = đạp", () => {
    expect(parseMidi([0xb0, 64, 127])).toEqual({ type: "sustain", down: true });
    expect(parseMidi([0xb0, 64, 64])).toEqual({ type: "sustain", down: true });
    expect(parseMidi([0xb0, 64, 63])).toEqual({ type: "sustain", down: false });
  });

  it("bỏ qua Active Sensing, Clock, SysEx và CC khác", () => {
    expect(parseMidi([0xfe])).toBeNull();
    expect(parseMidi([0xf8])).toBeNull();
    expect(parseMidi([0xf0, 0x43, 0x10, 0xf7])).toBeNull();
    expect(parseMidi([0xb0, 67, 127])).toBeNull(); // pedal soft
    expect(parseMidi([0xc0, 5])).toBeNull(); // program change
  });

  it("dữ liệu rỗng / null", () => {
    expect(parseMidi(null)).toBeNull();
    expect(parseMidi(new Uint8Array(0))).toBeNull();
  });
});
