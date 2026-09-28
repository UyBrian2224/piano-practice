import { describe, expect, it } from "vitest";
import { WaitMode, required, type Step, type StepSource } from "./waitMode";

/** Nguồn bước giả: mảng các bước; bước rỗng = dấu lặng hoặc nốt nối (Score đã lọc) */
class FakeSource implements StepSource {
  i = 0;
  constructor(private steps: Step[]) {}
  get ended() { return this.i >= this.steps.length; }
  current(): Step { return this.ended ? { right: [], left: [] } : this.steps[this.i]; }
  next() { this.i++; }
  reset() { this.i = 0; }
}

const R = (...right: number[]): Step => ({ right, left: [] });
const L = (...left: number[]): Step => ({ right: [], left });
const RL = (right: number[], left: number[]): Step => ({ right, left });

function start(steps: Step[], hands: "both" | "right" | "left" = "both") {
  const w = new WaitMode(new FakeSource(steps));
  w.setHands(hands);
  return w;
}

describe("required()", () => {
  const s = RL([64], [48]);
  it("lọc theo tay", () => {
    expect(required(s, "right")).toEqual([64]);
    expect(required(s, "left")).toEqual([48]);
    expect(required(s, "both")).toEqual([64, 48]);
  });
});

describe("WaitMode", () => {
  it("bấm đúng từng nốt → đi tiếp đến hết bài", () => {
    const w = start([R(60), R(62), R(64)]);
    expect(w.noteOn(60, 0)).toBe("advance");
    expect(w.noteOn(62, 500)).toBe("advance");
    expect(w.noteOn(64, 1000)).toBe("finished");
    expect(w.ended).toBe(true);
    expect(w.summary()).toEqual({ secs: 1, acc: 100, correct: 3, wrong: 0 });
  });

  it("nốt sai: không đi tiếp, tăng số sai", () => {
    const w = start([R(60), R(62)]);
    expect(w.noteOn(61, 0)).toBe("wrong");
    expect(w.need).toEqual(new Set([60]));
    expect(w.noteOn(60, 100)).toBe("advance");
    expect(w.summary().wrong).toBe(1);
    expect(w.summary().acc).toBe(50);
  });

  it("hợp âm: phải bấm đủ mọi nốt, thứ tự bất kỳ", () => {
    const w = start([R(60, 64, 67), R(62)]);
    expect(w.noteOn(67, 0)).toBe("partial");
    expect(w.noteOn(60, 5)).toBe("partial");
    expect(w.noteOn(64, 10)).toBe("advance");
    expect(w.correct).toBe(1);
  });

  it("hợp âm: bấm lặp một nốt đã đúng không làm đi tiếp", () => {
    const w = start([R(60, 64)]);
    w.noteOn(60, 0);
    expect(w.noteOn(60, 5)).toBe("partial");
    expect(w.ended).toBe(false);
  });

  it("nốt sai giữa hợp âm không xoá các nốt đã bấm đúng", () => {
    const w = start([R(60, 64)]);
    w.noteOn(60, 0);
    expect(w.noteOn(65, 5)).toBe("wrong");
    expect(w.noteOn(64, 10)).toBe("finished");
  });

  it("hai tay: cần cả nốt tay phải lẫn tay trái", () => {
    const w = start([RL([64], [48])]);
    expect(w.noteOn(64, 0)).toBe("partial");
    expect(w.noteOn(48, 1)).toBe("finished");
  });

  it("hai tay cùng một cao độ (unison) chỉ cần bấm 1 lần", () => {
    const w = start([RL([60], [60])]);
    expect(w.noteOn(60, 0)).toBe("finished");
  });

  it("tập tay phải: bỏ qua bước chỉ có tay trái, và bỏ qua nốt tay trái trong bước chung", () => {
    const w = start([L(48), RL([64], [48]), L(50), R(65)], "right");
    expect(w.need).toEqual(new Set([64]));
    expect(w.noteOn(64, 0)).toBe("advance");
    expect(w.need).toEqual(new Set([65])); // đã nhảy qua L(50)
    expect(w.noteOn(65, 1)).toBe("finished");
  });

  it("tập tay trái: bài chỉ có tay phải → kết thúc ngay, không treo", () => {
    const w = start([R(60), R(62)], "left");
    expect(w.ended).toBe(true);
    expect(w.noteOn(60, 0)).toBe("ignored");
  });

  it("dấu lặng / nốt nối (bước rỗng) được bỏ qua", () => {
    const w = start([R(60), R(), R(62), R()]);
    w.noteOn(60, 0);
    expect(w.need).toEqual(new Set([62]));
    expect(w.noteOn(62, 1)).toBe("finished"); // bước rỗng cuối cũng được bỏ qua
  });

  it("hai bước liền nhau cùng một nốt: phải bấm lại lần nữa", () => {
    const w = start([R(60), R(60)]);
    expect(w.noteOn(60, 0)).toBe("advance");
    expect(w.noteOn(60, 1)).toBe("finished");
  });

  it("sau khi xong bài, bấm thêm bị bỏ qua và không đổi thống kê", () => {
    const w = start([R(60)]);
    w.noteOn(60, 0);
    expect(w.noteOn(61, 9000)).toBe("ignored");
    expect(w.summary()).toEqual({ secs: 0, acc: 100, correct: 1, wrong: 0 });
  });

  it("thời gian tính từ nốt đầu tiên, không phải lúc mở bài", () => {
    const w = start([R(60), R(62)]);
    w.noteOn(60, 60_000); // ngồi chờ 1 phút rồi mới bấm
    w.noteOn(62, 63_000);
    expect(w.summary().secs).toBe(3);
  });

  it("restart / đổi tay xoá sạch trạng thái", () => {
    const w = start([R(60, 64), L(48)]);
    w.noteOn(60, 0);
    w.noteOn(61, 1);
    w.setHands("left");
    expect(w.need).toEqual(new Set([48]));
    expect(w.hit.size).toBe(0);
    expect(w.summary()).toEqual({ secs: 0, acc: 100, correct: 0, wrong: 0 });
    w.restart();
    expect(w.firstTime).toBeNull();
  });
});
