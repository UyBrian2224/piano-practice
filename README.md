# Piano Practice — Giai đoạn 1

Web app (PWA) luyện piano trên **tablet Android + Chrome**, nhận nốt trực tiếp từ đàn **Yamaha CLP-330** qua cáp USB.
Không server, không đăng nhập, chi phí 0đ.

## Tính năng đã có
- Kết nối đàn qua Web MIDI, tự nhận lại khi cắm/rút cáp; hiển thị trạng thái pedal sustain.
- Hiển thị bản nhạc MusicXML (2 khuông, có số ngón tay), con trỏ chạy theo.
- **Chế độ chờ**: bản nhạc dừng cho đến khi bấm đúng nốt/hợp âm; nốt sai nháy đỏ trên bàn phím.
- Tập **tay phải / tay trái / hai tay**.
- Bàn phím 88 phím: xanh = tay phải, cam = tay trái, vạch xanh lá = phím đang bấm.
- **Nghe mẫu**: phát nốt cần bấm ra chính cây đàn (qua MIDI OUT).
- Máy đếm nhịp 40–160 BPM.
- 4 bài mẫu + mở file MusicXML bất kỳ (xuất từ MuseScore).
- Lưu nhật ký mỗi lần hoàn thành bài (localStorage, khóa `practice-log`).

## Chạy trên máy tính (VS Code)
```bash
npm install
npm run dev
```
Mở http://localhost:5173 trên Chrome. **Không cần đàn** vẫn thử được: dùng phím máy tính
`A W S E D F T G Y H U J K` = Đô4 → Đô5, `Z`/`X` = hạ/nâng quãng tám, hoặc bấm chuột lên bàn phím trên màn hình.

## Đưa lên tablet (bắt buộc HTTPS để dùng Web MIDI)
1. Tạo repo trên GitHub, push code lên nhánh `main`.
2. Repo → **Settings → Pages → Source: GitHub Actions**. File `.github/workflows/deploy.yml` sẽ tự build.
3. Mở `https://<tên-github>.github.io/<tên-repo>/` bằng Chrome trên tablet → menu ⋮ → **Thêm vào màn hình chính**.

> Truy cập qua IP LAN (http://192.168.x.x:5173) **không** dùng được Web MIDI vì không phải HTTPS.
> Muốn debug trực tiếp trên tablet: cắm tablet vào PC, bật USB debugging, mở `chrome://inspect` → *Port forwarding* 5173 → trên tablet mở `localhost:5173`.

## Kết nối Yamaha CLP-330
- Cáp: **USB-C (OTG) ↔ USB-B** cắm vào cổng **USB [TO HOST]** của đàn.
- Bật đàn trước, cắm cáp, mở app, bấm **Kết nối đàn**, cho phép quyền MIDI.
- Nếu không thấy đàn: xem mục "Kiểm tra kết nối" trong hướng dẫn chat, hoặc dùng bộ chuyển **MIDI 5 chân → USB** (class-compliant).

## Thêm bài tập
- Soạn trong **MuseScore 4** (miễn phí) → *File → Export → MusicXML (.musicxml)*.
- Khuông 1 = tay phải, khuông 2 = tay trái.
- Chép vào `public/songs/` và thêm dòng vào `public/songs/index.json`, hoặc mở trực tiếp bằng nút *Mở MusicXML*.
- `tools/make_songs.py` là script sinh 4 bài mẫu.

## Cấu trúc
```
src/midi.ts       Web MIDI + giả lập bàn phím máy tính
src/score.ts      OpenSheetMusicDisplay, đọc nốt tại con trỏ
src/keyboard.ts   Bàn phím 88 phím
src/metronome.ts  Máy đếm nhịp Web Audio
src/main.ts       Logic chế độ chờ, điều khiển
```

## Giai đoạn tiếp theo (đề xuất)
2. Chế độ chơi theo nhịp + chấm lệch nhịp (ms), lặp đoạn A–B, chỉnh tốc độ; phân tích lực bấm (velocity).
3. Nhật ký bằng IndexedDB + biểu đồ tiến độ; luyện đọc nốt; luyện gam/hợp âm; service worker để chạy offline.
