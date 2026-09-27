// Máy đếm nhịp dùng Web Audio (lập lịch trước ~100 ms để nhịp chính xác, không bị trễ do UI)

export class Metronome {
  bpm = 80;
  beatsPerBar = 4;
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private beat = 0;

  get running() { return this.timer !== null; }

  start() {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    this.beat = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = this.beat % this.beatsPerBar === 0 ? 1500 : 1000;
      gain.gain.setValueAtTime(0.4, this.nextTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.nextTime + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(this.nextTime);
      osc.stop(this.nextTime + 0.06);
      this.nextTime += 60 / this.bpm;
      this.beat++;
    }
  }
}
