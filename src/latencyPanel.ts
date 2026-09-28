// Màn hình đo độ trễ hiển thị: từ lúc tín hiệu MIDI tới tablet (timeStamp) → khung hình đầu tiên vẽ phản hồi.
// Tạm là hộp thoại; giai đoạn UI sẽ chuyển vào màn Cài đặt.

import { LatencyStats } from "./core/latency";

const TARGET_SAMPLES = 50;
const PASS_P95_MS = 50;

export class LatencyPanel {
  private readonly dlg: HTMLDialogElement;
  private readonly flash: HTMLElement;
  private readonly out: HTMLElement;
  private readonly frame = new LatencyStats(); // timeStamp → khung hình
  private readonly js = new LatencyStats();    // timeStamp → lúc JS xử lý (để tách nguyên nhân)
  private taken = 0; // số nốt đã nhận (kể cả mẫu khung hình chưa đo xong)

  constructor() {
    this.dlg = document.createElement("dialog");
    this.dlg.className = "latency";
    this.dlg.innerHTML = `
      <h2>Đo độ trễ hiển thị</h2>
      <p>Bấm lần lượt <b>${TARGET_SAMPLES} nốt bất kỳ</b> trên đàn (không cần theo bài). Ô vuông đổi màu mỗi lần bấm.</p>
      <div class="lat-flash"></div>
      <div class="lat-out"></div>
      <div class="lat-actions">
        <button type="button" data-act="reset">↺ Đo lại</button>
        <button type="button" data-act="close">Đóng</button>
      </div>`;
    document.body.appendChild(this.dlg);
    this.flash = this.dlg.querySelector(".lat-flash")!;
    this.out = this.dlg.querySelector(".lat-out")!;
    this.dlg.querySelector('[data-act="reset"]')!.addEventListener("click", () => this.reset());
    this.dlg.querySelector('[data-act="close"]')!.addEventListener("click", () => this.dlg.close());
    this.render();
  }

  get isOpen(): boolean { return this.dlg.open; }

  open(): void {
    this.reset();
    this.dlg.showModal();
  }

  /** Gọi khi có Note On; `time` = MIDIMessageEvent.timeStamp */
  onNote(time: number): void {
    if (!this.isOpen || this.taken >= TARGET_SAMPLES) return;
    this.taken++;
    this.js.add(performance.now() - time);
    this.flash.classList.toggle("on"); // thay đổi hình ảnh cần đo
    // Dùng performance.now() thay vì tham số của rAF: tham số là lúc KHUNG BẮT ĐẦU,
    // có thể sớm hơn timeStamp nếu nốt tới giữa khung → ra số âm. performance.now() ở đây = lúc bắt đầu vẽ khung có thay đổi.
    requestAnimationFrame(() => {
      this.frame.add(performance.now() - time);
      this.render();
    });
  }

  private reset(): void {
    this.taken = 0;
    this.frame.reset();
    this.js.reset();
    this.render();
  }

  private render(): void {
    const s = this.frame.summary();
    const j = this.js.summary();
    const f = (x: number) => x.toFixed(1);
    if (!s || !j) {
      this.out.innerHTML = `<p class="lat-count">0 / ${TARGET_SAMPLES}</p>`;
      return;
    }
    const done = s.n >= TARGET_SAMPLES;
    const pass = s.p95 < PASS_P95_MS;
    this.out.innerHTML = `
      <p class="lat-count">${s.n} / ${TARGET_SAMPLES}</p>
      <table>
        <tr><th></th><th>min</th><th>TB</th><th>p95</th><th>max</th></tr>
        <tr><td>Tới khung hình</td><td>${f(s.min)}</td><td>${f(s.avg)}</td><td><b>${f(s.p95)}</b></td><td>${f(s.max)}</td></tr>
        <tr><td>Tới lúc JS xử lý</td><td>${f(j.min)}</td><td>${f(j.avg)}</td><td>${f(j.p95)}</td><td>${f(j.max)}</td></tr>
      </table>
      <p class="lat-note">Đơn vị ms. Màn hình còn cần thêm ~1 khung (~16 ms) để thực sự sáng lên.</p>
      ${done ? `<p class="lat-verdict ${pass ? "pass" : "fail"}">${pass ? "✓ ĐẠT" : "✗ CHƯA ĐẠT"}: p95 = ${f(s.p95)} ms (mục tiêu &lt; ${PASS_P95_MS} ms)</p>` : ""}`;
  }
}
