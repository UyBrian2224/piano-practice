// Giải mã byte MIDI thô thành sự kiện app cần (thuần, không phụ thuộc Web MIDI để unit test được)

export type MidiEvent =
  | { type: "noteon"; note: number; velocity: number }
  | { type: "noteoff"; note: number }
  | { type: "sustain"; down: boolean };

export function parseMidi(data: ArrayLike<number> | null | undefined): MidiEvent | null {
  if (!data || data.length < 1) return null;
  const s0 = data[0];
  if (s0 >= 0xf0) return null; // Tin hệ thống (Active Sensing 0xFE, Clock 0xF8, SysEx…): đàn Yamaha gửi liên tục, bỏ qua
  const status = s0 & 0xf0;
  const d1 = data[1] ?? 0;
  const d2 = data[2] ?? 0;
  if (status === 0x90 && d2 > 0) return { type: "noteon", note: d1, velocity: d2 };
  if (status === 0x80 || status === 0x90) return { type: "noteoff", note: d1 }; // Note Off có 2 dạng: 0x80 hoặc 0x90 vel 0
  if (status === 0xb0 && d1 === 64) return { type: "sustain", down: d2 >= 64 };
  return null;
}
