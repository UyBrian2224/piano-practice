// Nhận tín hiệu từ đàn qua Web MIDI + nguồn giả lập (bàn phím máy tính / chạm phím trên màn hình)

import { parseMidi } from "./core/midiParse";

/** `time` = timeStamp của sự kiện (ms, cùng gốc với performance.now) — KHÔNG phải lúc JS xử lý (D3) */
export type NoteHandler = (midi: number, velocity: number, time: number) => void;

export class MidiInput {
  onNoteOn: NoteHandler = () => {};
  onNoteOff: (midi: number, time: number) => void = () => {};
  onSustain: (down: boolean) => void = () => {};
  onDevicesChanged: (inputs: string[], outputs: string[]) => void = () => {};

  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;

  get supported(): boolean {
    return typeof navigator.requestMIDIAccess === "function";
  }

  async connect(): Promise<void> {
    if (!this.supported) throw new Error("Trình duyệt không hỗ trợ Web MIDI (dùng Chrome trên Android/PC, trang phải chạy HTTPS hoặc localhost).");
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.onstatechange = () => this.bind();
    this.bind();
  }

  /** Lắng nghe TẤT CẢ cổng MIDI vào. Việc luôn mở cổng IN cũng giúp CLP-330 không "tắt" cổng OUT. */
  private bind() {
    if (!this.access) return;
    const ins: string[] = [];
    this.access.inputs.forEach((input) => {
      ins.push(input.name ?? "MIDI In");
      input.onmidimessage = (e) => this.handle(e.data, e.timeStamp);
    });
    const outs: string[] = [];
    this.output = null;
    this.access.outputs.forEach((o) => {
      outs.push(o.name ?? "MIDI Out");
      if (!this.output) this.output = o;
    });
    this.onDevicesChanged(ins, outs);
  }

  private handle(data: Uint8Array | null, time: number) {
    const ev = parseMidi(data);
    if (!ev) return;
    if (ev.type === "noteon") this.onNoteOn(ev.note, ev.velocity, time);
    else if (ev.type === "noteoff") this.onNoteOff(ev.note, time);
    else this.onSustain(ev.down);
  }

  /** Phát một nốt ra đàn (gợi ý âm). Kênh 1. */
  playOnPiano(midi: number, velocity = 70, ms = 600) {
    if (!this.output) return false;
    this.output.send([0x90, midi, velocity]);
    this.output.send([0x80, midi, 0], performance.now() + ms);
    return true;
  }

  /** Giả lập bằng bàn phím máy tính: A W S E D F T G Y H U J K = C..C, Z/X đổi quãng tám */
  enableComputerKeyboard() {
    const map = "awsedftgyhujk";
    let base = 60;
    const held = new Set<string>();
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if (k === "z") { base = Math.max(24, base - 12); return; }
      if (k === "x") { base = Math.min(96, base + 12); return; }
      const i = map.indexOf(k);
      if (i < 0 || held.has(k)) return;
      held.add(k);
      this.onNoteOn(base + i, 80, e.timeStamp);
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      const i = map.indexOf(k);
      if (i < 0) return;
      held.delete(k);
      this.onNoteOff(base + i, e.timeStamp);
    });
  }
}
