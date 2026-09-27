// Hiển thị bản nhạc (MusicXML) bằng OpenSheetMusicDisplay + logic "Chế độ chờ"

import { OpenSheetMusicDisplay, type Note } from "opensheetmusicdisplay";

export type Hands = "both" | "right" | "left";

export interface Step {
  right: number[]; // số MIDI tay phải (khuông 1)
  left: number[];  // số MIDI tay trái (khuông 2)
}

export class Score {
  readonly osmd: OpenSheetMusicDisplay;

  constructor(container: HTMLElement) {
    this.osmd = new OpenSheetMusicDisplay(container, {
      backend: "svg",
      autoResize: true,
      drawTitle: true,
      drawPartNames: false,
      followCursor: true,
      drawFingerings: true,
    });
  }

  async load(source: string) {
    await this.osmd.load(source);
    this.osmd.render();
    this.osmd.cursor.show();
    this.osmd.cursor.reset();
  }

  get ended(): boolean {
    return this.osmd.cursor.Iterator.EndReached;
  }

  /** Nốt tại vị trí con trỏ. Bỏ qua dấu lặng và nốt nối (chỉ bấm nốt đầu của dây nối). */
  current(): Step {
    const step: Step = { right: [], left: [] };
    if (this.ended) return step;
    for (const n of this.osmd.cursor.NotesUnderCursor() as Note[]) {
      if (n.isRest()) continue;
      if (n.NoteTie && n.NoteTie.StartNote !== n) continue;
      const midi = n.halfTone + 12; // OSMD: halfTone 0 = C0 theo quy ước riêng, +12 ra số MIDI
      const staff = n.ParentStaffEntry.ParentStaff.idInMusicSheet;
      (staff === 0 ? step.right : step.left).push(midi);
    }
    return step;
  }

  next() { this.osmd.cursor.next(); }
  reset() { this.osmd.cursor.reset(); }
}

/** Nốt cần bấm theo lựa chọn tay */
export function required(step: Step, hands: Hands): number[] {
  if (hands === "right") return step.right;
  if (hands === "left") return step.left;
  return [...step.right, ...step.left];
}
