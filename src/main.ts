import "./style.css";
import { MidiInput } from "./midi";
import { Keyboard, noteName } from "./keyboard";
import { Metronome } from "./metronome";
import { Score } from "./score";
import { WaitMode, type Hands } from "./core/waitMode";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const midi = new MidiInput();
const kb = new Keyboard($("keyboard"));
const metro = new Metronome();
const score = new Score($("score"));
const wait = new WaitMode(score);
let songTitle = "";

// ---------- Hiển thị trạng thái chế độ chờ ----------
function showStep() {
  const { step, hands } = wait;
  kb.setExpected(hands === "left" ? [] : step.right, hands === "right" ? [] : step.left);
  $("hint").textContent = wait.ended
    ? (wait.correct === 0 ? "Bài này không có nốt cho tay đã chọn" : "Hoàn thành bài!")
    : "Cần bấm: " + [...wait.need].sort((a, b) => a - b).map(noteName).join(" + ");
  $("stats").textContent = `Đúng: ${wait.correct} · Sai: ${wait.wrong}`;
}

function finish() {
  const s = wait.summary();
  $("result").textContent = `Xong "${songTitle}" — ${s.secs}s — chính xác ${s.acc}% (${s.wrong} nốt sai)`;
  saveLog({ date: new Date().toISOString(), song: songTitle, hands: wait.hands, secs: s.secs, acc: s.acc, wrong: s.wrong });
}

function onNoteOn(m: number, time: number) {
  kb.setPressed(m, true);
  const r = wait.noteOn(m, time);
  if (r === "ignored") return;
  if (r === "wrong") kb.flashWrong(m);
  showStep();
  if (r === "finished") finish();
}

midi.onNoteOn = (m, _vel, time) => onNoteOn(m, time);
midi.onNoteOff = (m) => kb.setPressed(m, false);
midi.onSustain = (down) => $("pedal").classList.toggle("on", down);
midi.onDevicesChanged = (ins) => {
  $("midi-status").textContent = ins.length ? "🎹 " + ins.join(", ") : "Chưa thấy đàn — kiểm tra cáp USB";
  $("midi-status").className = ins.length ? "ok" : "warn";
};
kb.onTouch = (m, down, time) => (down ? onNoteOn(m, time) : kb.setPressed(m, false));
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
  try {
    await score.load(src);
    songTitle = title;
    restart();
  } catch (e) {
    $("hint").textContent = `Không mở được bài "${title}": ${String((e as Error).message ?? e)}`;
  }
}

function restart() {
  wait.restart();
  $("result").textContent = "";
  showStep();
}

$("btn-restart").onclick = restart;
$<HTMLSelectElement>("hands").onchange = (e) => {
  wait.setHands((e.target as HTMLSelectElement).value as Hands);
  $("result").textContent = "";
  showStep();
};
$("btn-listen").onclick = () => {
  const ok = [...wait.need].map((m) => midi.playOnPiano(m)).every(Boolean);
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
  if (midi.supported) $("btn-connect").click();
  else $("midi-status").textContent = "Trình duyệt này không có Web MIDI — dùng bàn phím máy tính (A W S E D…) để thử";
  try {
    const list: { file: string; title: string }[] = await (await fetch("songs/index.json")).json();
    const sel = $<HTMLSelectElement>("song");
    sel.innerHTML = list.map((s) => `<option value="${s.file}">${s.title}</option>`).join("");
    await loadSong(`songs/${list[0].file}`, list[0].title);
  } catch {
    $("hint").textContent = "Không tải được danh sách bài — kiểm tra mạng, hoặc bấm “Mở MusicXML” để mở file trên máy";
  }
})();

// Cho phép kiểm thử tự động
(window as unknown as Record<string, unknown>).__piano = {
  onNoteOn: (m: number) => onNoteOn(m, performance.now()),
  score: () => score,
  need: () => [...wait.need],
  wait: () => wait,
};
