// Logic "Chế độ chờ" thuần (không DOM, không OSMD) để unit test được.
// Bản nhạc chỉ đi tiếp khi người chơi bấm đủ các nốt của bước hiện tại.

export type Hands = "both" | "right" | "left";

export interface Step {
  right: number[]; // số MIDI tay phải (khuông 1)
  left: number[];  // số MIDI tay trái (khuông 2)
}

/** Nguồn các bước nhạc — thực tế là con trỏ OSMD, trong test là mảng giả. */
export interface StepSource {
  readonly ended: boolean;
  current(): Step;
  next(): void;
  reset(): void;
}

/** Nốt cần bấm theo lựa chọn tay */
export function required(step: Step, hands: Hands): number[] {
  if (hands === "right") return step.right;
  if (hands === "left") return step.left;
  return [...step.right, ...step.left];
}

export type NoteResult = "partial" | "advance" | "finished" | "wrong" | "ignored";

export interface Summary {
  secs: number;  // từ nốt đầu tiên đến nốt cuối cùng
  acc: number;   // % chính xác (0–100)
  correct: number;
  wrong: number;
}

export class WaitMode {
  hands: Hands = "both";
  step: Step = { right: [], left: [] };
  need = new Set<number>();
  readonly hit = new Set<number>();
  correct = 0;
  wrong = 0;
  /** Thời điểm (ms, cùng gốc với performance.now / MIDIMessageEvent.timeStamp) của nốt đầu tiên */
  firstTime: number | null = null;
  lastTime: number | null = null;

  constructor(private readonly src: StepSource) {}

  get ended(): boolean { return this.src.ended; }

  /** Về đầu bài, xoá thống kê */
  restart(): void {
    this.src.reset();
    this.correct = 0;
    this.wrong = 0;
    this.firstTime = null;
    this.lastTime = null;
    this.refresh();
  }

  setHands(hands: Hands): void {
    this.hands = hands;
    this.restart();
  }

  /** Đọc bước hiện tại; tự nhảy qua vị trí không có nốt cho tay đang tập (vd. tập tay phải, chỗ chỉ có tay trái) */
  private refresh(): void {
    this.step = this.src.current();
    while (!this.src.ended && required(this.step, this.hands).length === 0) {
      this.src.next();
      this.step = this.src.current();
    }
    this.need = new Set(required(this.step, this.hands));
    this.hit.clear();
  }

  /** Xử lý một nốt được bấm. `time` = timeStamp của sự kiện (ms). */
  noteOn(midi: number, time: number): NoteResult {
    if (this.src.ended) return "ignored";
    this.firstTime ??= time;
    this.lastTime = time;
    if (!this.need.has(midi)) {
      this.wrong++;
      return "wrong";
    }
    this.hit.add(midi);
    for (const n of this.need) if (!this.hit.has(n)) return "partial";
    this.correct++;
    this.src.next();
    this.refresh();
    return this.src.ended ? "finished" : "advance";
  }

  summary(): Summary {
    const total = this.correct + this.wrong;
    const secs = this.firstTime === null || this.lastTime === null
      ? 0
      : Math.round((this.lastTime - this.firstTime) / 1000);
    return {
      secs,
      acc: total === 0 ? 100 : Math.round((this.correct / total) * 100),
      correct: this.correct,
      wrong: this.wrong,
    };
  }
}
