// Thống kê độ trễ (ms): min / trung bình / p95 / max — thuần, không DOM

export interface LatencySummary {
  n: number;
  min: number;
  avg: number;
  p95: number;
  max: number;
}

export class LatencyStats {
  private samples: number[] = [];

  add(ms: number): void {
    if (Number.isFinite(ms) && ms >= 0) this.samples.push(ms);
  }

  get count(): number { return this.samples.length; }

  reset(): void { this.samples = []; }

  summary(): LatencySummary | null {
    const n = this.samples.length;
    if (n === 0) return null;
    const s = [...this.samples].sort((a, b) => a - b);
    const sum = s.reduce((a, b) => a + b, 0);
    return {
      n,
      min: s[0],
      avg: sum / n,
      p95: s[Math.ceil(0.95 * n) - 1], // phương pháp nearest-rank
      max: s[n - 1],
    };
  }
}
