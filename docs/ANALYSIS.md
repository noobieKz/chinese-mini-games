# Phân tích dự án HanPlay · 16/11/2026

> Tài liệu chỉ phân tích, **không sửa code**. Dựa trên mã nguồn trong working tree hiện tại (gồm cả file chưa commit), kết quả `npm test`, `tsc --noEmit`, `prettier --check` và `vite build`.

---

## 1. Website làm gì?

**HanPlay** là website mini-game luyện **từ vựng tiếng Trung HSK 1–2** cho người Việt. Mở link là chơi, không cần tài khoản, chạy hoàn toàn trên trình duyệt (điện thoại, máy tính).

URL đang chạy: `https://hanplay-classroom.giathe-bk.workers.dev`

| Đường dẫn                       | Trò chơi                             | Cách chơi                                                                                                                                                  |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/games`                   | Thư viện game                        | Trang giới thiệu + 3 thẻ game                                                                                                                              |
| `/games/ghep-chu`               | **Ghép chữ thành từ** (kiểu Pikachu) | Nối 2 chữ Hán thành 1 từ (朋 + 友 = 朋友). Đường nối ngang/dọc, tối đa 2 lần rẽ. Mức _Bình thường_ không cần đúng thứ tự, _Khó_ bắt buộc chữ đầu → chữ sau |
| `/games/noi-tu`                 | **Nối từ với nghĩa** (kiểu Pikachu)  | Nối từ Hán với nghĩa tiếng Việt (你好 ↔ xin chào)                                                                                                          |
| `/games/chem-hoa-qua`           | **Chém hoa quả**                     | 3 quả bay lên, mỗi quả mang 1 đáp án; vuốt/chuột/phím 1-2-3 để chém quả đúng. 12 câu/lượt, có combo                                                        |
| `/games/pikachu[?mode=meaning]` | Alias cũ                             | Giữ tương thích link cũ                                                                                                                                    |

Tính năng chung: HUD điểm/thời gian, tạm dừng (tự dừng khi đổi tab), hướng dẫn, toàn màn hình, cài đặt âm thanh theo kênh (lưu `localStorage`), màn kết quả + ôn từ, hỗ trợ `prefers-reduced-motion`, điều khiển bằng bàn phím.

Luật điểm:

- **Pikachu**: đúng +10, sai −2, gợi ý −3 (3 lượt), "Nối giúp" 1 lần (0 điểm), gợi ý pinyin miễn phí, đảo ô miễn phí, tự đảo khi hết đường. Chế độ Thư thả hoặc 4 phút. Kỷ lục lưu trên máy.
- **Chém hoa quả**: đúng +10 (+2 mỗi bậc combo, tối đa +8), sai −2, hết giờ 0. Thời gian mỗi câu 10/15/20/30 giây hoặc Thư thả. 3 bộ: HSK 1, HSK 2, Ghép động từ – danh từ (打篮球, 看电视…).

---

## 2. Kiến trúc & công nghệ

```
Trình duyệt
 ├─ React 19 (App.tsx: router tự viết bằng history API)
 │   ├─ WordGarden.tsx  ── lazy import ──► GardenScene.ts (Phaser 3)
 │   │                                     rules.ts (tìm đường ≤2 lần rẽ), layout.ts
 │   ├─ FruitSlash.tsx  ── lazy import ──► FruitScene.ts (Phaser 3) + art.ts (vẽ canvas thủ tục)
 │   │                                     round.ts (model lượt chơi), questions.ts
 │   ├─ audio/ (GameAudio: Web Audio mixer, nhạc MP3 + hiệu ứng tổng hợp)
 │   └─ components/Select.tsx (dropdown dùng chung)
 └─ Nội dung: word-garden/vocabulary.ts (36 từ), fruit-slash/questions.ts (12 cụm ghép)

Cloudflare Worker (cloudflare/worker.ts)
 ├─ Phục vụ static SPA (dist/client), fallback SPA
 ├─ /api/* → HTTP 410 (đã ngừng chế độ lớp học)
 └─ Vẫn export Durable Object ClassroomHub (legacy) để giữ binding/migration
```

Nguyên tắc thiết kế tốt đang áp dụng:

- **Tách luật khỏi engine**: `rules.ts`, `round.ts` là logic thuần, test được bằng Node; Phaser chỉ trình bày.
- **Chữ bằng DOM, đồ họa bằng canvas**: chữ Hán sắc nét ở mọi độ phân giải.
- **Thời gian theo wall-clock** (`setTimeout`, `performance.now()`), không phụ thuộc frame bị throttle.
- Chống input xuyên câu (question ID, khoảng khóa 300ms, một stroke thuộc một câu).
- Phaser được tách chunk, chỉ tải khi vào game.

### Trạng thái kiểm tra (chạy ngày 16/11/2026)

| Kiểm tra           | Kết quả                                                 |
| ------------------ | ------------------------------------------------------- |
| `npm test`         | **29/29 đạt** (trong đó 4 file test là của code legacy) |
| `tsc --noEmit`     | Đạt                                                     |
| `prettier --check` | Đạt                                                     |
| `vite build`       | Đạt, có cảnh báo chunk > 500 kB                         |

Kích thước bundle:

| File                                           | Kích thước                                 | gzip     |
| ---------------------------------------------- | ------------------------------------------ | -------- |
| `index-*.js` (React + UI + 2 game shell)       | 299 kB                                     | 92 kB    |
| `rules-*.js` (**thực chất là Phaser** + rules) | 1 484 kB                                   | 341 kB   |
| `GardenScene-*.js` / `FruitScene-*.js`         | 9 kB / 15 kB                               | 3 / 6 kB |
| CSS                                            | 50 kB                                      | 11 kB    |
| `eastern-thought.mp3` (nhạc Pikachu)           | **3,6 MB**                                 | —        |
| `lotus-pond-loop.mp3` (nhạc Chém hoa quả)      | 1,0 MB                                     | —        |
| Worker bundle                                  | **796 kB** (chủ yếu là code server legacy) | —        |

---

## 3. Vấn đề cần xử lý (theo mức ưu tiên)

### 🔴 P0 — Rủi ro cao, nên xử lý ngay

1. **Toàn bộ sản phẩm đang chạy chưa được commit vào git.**
   `src/games/word-garden/`, `src/games/fruit-slash/`, `src/audio/`, `src/components/Select.tsx`, `public/audio/`, test mới, docs mới… đều là file _untracked_; `App.tsx`, `worker.ts`, `package.json` đang _modified_. Bản production (đã deploy nhiều version ngày 16/11) không thể tái tạo từ git. Mất máy/ổ đĩa = mất sản phẩm.
   → Commit ngay (có thể tách: game mới / audio / docs), push lên remote.

2. **Luật Ghép chữ phạt cả những từ có thật.**
   `matches()` trong `src/games/word-garden/rules.ts` chỉ chấp nhận từ có trong danh sách 18 từ của bàn. Học viên ghép một từ đúng tiếng Trung nhưng không nằm trong danh sách vẫn bị **−2 điểm** và báo "Chưa nối được". Ví dụ với bộ HSK 1 hiện tại:
   - 医 (医院) + 生 (学生) = **医生** (bác sĩ — chính là từ HSK 1)
   - 天 + 天 (từ 今天/明天/昨天/天气) = **天天** (mỗi ngày)
   - 中 (中国) + 医 (医院) = **中医**; 中 + 学 = **中学**
   - 好 (你好) + 友 (朋友) = **好友**; 老 (老师) + 友 = **老友**; 电 + 影 → 影 + 院 = **影院**…

   Đây là lỗi sư phạm: game đang dạy sai cho người học giỏi. Hướng xử lý (chọn một):
   - Khi tạo bàn, loại các tổ hợp chữ có thể tạo từ có nghĩa ngoài danh sách (cần một từ điển nhỏ các từ 2 chữ phổ biến); hoặc
   - Chấp nhận từ có thật nhưng không ghép (thông báo "医生 là từ đúng, nhưng chưa có trong bài này", **không trừ điểm**).

3. **Bấm logo trong game làm mất lượt chơi không cần xác nhận.**
   `src/games/word-garden/WordGarden.tsx:204` — `<a href="/games" className="garden-brand">` không chặn sự kiện, gây **reload toàn trang** và bỏ qua hộp "Rời lượt chơi này?" mà nút Back có. Tương tự ở thư viện (`App.tsx`), các link brand reload trang thay vì dùng `navigate()`.

### 🟠 P1 — Ảnh hưởng trải nghiệm / chất lượng nội dung

4. **Nội dung quá mỏng.** Chỉ có **36 từ** (18 HSK 1 + 18 HSK 2) và **12 cụm ghép**. Chém hoa quả bộ "Ghép từ" luôn ra đúng 12 câu giống nhau (chỉ đảo thứ tự); bộ HSK chọn 12/18 từ → sau 2–3 lượt người chơi đã thuộc đáp án theo hình dạng chữ. Nhóm luyện chỉ đặt tên "Nhóm 1/2/3" (cắt theo thứ tự mảng), không gắn với bài học nào.

5. **Chưa rõ chuẩn HSK.** Code ghi "HSK 1/2" nhưng không nói theo HSK 2.0 (6 cấp) hay HSK 3.0 (9 cấp, 2021). Vài từ có cấp khác nhau giữa hai chuẩn (ví dụ 可以). Cần chốt một chuẩn và đối chiếu danh sách chính thức.

6. **Kỷ lục không công bằng.** `localStorage` key `hanplay-best-${mode}` (`WordGarden.tsx:66`, `:172`) dùng chung cho mọi cấu hình: bàn 18 cặp luôn cho điểm cao hơn bàn 4 cặp, HSK 1 lẫn HSK 2, Thư thả lẫn 4 phút. Nên tách theo `mode + level + pairs + timed`. **Chém hoa quả hoàn toàn không lưu kỷ lục.**

7. **Thời gian cố định 4 phút** (`WordGarden.tsx:61`, `240`) cho mọi kích thước bàn: 4 cặp thì quá dư, 18 cặp thì gắt. Nên tỉ lệ theo số cặp.

8. ~~**Nhạc nền nặng và bật mặc định.** `eastern-thought.mp3` 3,6 MB tải ngay lần chạm đầu tiên.~~ **Đã xử lý 16/11/2026:** Pikachu chuyển sang dùng chung Lotus Pond (1 MB, loop 60s, CC0) với Chém hoa quả. File `eastern-thought.mp3` vẫn còn trong `public/audio` nhưng không game nào tải; có thể xoá để giảm kích thước deploy.

9. **Không có trang 404.** Mọi đường dẫn sai (`/games/abc`, `/xyz`) đều hiện thư viện; người dùng không biết link hỏng.

10. **Game chưa có phát âm.** Với app học ngoại ngữ, nghe được cách đọc là giá trị cốt lõi. Có thể dùng Web Speech API (`speechSynthesis`, `lang="zh-CN"`) — không tốn băng thông, không cần server — để đọc từ khi ghép đúng / ở màn ôn tập.

11. **Chưa thử trên thiết bị thật.** Chính docs ghi nhận: chưa thử cảm ứng trên điện thoại thật, chưa đo FPS/bộ nhớ, chưa nghe kiểm tra âm thanh qua loa. Phaser WebGL trên Android tầm thấp cần được kiểm tra.

### 🟡 P2 — Kỹ thuật, bảo trì, dọn dẹp

12. **Code legacy chiếm phần lớn repo nhưng không dùng.** `src/LegacyApp.tsx`, `src/pages/*`, `src/games/gold-rush/*`, `src/styles.css` (2 641 dòng), `server/*`, `shared/*`, `scripts/smoke-websocket.ts`, 4 file test legacy, script `dev:legacy`, proxy `/api` trong `vite.config.ts`. Hệ quả:
    - Worker bundle 796 kB vì `worker.ts` import `server/auth`, `server/room-hub` (jose, zod…) chỉ để giữ class Durable Object.
    - `dependencies` vẫn có `express`, `ws`, `jose`, `zod` dù frontend không dùng.
    - `tsconfig.json` vẫn type-check `server`, `shared`.
    - Đề xuất: chuyển code legacy sang branch/tag `legacy-classroom`, thay `ClassroomHub` bằng một **class stub rỗng** để giữ binding (không xoá Durable Object/dữ liệu trên Cloudflare khi chưa quyết định).

13. **`wrangler.jsonc` chứa dữ liệu cá nhân và cấu hình thừa.** Biến `TEACHER_EMAILS` (email cá nhân), `GOOGLE_CLIENT_ID`, `ALLOWED_ORIGINS` chỉ phục vụ luồng đăng nhập đã bỏ. Nên gỡ khỏi file đã commit. Tên worker `hanplay-classroom` không còn đúng sản phẩm (đổi tên sẽ đổi URL — cân nhắc dùng custom domain).

14. **Chunk Phaser bị đặt tên `rules-*.js`.** Do `rules.ts` được dùng chung bởi GardenScene và FruitScene (qua `questions.ts` → `shuffle`), Rollup gộp Phaser vào chunk tên "rules". Không sai, nhưng khó đọc khi debug; có thể dùng `manualChunks: { phaser: ['phaser'] }` và tách `shuffle` sang `src/lib`.

15. **Font Google tải qua `@import` trong CSS** (`garden.css:1`) → chuỗi chặn render CSS → CSS font → file font. Nên chuyển sang `<link rel="preconnect">` + `<link rel="stylesheet">` trong `index.html`, giảm bớt các weight không dùng (đang tải 8 weight Be Vietnam Pro + 5 weight Noto Sans SC). Noto Sans SC rất nặng; cân nhắc tự host bản subset chỉ chứa các chữ Hán trong bộ từ.

16. **FruitScene cập nhật React ~11 lần/giây kể cả khi đứng ở màn chờ** (`emit()` trong `update()`, mỗi lần tạo `new FruitRound([],15).view()` và copy mảng `results`). Tốn pin trên điện thoại; nên chỉ emit khi state đổi hoặc khi đang `playing`.

17. **Mỗi lần đổi tùy chọn/ván mới tạo lại cả `Phaser.Game`** (WordGarden `useLayoutEffect` phụ thuộc `level, round, pairs, lesson, difficulty`). Hoạt động đúng nhưng tạo/huỷ WebGL context liên tục; nên tái sử dụng game và chỉ restart scene.

18. **Tài liệu lệch với code.**
    - `docs/FRUIT_SLASH.md` nhắc `audio.ts`, `useFruitAudio.ts` — thực tế là `src/audio/GameAudio.ts`, `useGameSound.ts`.
    - `docs/DESIGN.md` ghi "Âm thanh tùy chọn, **mặc định tắt**" — code (`readAudioSettings`) **mặc định bật** tất cả kênh.
    - `docs/GAME_ENGINE.md` mô tả game Gold Rush legacy (và nhắc Socket.IO, trong khi code dùng `ws`) nhưng không ghi là legacy.
    - Số test trong các docs mâu thuẫn (19 / 22 / 27 / 29).
    - `public/audio/CREDITS.md` có hai heading `## Sound effects` (một cái rỗng).
    - Docs dạng "nhật ký deploy" lẫn với tài liệu thiết kế; nên tách `CHANGELOG.md`.

19. **Thiếu công cụ chất lượng.** Không có ESLint (dù code có comment `eslint-disable`), không có CI (GitHub Actions chạy test/build), không có test E2E (Playwright) — mọi kiểm tra trình duyệt hiện làm tay. Không có test cho component React.

20. **Thiếu `.gitattributes`.** Git cảnh báo LF → CRLF trên Windows; nên thêm `* text=auto eol=lf` để tránh diff rác.

21. **SEO / chia sẻ.** `index.html` không có favicon, Open Graph (`og:title`, `og:image`), `manifest.webmanifest`. Link gửi qua Zalo/Facebook sẽ không có ảnh xem trước. `document.title` đổi theo route nhưng `meta description` không đổi.

22. **Header bảo mật.** `public/_headers` thiếu `Content-Security-Policy`, `Permissions-Policy`; `Cross-Origin-Opener-Policy: same-origin-allow-popups` là di sản của Google login. `X-Frame-Options: DENY` sẽ chặn nhúng game vào landing page/LMS sau này — cần quyết định trước.

23. **Lặt vặt trong dữ liệu**: id `'water'` cho từ 水果 (trái cây) ở `vocabulary.ts:21`; cụm `打扫` là đáp án 2 chữ duy nhất giữa các lựa chọn 1 chữ → lộ đáp án bằng độ dài; `package.json` để trống `description`, `author`, license `ISC` cho dự án `private`.

---

## 4. Đề xuất cải tiến sản phẩm

### Học tập (giá trị cốt lõi)

- **Phát âm** bằng Web Speech API khi ghép đúng và ở màn ôn tập; nút 🔊 cạnh mỗi từ trong sổ tay.
- **Ôn từ sai**: lưu các từ trả lời sai trên máy, có chế độ "Ôn lại từ hay sai" (spaced repetition đơn giản kiểu Leitner).
- **Tùy chọn hiện pinyin** trên ô / quả cho người mới.
- **Nhiều dạng câu hỏi hơn** cho Chém hoa quả: nghe âm chọn chữ, nhìn chữ chọn pinyin, chọn thanh điệu, chọn lượng từ (个/本/张…).
- **Bộ từ theo bài học** của giáo trình thật (ví dụ Giáo trình chuẩn HSK / Hán ngữ), có tên bài thay vì "Nhóm 1/2/3"; mở rộng HSK 3.

### Nội dung & vận hành

- Tách từ vựng sang file **JSON** (`content/hsk1.json`…) với schema kiểm tra (zod đã có sẵn trong deps) để giáo viên bổ sung không cần đụng code. `BankEditor.tsx` legacy có thể tái sử dụng làm công cụ soạn.
- Cho phép mở game với bộ từ qua URL (`/games/noi-tu?set=bai-3`) để giáo viên gửi link theo bài.
- Thêm **Cloudflare Web Analytics** (không cookie) để biết game nào được chơi, tỉ lệ hoàn thành.

### Trải nghiệm

- Kỷ lục theo từng cấu hình + lịch sử vài lượt gần nhất; kỷ lục cho Chém hoa quả.
- Thời gian Pikachu tỉ lệ theo số cặp; hiển thị combo bonus nhất quán giữa hai game (Pikachu đang đếm combo nhưng không thưởng điểm).
- Trang 404 thân thiện có nút về thư viện.
- PWA (manifest + service worker cache asset) để chơi được khi Wi-Fi lớp học chập chờn.
- Chế độ nhiều màu quả / vị trí quả ngẫu nhiên hơn trong Chém hoa quả (hiện quả luôn cùng loại ở cùng làn).

---

## 5. Lộ trình gợi ý

| Giai đoạn    | Việc                                                                                                                            | Ước lượng    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **Ngay**     | Commit + push toàn bộ code; thêm `.gitattributes`; sửa link logo trong game                                                     | < 0,5 ngày   |
| **Tuần 1**   | Sửa luật "từ có thật" ở Ghép chữ; kỷ lục theo cấu hình; timer theo số cặp; trang 404; nén nhạc; cập nhật docs cho khớp code     | 1–2 ngày     |
| **Tuần 2**   | Dọn legacy sang branch, stub Durable Object, gỡ deps/biến thừa; ESLint + CI (test, build, format); Playwright smoke test 3 game | 2 ngày       |
| **Tuần 3–4** | Phát âm TTS; nội dung JSON + mở rộng từ vựng theo bài; ôn từ sai; favicon/OG/PWA; analytics                                     | 4–6 ngày     |
| **Sau đó**   | Landing page khóa học ở `/`; thêm dạng câu hỏi; HSK 3; công cụ soạn bộ từ cho giáo viên                                         | theo nhu cầu |

---

## 6. Tóm tắt

**Điểm mạnh:** kiến trúc gọn và rõ (logic thuần tách khỏi Phaser, chữ DOM sắc nét), xử lý nhiều edge case tốt (tab ẩn, resize, input xuyên câu, reduced motion, chunk cũ sau deploy), giao diện chăm chút, test/type/format đều đạt, deploy đơn giản trên Cloudflare.

**Điểm yếu chính:** sản phẩm chưa nằm trong git; luật Ghép chữ phạt cả từ đúng; nội dung quá ít (36 từ) và chưa có phát âm; repo còn nhiều code legacy làm nặng worker, deps và gây nhầm lẫn; docs lệch với code; chưa có CI/E2E và chưa thử trên thiết bị thật.
