# HanPlay · Game tiếng Trung

Ứng dụng chơi cá nhân, mở link là chơi, không tài khoản/mã phòng. React + TypeScript cho điều khiển và chữ sắc nét; Phaser 3 cho sân chơi, đồ họa, chuyển động và va chạm. Deploy một Cloudflare Worker chứa static SPA qua Wrangler.

## Chạy

- `npm install`
- `npm run dev`: Vite localhost:5173, không cần backend.
- `npm run build`: TypeScript strict, Vite frontend và esbuild Worker.
- `npm run preview`: bản build ở localhost:8788; không dùng 8787 của classroom-management.
- `npm run deploy`: build và Wrangler deploy.
- `npm test`, `npm run format:check`.

Website chính: https://hanplay-classroom.giathe-bk.workers.dev.

## Ba lối vào trong thư viện

1. `/games/ghep-chu`: **Ghép chữ thành từ**, nối các chữ Hán thành từ. Bình thường không yêu cầu thứ tự; Khó yêu cầu đúng trước sau.
2. `/games/noi-tu`: **Nối từ với nghĩa**, nối từ Hán với nghĩa tiếng Việt; không yêu cầu thứ tự chọn.
3. `/games/chem-hoa-qua`: **Chém hoa quả**, sân Phaser với vuốt/chuột/phím 1–2–3, ba bộ thử thách, 12 câu mỗi lượt, combo và ôn từ sau lượt.

Hai trò nối (hiển thị là **Nối cặp**) dùng chung engine và luật nối kiểu Onet để dễ bảo trì, nhưng được chọn riêng từ thư viện; không có dropdown chuyển kiểu bên trong. Alias `/games/pikachu` và `/games/pikachu?mode=meaning` vẫn hoạt động cho link cũ.

`/` và `/games` hiện cùng là thư viện. Sau này thay `/` bằng landing page khóa học mà giữ nguyên các link game.

## Cấu trúc

- `src/App.tsx`: thư viện ba lối vào và điều hướng có Back/Forward.
- `src/games/word-garden`: Pikachu, gồm scene, luật độc lập, layout, nội dung và React HUD.
- `src/games/fruit-slash`: Chém hoa quả, gồm scene, art thủ tục, model lượt chơi, ngân hàng câu hỏi và lớp điều khiển.
- `src/components/Select.tsx`: dropdown chung theo component của classroom-management.
- `tests`: luật game và hồi quy code cũ.
- `cloudflare/worker.ts`: phục vụ static; API đăng nhập/phòng cũ trả 410.

Nội dung là bộ từ mẫu chọn lọc, không bao phủ toàn bộ HSK. Không yêu cầu cấu hình Google OAuth hoặc API để chơi.

Các file `LegacyApp.tsx`, phần `src/pages`, `server`, `shared`, `gold-rush` là bản lớp học cũ được giữ tham khảo, không import vào entrypoint hiện tại. Durable Object cũ vẫn giữ binding/migration tương thích deploy trước; frontend mới không gọi nó.

Xem `docs/WORD_GARDEN.md`, `docs/FRUIT_SLASH.md`, `docs/DESIGN.md`, `docs/DEPLOYMENT.md`.
