import "./style.css";
import { MidiInput } from "./midi";
import { Keyboard, noteName } from "./keyboard";
import { Metronome } from "./metronome";
import { Score, required, type Hands, type Step } from "./score";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const midi = new MidiInput();
const kb = new Keyboard($("keyboard"));
const metro = new Metronome();
const score = new Score($("score"));

// ---------- Trạng thái buổi tập ----------
let hands: Hands = "both";
let step: Step = { right: [], left: [] };
let need = new Set<number>();
const hit = new Set<number>();
let stats = { correct: 0, wrong: 0, start: 0 };
let songTitle = "";

function refreshStep() {
  // Tự nhảy qua các vị trí không có nốt cho tay đang tập (vd. tập tay phải, chỗ chỉ có tay trái)
  step = score.current();
  while (!score.ended && required(step, hands).length === 0) {
    score.next();
    step = score.current();
  }
  need = new Set(required(step, hands));
  hit.clear();
  kb.setExpected(hands === "left" ? [] : step.right, hands === "right" ? [] : step.left);
  $("hint").textContent = score.ended
    ? "Hoàn thành bài!"
    : "Cần bấm: " + [...need].sort((a, b) => a - b).map(noteName).join(" + ");
  if (score.ended) finish();
}

function finish() {
  const secs = Math.round((performance.now() - stats.start) / 1000);
  const acc = stats.correct + stats.wrong === 0 ? 100 : Math.round((stats.correct / (stats.correct + stats.wrong)) * 100);
  $("result").textContent = `Xong "${songTitle}" — ${secs}s — chính xác ${acc}% (${stats.wrong} nốt sai)`;
  saveLog({ date: new Date().toISOString(), song: songTitle, hands, secs, acc, wrong: stats.wrong });
}

function onNoteOn(m: number) {
  kb.setPressed(m, true);
  if (score.ended || stats.start === 0) return;
  if (need.has(m)) {
    hit.add(m);
    if ([...need].every((n) => hit.has(n))) {
      stats.correct++;
      score.next();
      refreshStep();
    }
  } else {
    stats.wrong++;
    kb.flashWrong(m);
  }
  updateStats();
}

function updateStats() {
  $("stats").textContent = `Đúng: ${stats.correct} · Sai: ${stats.wrong}`;
}

midi.onNoteOn = (m) => onNoteOn(m);
midi.onNoteOff = (m) => kb.setPressed(m, false);
midi.onSustain = (down) => $("pedal").classList.toggle("on", down);
midi.onDevicesChanged = (ins) => {
  $("midi-status").textContent = ins.length ? "🎹 " + ins.join(", ") : "Chưa thấy đàn — kiểm tra cáp USB";
  $("midi-status").className = ins.length ? "ok" : "warn";
};
kb.onTouch = (m, down) => (down ? onNoteOn(m) : kb.setPressed(m, false));
midi.enableComputerKeyboard();

// ---------- Nhật ký tập (localStorage, giai đoạn sau chuyển IndexedDB) ----------
interface LogItem { date: string; song: string; hands: Hands; secs: number; acc: number; wrong: number }
function saveLog(item: LogItem) {
  try {
    const all: LogItem[] = JSON.parse(localStorage.getItem("practice-log") ?? "[]");
    all.push(item);
    localStorage.setItem("practice-log", JSON.stringify(all));
  } catch { /* bỏ qua nếu trình duyệt chặn lưu trữ */ }
}

// ---------- Điều khiển ----------
$("btn-connect").onclick = async () => {
  try { await midi.connect(); }
  catch (e) {
    const msg = String((e as Error).message ?? e);
    $("midi-status").textContent = /permission|not granted|denied/i.test(msg)
      ? "Chưa được cấp quyền MIDI — bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép"
      : msg;
    $("midi-status").className = "warn";
  }
};

async function loadSong(src: string, title: string) {
  songTitle = title;
  await score.load(src);
  restart();
}

function restart() {
  score.reset();
  stats = { correct: 0, wrong: 0, start: performance.now() };
  $("result").textContent = "";
  updateStats();
  refreshStep();
}

$("btn-restart").onclick = restart;
$<HTMLSelectElement>("hands").onchange = (e) => {
  hands = (e.target as HTMLSelectElement).value as Hands;
  restart();
};
$("btn-listen").onclick = () => {
  const ok = [...need].map((m) => midi.playOnPiano(m)).every(Boolean);
  if (!ok) $("hint").textContent += " (chưa có cổng MIDI OUT để phát ra đàn)";
};

$<HTMLSelectElement>("song").onchange = async (e) => {
  const sel = e.target as HTMLSelectElement;
  await loadSong(`songs/${sel.value}`, sel.selectedOptions[0].text);
};
$<HTMLInputElement>("file").onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  await loadSong(await f.text(), f.name.replace(/\.(musicxml|xml)$/i, ""));
};

const bpmInput = $<HTMLInputElement>("bpm");
bpmInput.oninput = () => { metro.bpm = Number(bpmInput.value); $("bpm-val").textContent = bpmInput.value; };
$("btn-metro").onclick = () => {
  if (metro.running) metro.stop(); else metro.start();
  $("btn-metro").classList.toggle("on", metro.running);
};

// ---------- Khởi động ----------
(async () => {
  const list: { file: string; title: string }[] = await (await fetch("songs/index.json")).json();
  const sel = $<HTMLSelectElement>("song");
  sel.innerHTML = list.map((s) => `<option value="${s.file}">${s.title}</option>`).join("");
  await loadSong(`songs/${list[0].file}`, list[0].title);
  if (midi.supported) $("btn-connect").click();
  else $("midi-status").textContent = "Trình duyệt này không có Web MIDI — dùng bàn phím máy tính (A W S E D…) để thử";
})();

// Cho phép kiểm thử tự động
(window as unknown as Record<string, unknown>).__piano = { onNoteOn, score: () => score, need: () => [...need] };
