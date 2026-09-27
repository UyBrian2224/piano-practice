// Bàn phím 88 phím hiển thị trạng thái: nốt cần bấm (tay phải/trái), nốt đang bấm, nốt sai

const FIRST = 21; // A0
const LAST = 108; // C8
const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);
const NAMES = ["Đô", "Đô#", "Rê", "Rê#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
export const noteName = (m: number) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

export class Keyboard {
  private keys = new Map<number, HTMLDivElement>();
  onTouch: (midi: number, down: boolean) => void = () => {};

  constructor(root: HTMLElement) {
    root.classList.add("kb");
    const whites = [];
    for (let m = FIRST; m <= LAST; m++) if (!isBlack(m)) whites.push(m);
    const w = 100 / whites.length;
    let wi = 0;
    for (let m = FIRST; m <= LAST; m++) {
      const k = document.createElement("div");
      k.dataset.midi = String(m);
      if (isBlack(m)) {
        k.className = "key black";
        k.style.left = `${wi * w - w * 0.3}%`;
        k.style.width = `${w * 0.6}%`;
      } else {
        k.className = "key white";
        k.style.left = `${wi * w}%`;
        k.style.width = `${w}%`;
        if (m % 12 === 0) k.innerHTML = `<span>${m === 60 ? "C4" : "C" + (m / 12 - 1)}</span>`;
        wi++;
      }
      k.addEventListener("pointerdown", (e) => { e.preventDefault(); this.onTouch(m, true); });
      k.addEventListener("pointerup", () => this.onTouch(m, false));
      k.addEventListener("pointerleave", (e) => { if (e.buttons) this.onTouch(m, false); });
      root.appendChild(k);
      this.keys.set(m, k);
    }
  }

  setPressed(m: number, on: boolean) { this.keys.get(m)?.classList.toggle("pressed", on); }

  setExpected(right: number[], left: number[]) {
    this.keys.forEach((k) => k.classList.remove("exp-r", "exp-l"));
    right.forEach((m) => this.keys.get(m)?.classList.add("exp-r"));
    left.forEach((m) => this.keys.get(m)?.classList.add("exp-l"));
  }

  flashWrong(m: number) {
    const k = this.keys.get(m);
    if (!k) return;
    k.classList.add("wrong");
    setTimeout(() => k.classList.remove("wrong"), 350);
  }
}
