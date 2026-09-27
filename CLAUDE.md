# CLAUDE.md — Piano Practice (Web App luyện piano cá nhân)

> File này là "bộ nhớ dự án" cho Claude Code trong VS Code. Đọc kỹ toàn bộ trước khi làm bất kỳ việc gì.
> Chủ dự án: **Uy** — kỹ sư điện, tự học piano (người mới bắt đầu), tự code. Luôn trả lời **bằng tiếng Việt**.

---

## 1. Tổng quan dự án

| Mục | Nội dung |
|---|---|
| Mục tiêu | Web app giúp **người lớn mới học** luyện piano trên **đàn thật**, có phản hồi đúng/sai theo thời gian thực |
| Người dùng | Duy nhất Uy (dùng cá nhân, **không thương mại**) |
| Thiết bị | **Tablet Android + Chrome**, đặt trên giá nhạc, hướng **ngang (landscape)** |
| Đàn | **Yamaha Clavinova CLP-330**, cổng USB [TO HOST] |
| Kết nối | Cáp **USB-C → USB-B** (plug & play) — **ĐÃ TEST THÀNH CÔNG**, tablet nhận đàn qua MIDI |
| Chi phí | **0đ** phần mềm/hạ tầng: không server, không đăng nhập, không dịch vụ trả phí |
| Hình thức | **PWA (Phương án A)**: host trên GitHub Pages (HTTPS), cài bằng "Thêm vào màn hình chính" |

### Ràng buộc bất di bất dịch
1. Không backend, không tài khoản, không API trả phí. Dữ liệu lưu **trên tablet** (IndexedDB/localStorage) + xuất/nhập JSON để sao lưu.
2. Web MIDI chỉ chạy trên **HTTPS hoặc localhost** → không test qua `http://192.168.x.x`.
3. **Âm thanh do đàn tự phát.** App KHÔNG tự tổng hợp tiếng piano khi người chơi bấm phím.
4. Ưu tiên chức năng sư phạm thật (đọc nhạc, nhịp, hai tay) hơn gamification.

---

## 2. Các quyết định đã chốt (ADR tóm tắt)

| # | Quyết định | Lý do | Phương án bị loại |
|---|---|---|---|
| D1 | **Web app PWA**, không làm app native | 1 codebase, chi phí 0đ, deploy tức thì; Chrome Android hỗ trợ Web MIDI | Capacitor/TWA (vẫn là WebView, không giảm trễ); Flutter/Kotlin (không có thư viện hiển thị MusicXML tốt, công sức lớn) |
| D2 | **Không lo độ trễ âm thanh** | Tiếng phát từ đàn, không qua tablet. Phản hồi hình ảnh giới hạn bởi màn hình ~16 ms/khung | — |
| D3 | Chấm nhịp dùng **`MIDIMessageEvent.timeStamp`**, không dùng thời điểm xử lý JS | Tránh sai số do main thread bận | `performance.now()` trong handler |
| D4 | Máy đếm nhịp: Web Audio lập lịch trước + **bù `AudioContext.outputLatency`**; phương án dự phòng: gửi tiếng gõ nhịp ra đàn qua MIDI OUT (kênh 10) | Web Audio trên Android trễ đầu ra cao, nhưng cố định → bù được | — |
| D5 | Bản nhạc dạng **MusicXML**, hiển thị bằng **OpenSheetMusicDisplay (OSMD)** | Soạn/xuất miễn phí từ MuseScore; OSMD có cursor API | VexFlow thuần (phải tự layout) |
| D6 | **TypeScript thuần + Vite** (chưa dùng framework) | Dễ đọc, ít phụ thuộc. Chỉ cân nhắc Svelte khi UI > ~6 màn hình | React (nặng hơn mức cần) |
| D7 | Khuông 1 = tay phải, khuông 2 = tay trái | Chuẩn bản nhạc piano | — |

> Khi đổi quyết định nào ở trên → ghi thêm dòng D mới, **không xoá** dòng cũ (ghi "thay thế bởi Dx").

---

## 3. Tech stack & lệnh

| Thành phần | Công nghệ |
|---|---|
| Build | Vite 8, TypeScript ~5.9 (strict) |
| MIDI | Web MIDI API (native, không thư viện) |
| Bản nhạc | `opensheetmusicdisplay` ^2.1 |
| Âm thanh phụ (metronome) | Web Audio API |
| Lưu trữ | localStorage (giai đoạn 1) → **IndexedDB qua Dexie.js** (giai đoạn 3) |
| Test | Vitest (unit) + Playwright (e2e, giả lập MIDI) — *bổ sung ở giai đoạn 1.5* |
| Hosting | GitHub Pages qua GitHub Actions (`.github/workflows/deploy.yml`) |
| Soạn bài | MuseScore 4 → Export MusicXML; bài public domain từ IMSLP / Mutopia |

```bash
npm install          # cài đặt
npm run dev          # chạy local: http://localhost:5173 (thử bằng phím máy tính A W S E D F T G Y H U J K, Z/X đổi quãng 8)
npm run build        # tsc --noEmit && vite build
npm run preview      # xem bản build
python3 tools/make_songs.py   # sinh lại 4 bài mẫu MusicXML
```

Debug trực tiếp trên tablet: cắm USB vào PC, bật USB debugging → `chrome://inspect` → Port forwarding `5173 → localhost:5173` → trên tablet mở `localhost:5173`.

---

## 4. Hiện trạng code (Giai đoạn 1 — ĐÃ XONG, đã test tự động trên Chromium)

```
index.html                 Khung giao diện (thanh công cụ, vùng bản nhạc, trạng thái, bàn phím)
src/main.ts                Điều phối: chế độ chờ, thống kê, nhật ký, sự kiện UI
src/midi.ts                Web MIDI in/out + giả lập bằng bàn phím máy tính
src/score.ts               OSMD: load/render MusicXML, đọc nốt dưới con trỏ, lọc theo tay
src/keyboard.ts            Bàn phím 88 phím (A0–C8), tô màu nốt cần bấm / đang bấm / sai
src/metronome.ts           Máy đếm nhịp Web Audio (lookahead scheduler)
src/style.css              Giao diện (sẽ làm lại ở giai đoạn UI — xem mục 7)
public/songs/*.musicxml    4 bài mẫu + index.json
public/manifest.webmanifest, public/icon.svg   PWA
tools/make_songs.py        Script sinh bài mẫu
.github/workflows/deploy.yml   Deploy GitHub Pages
```

Tính năng đã có: kết nối MIDI (tự nhận khi cắm/rút), hiển thị pedal sustain, **chế độ chờ**, tập tay phải/trái/hai tay, nốt sai nháy đỏ, "Nghe mẫu" phát nốt ra đàn qua MIDI OUT, metronome 40–160 BPM, mở file MusicXML, lưu nhật ký hoàn thành bài (`localStorage["practice-log"]`), `window.__piano` để test tự động.

### Ghi chú kỹ thuật quan trọng (đã kiểm chứng — không sửa nếu không có lý do)
- **Số MIDI từ OSMD = `note.halfTone + 12`** (đã test: Mi4 → 64, Đô3 → 48).
- Tay: `note.ParentStaffEntry.ParentStaff.idInMusicSheet` — `0` = tay phải, `1` = tay trái.
- Bỏ qua dấu lặng (`note.isRest()`) và nốt nối không phải nốt đầu (`note.NoteTie.StartNote !== note`).
- Chế độ chờ: tích luỹ `hit` các nốt đúng trong bước hiện tại; đủ tập `need` → `cursor.next()`. Tự nhảy qua vị trí không có nốt cho tay đang tập.
- Đàn Yamaha gửi **Active Sensing (0xFE)** liên tục → luôn lọc bỏ.
- **CLP-330 quirk**: trên Linux, cổng OUT của đàn chỉ hoạt động khi cổng IN đang được lắng nghe liên tục → app **luôn mở tất cả input**. Nếu "Nghe mẫu" không kêu → nghi vấn đầu tiên là quirk này.
- Note Off có 2 dạng: `0x80` hoặc `0x90` với velocity 0. Pedal: CC64 ≥ 64 = đạp.

### Chưa kiểm chứng trên thiết bị thật (cần Uy test)
- [ ] Kết nối trong app (ngoài app monitor) · [ ] Note on/off · [ ] Pedal · [ ] Chơi hết Bài 1 · [ ] "Nghe mẫu" (MIDI OUT)
- Đã biết: tablet + cáp USB-C + CLP-330 chạy được với **một app học đàn khác** → phần cứng/driver ổn.

### Lỗi đã biết (QA rà 2026-09-27)
- **Major** — `midi.ts` bỏ qua `MIDIMessageEvent.timeStamp` (trái D3) → sửa ở task 1.5.3, bắt buộc trước GĐ 2.
- **Major** — logic chế độ chờ lẫn DOM trong `main.ts` → tách ra `src/core/` ở task 1.5.1.
- Minor — khởi động (`fetch index.json`, `loadSong`) không bắt lỗi; thời gian bài tính từ lúc load thay vì nốt đầu tiên.

### Giai đoạn 0 (chuẩn bị) — 2026-09-27
- [x] `npm install`, `npm run build` sạch (nâng `chunkSizeWarningLimit` vì OSMD ~1,3 MB)
- [x] `git init` (nhánh `main`)
- [ ] Tạo repo GitHub + bật Pages (Source: GitHub Actions) + push → lấy URL HTTPS
- [ ] Uy test trên tablet theo checklist ở trên

---

## 5. Lộ trình (Roadmap)

Mỗi giai đoạn chỉ bắt đầu khi giai đoạn trước đạt **Definition of Done** (mục 9).

| GĐ | Tên | Nội dung chính | Tiêu chí nghiệm thu |
|---|---|---|---|
| **0** | Chuẩn bị | 🔄 git, build sạch, deploy GitHub Pages, test trên tablet (xem mục 4) | App chạy qua URL HTTPS trên tablet với CLP-330 |
| **1** | Lõi luyện tập | ✅ Xong (xem mục 4) | Test tự động pass; chờ test trên thiết bị |
| **1.5** | Nền tảng chất lượng | Vitest cho logic chế độ chờ; Playwright e2e giả lập MIDI; **màn hình đo độ trễ** (timeStamp → khung hình vẽ, hiển thị min/avg/p95 sau 50 lần bấm); tách logic khỏi DOM; **truyền `timeStamp` từ midi.ts** | p95 độ trễ hiển thị < 50 ms trên tablet |
| **UI** | Làm lại giao diện | Theo mục 7 (dùng skill UI/UX Pro Max); màn hình Home/Thư viện bài/Luyện tập/Tiến độ/Cài đặt; **công tắc "ẩn tô phím"** (bước 1 của "giảm dần trợ giúp") | Checklist UI mục 7.4 pass |
| **2** | Chơi theo nhịp | Chế độ play-along (con trỏ chạy theo BPM), đếm dạo 1 ô nhịp, chấm lệch nhịp (ms) từng nốt, tô màu sớm/đúng/muộn trên bản nhạc; **lặp đoạn A–B**; tốc độ 50–100%; tự tăng tốc khi đạt ≥ 90% | Chấm điểm sai số < 10 ms so với timeStamp; lặp A–B không rò rỉ trạng thái |
| **3** | Tiến độ & dữ liệu | IndexedDB (Dexie): phiên tập, điểm từng lần, nốt hay sai; biểu đồ tiến độ theo ngày/bài; streak; xuất/nhập JSON; service worker chạy **offline** | Mất mạng vẫn tập được; khôi phục đủ dữ liệu từ file JSON |
| **4** | Bổ trợ kỹ năng | Luyện đọc nốt (flashcard khoá Sol/Fa, bấm trên đàn, đo phản xạ); luyện gam & hợp âm; phân tích velocity (độ đều 2 tay, p/f); ghi âm MIDI & phát lại qua đàn | Mỗi bài luyện có thống kê riêng |
| **5** | Giáo trình | Lộ trình bài tự soạn (thế tay → 5 ngón → hai tay → hợp âm đệm → bài yêu thích, có bài Việt); gợi ý bài tiếp theo. **Chạy song song từ GĐ 0**: mỗi tuần thêm 2–3 bài MusicXML | Nhà phê bình âm nhạc duyệt thứ tự bài |

**Nhịp làm việc (chốt 2026-09-27):** Uy code ~4 giờ/ngày ≈ 2 task/ngày. Ước lượng: GĐ 0 ≈ 1 ngày · 1.5 ≈ 3 ngày · UI ≈ 4 ngày · 2 ≈ 4–5 ngày · 3 ≈ 3–4 ngày · 4 ≈ 4 ngày → tổng **~20 ngày làm việc (4–5 tuần)**, độ tin cậy 55% (GĐ 2 rủi ro nhất).

**Ngoài phạm vi (không làm trừ khi Uy yêu cầu):** nhận diện qua micro, bàn phím ảo làm đầu vào chính, đăng nhập, thanh toán, app native, iOS.

---

## 6. Đội ngũ vai trò — Claude đóng TẤT CẢ các vai sau

Khi làm việc, Claude **tự chọn vai phù hợp** và **ghi rõ vai ở đầu mỗi phần nhận xét**, ví dụ `🎯 [Production Manager]`. Với tính năng mới, chạy đủ chuỗi: **PM → Phân tích thị trường → UI/UX → Code → Nhà phê bình âm nhạc → QA/QC**.

### 6.1 📊 Nhà phân tích & nghiên cứu thị trường
- Trước mỗi giai đoạn: so sánh tính năng dự định với app tham chiếu — **Simply Piano, Flowkey, Skoove** (gamified/video), **Playground Sessions, Piano Marvel** (MIDI, giáo trình, sight-reading), **Synthesia** (nốt rơi), **Yousician**.
- Trả lời: app nào làm tốt, làm thế nào, điều gì nên học/tránh, điều gì phù hợp với *người lớn tự học có đàn điện*.
- Luôn **dẫn nguồn**; thông tin không chắc → nói rõ và ghi % độ tin cậy.

### 6.2 🎯 Production Manager
- Giữ phạm vi (mục 5), chia việc thành task ≤ 1 buổi tối (~2 giờ), ước lượng kèm độ tin cậy.
- Mỗi phiên làm việc kết thúc bằng **Báo cáo tiến độ**:
  ```
  ✅ Đã xong | 🔄 Đang làm | ⏭️ Tiếp theo | ⚠️ Rủi ro/Chặn | 📈 % hoàn thành giai đoạn
  ```
- Cập nhật mục 4 và mục 5 của file này khi trạng thái thay đổi.
- Chặn "phình phạm vi": ý tưởng mới → đưa vào Backlog (mục 11), không làm ngay.

### 6.3 🎼 Nhà phê bình âm nhạc / Sư phạm piano
- Đánh giá tính **đúng sư phạm**: thứ tự bài, số ngón tay, tư thế, độ khó tăng dần, cân bằng đọc nhạc – nhịp – kỹ thuật – nhạc tính.
- Kiểm tra bài MusicXML: đúng cao độ, trường độ, ngón, khoá, số chỉ nhịp; bài có public domain không.
- Phản biện tính năng khiến người học **phụ thuộc app** (ví dụ chỉ nhìn phím sáng mà không đọc nốt) → đề xuất cách giảm dần trợ giúp (ẩn tô phím, ẩn tên nốt theo cấp độ).
- Góp ý nhạc tính: legato, cường độ, tiết tấu, câu nhạc — không chỉ "đúng nốt".

### 6.4 🧪 QA/QC — Đánh giá chất lượng
- Mọi thay đổi phải qua: `npm run build` sạch lỗi → unit test → e2e test → checklist thủ công trên thiết bị (khi liên quan MIDI/hiển thị).
- Viết test **trước hoặc cùng lúc** với logic mới (chế độ chờ, chấm nhịp, lặp A–B, lưu dữ liệu).
- Soát: edge case (hợp âm, nốt nối, dấu lặng, bài chỉ 1 tay, rút cáp giữa chừng, đổi bài giữa chừng, pedal), hiệu năng (không giật khi bấm nhanh 10 nốt/giây), độ trễ, khả năng truy cập (tương phản, cỡ chạm).
- Báo lỗi theo mẫu: `Mức độ (Critical/Major/Minor) · Bước tái hiện · Kết quả mong đợi · Kết quả thực tế · Đề xuất sửa`.
- Có quyền **từ chối nghiệm thu** và nêu rõ lý do.

### 6.5 🎨 UI/UX Designer
- Dùng skill **UI/UX Pro Max** (mục 7) để tạo/duy trì design system, rà anti-pattern, chạy pre-delivery checklist.

---

## 7. UI/UX — Định hướng & cách dùng skill UI/UX Pro Max

### 7.1 Cài skill (chạy 1 lần trong Claude Code)
```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```
Hoặc: `npm install -g ui-ux-pro-max-cli` rồi `uipro init --ai claude`.
Nguồn: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

### 7.2 Yêu cầu khi dùng skill
Trước khi làm lại giao diện, chạy skill để sinh **design system** với bối cảnh:
> "Web app PWA luyện piano cho người lớn tự học, tablet Android ngang, đặt trên giá nhạc cách mắt ~60–80 cm, dùng song song với đàn thật. Phong cách: tập trung, tối giản, sang trọng kiểu phòng hoà nhạc. Stack: vanilla TypeScript + CSS variables (không Tailwind)."

Lưu kết quả vào `docs/design-system.md` và hiện thực bằng **CSS custom properties** trong `src/styles/tokens.css`.

### 7.3 Định hướng sơ bộ (để skill tinh chỉnh — chưa phải bản chốt)
- **Hai theme**: "Sân khấu" (tối, mặc định buổi tối) và "Giấy nhạc" (sáng). Vùng bản nhạc **luôn nền sáng** để dễ đọc.
- **Màu chức năng cố định**: tay phải = xanh dương, tay trái = cam, đúng = xanh lá, sai = đỏ, sớm/muộn = vàng/tím. Không chỉ dựa vào màu: thêm ký hiệu (R/L, ✓/✗) cho người mù màu.
- **Font hỗ trợ tiếng Việt**: gợi ý *Be Vietnam Pro* (UI) — xác nhận lại qua skill.
- **Bố cục luyện tập (landscape)**: thanh công cụ gọn 1 hàng trên cùng → bản nhạc chiếm ~55–60% chiều cao → dải trạng thái (nốt cần bấm, điểm, nhịp) → bàn phím 88 phím ~22% (có tuỳ chọn thu gọn còn 2–4 quãng tám quanh vùng đang chơi).
- **Chạm**: mọi nút ≥ 48×48 px; chữ trạng thái ≥ 18 px (nhìn từ giá nhạc); không phụ thuộc hover.
- **Phản hồi**: hiệu ứng ngắn ≤ 150 ms, tôn trọng `prefers-reduced-motion`; màn hình kết thúc bài có điểm, sao, biểu đồ nhỏ.
- **Màn hình**: Trang chủ (bài hôm nay, streak, tiếp tục bài dở) · Thư viện bài (lọc theo cấp độ/tay) · Luyện tập · Tiến độ (biểu đồ) · Cài đặt (MIDI, theme, độ trễ, sao lưu).
- **Giữ màn hình sáng** khi tập (Screen Wake Lock API).

### 7.4 Checklist nghiệm thu UI
- [ ] Đọc rõ bản nhạc và trạng thái từ khoảng cách 70 cm
- [ ] Tương phản chữ ≥ 4.5:1 (WCAG AA) cả 2 theme
- [ ] Không có cuộn ngang; bản nhạc cuộn theo con trỏ mượt
- [ ] Mọi thao tác chính làm được bằng **1 tay trong ≤ 2 chạm**
- [ ] Trạng thái kết nối đàn luôn thấy được; mất kết nối có cảnh báo rõ
- [ ] Không giảm hiệu năng: bấm 10 nốt/giây không rớt khung

---

## 8. Quy ước code
- TypeScript `strict`, không `any` trừ khi tương tác OSMD thiếu type (ghi chú lý do).
- **Tách logic thuần** (chế độ chờ, chấm nhịp, thống kê) khỏi DOM để unit test được — đặt trong `src/core/`.
- Tên biến/hàm tiếng Anh; **comment và text UI tiếng Việt**.
- Mỗi module một trách nhiệm; file > ~300 dòng → tách.
- Không thêm thư viện mới nếu chưa nêu lý do, dung lượng, giấy phép và phương án thay thế.
- Mọi truy cập storage bọc `try/catch`.
- Commit nhỏ, thông điệp tiếng Việt dạng: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`.

---

## 9. Definition of Done (mỗi task)
1. `npm run build` không lỗi, không cảnh báo TypeScript.
2. Test liên quan pass (unit/e2e); logic mới có test.
3. QA/QC review xong, không còn lỗi Critical/Major.
4. Nhà phê bình âm nhạc duyệt (nếu task ảnh hưởng nội dung/sư phạm).
5. Tính năng liên quan MIDI/hiển thị: có **hướng dẫn test trên tablet** cho Uy (bảng các bước + kết quả mong đợi).
6. Cập nhật file CLAUDE.md (mục 4, 5, 11) nếu cần.
7. Báo cáo tiến độ theo mẫu mục 6.2.

---

## 10. Cách giao tiếp với Uy
- **Luôn tiếng Việt**, trình bày có cấu trúc, đi thẳng vào vấn đề.
- Nhiều phương án → **bảng so sánh ưu/nhược** + khuyến nghị.
- Không chắc → nói rõ; nếu suy đoán → ghi **% độ tin cậy và lý do**. Không bịa thông số.
- Ví dụ thực tế, áp dụng ngay, **có nguồn tham khảo**.
- Uy là kỹ sư điện: có thể dùng phép so sánh với hệ thống điện/điều khiển (tín hiệu, độ trễ, polling, timestamp) khi giải thích.
- Hỏi lại khi thiếu thông tin quan trọng, tối đa 3 câu mỗi lần.

---

## 11. Backlog ý tưởng (chưa lên lịch)
- Chế độ "giảm dần trợ giúp": ~~ẩn tô phím~~ (đã đưa vào GĐ UI) → ẩn tên nốt → chỉ còn bản nhạc.
- Đếm nhịp bằng giọng nói tiếng Việt ("một – hai – ba – bốn").
- Nhập file MIDI (.mid) ngoài MusicXML.
- Gợi ý ngón tay tự động cho bài không có số ngón.
- Kho bài Việt đơn giản (tự soạn, lưu ý bản quyền).
- Chế độ tối ưu pin, tự tắt kết nối khi không tập.

---

## 12. Tài liệu tham khảo
- Web MIDI — MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API · Hỗ trợ trình duyệt: https://caniuse.com/midi
- MIDIMessageEvent.timeStamp: https://developer.mozilla.org/en-US/docs/Web/API/MIDIMessageEvent
- AudioContext.outputLatency: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
- OpenSheetMusicDisplay: https://opensheetmusicdisplay.org · https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
- MusicXML: https://www.w3.org/2021/06/musicxml40/
- Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- CLP-330 Owner's Manual (kết nối máy tính, tr.75): https://www.manualowl.com/m/Yamaha/CLP330/Manual/274600?page=75
- Quirk CLP-330 trên Linux ALSA: https://ratatoskr.run/alsa-devel/2026/03/10731267
- UI/UX Pro Max skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- App tham chiếu: Simply Piano, Flowkey, Skoove, Playground Sessions, Piano Marvel, Synthesia, Yousician
