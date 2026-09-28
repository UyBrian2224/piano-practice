import { describe, expect, it } from "vitest";
import { LatencyStats } from "./latency";

describe("LatencyStats", () => {
  it("chưa có mẫu → null", () => {
    expect(new LatencyStats().summary()).toBeNull();
  });

  it("min/avg/p95/max với 1..100 ms", () => {
    const l = new LatencyStats();
    for (let i = 100; i >= 1; i--) l.add(i); // thứ tự ngược để kiểm tra có sắp xếp
    expect(l.summary()).toEqual({ n: 100, min: 1, avg: 50.5, p95: 95, max: 100 });
  });

  it("p95 với 50 mẫu (cỡ mẫu của màn hình đo) = mẫu thứ 48", () => {
    const l = new LatencyStats();
    for (let i = 1; i <= 50; i++) l.add(i * 2);
    expect(l.summary()!.p95).toBe(96);
  });

  it("một mẫu duy nhất", () => {
    const l = new LatencyStats();
    l.add(12);
    expect(l.summary()).toEqual({ n: 1, min: 12, avg: 12, p95: 12, max: 12 });
  });

  it("bỏ mẫu không hợp lệ (âm, NaN, vô cực)", () => {
    const l = new LatencyStats();
    [-1, NaN, Infinity, 5].forEach((x) => l.add(x));
    expect(l.count).toBe(1);
  });

  it("reset xoá sạch", () => {
    const l = new LatencyStats();
    l.add(3);
    l.reset();
    expect(l.summary()).toBeNull();
  });
});
