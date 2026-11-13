# HanPlay · 一起玩，一起学

Trò chơi tập thể cho lớp tiếng Trung. Cướp vàng dùng Phaser 3.90 và phòng realtime WebSocket. Trang mặc định dành cho học viên; `/teacher` yêu cầu Google login và email trong allowlist server.

## Chạy giống classroom-management

Node.js 22+, npm. Cấu hình chính: `wrangler.jsonc`.

```sh
npm install
npm run build
npm run preview
```

Mở **http://localhost:8788**. Dùng cổng 8788 để tránh đụng `classroom-management` trên 8787. Wrangler local chạy đúng Worker, assets và Durable Object sẽ dùng trên Cloudflare. Giáo viên mở `/teacher`; học viên mở `/` hoặc liên kết có `?room=123456`.

Để phát triển có hot reload:

```sh
npm run dev
```

Mở http://localhost:5173. Vite proxy API và WebSocket sang Node adapter cổng 3001; Node đọc `.env` (xem `.env.example`). Cổng 5173 được cố định để không âm thầm đổi origin Google. Đây là adapter phát triển; dùng Wrangler preview để kiểm tra runtime Cloudflare trước khi deploy.

## Deploy

```sh
npm run deploy
```

Lệnh build TypeScript, frontend `dist/client`, Worker `dist/server/index.js`, rồi `wrangler deploy` — cùng mô hình với `D:\Bitronics\classroom-management`. Một Worker phục vụ SPA, API và Durable Object, không cần backend bên ngoài hoặc service binding giữa hai site.

## Google login

- Provider: Google Identity Services, xác minh ID token tại server bằng Google JWKS.
- Giáo viên mặc định: `giathe.bk@gmail.com`, `anhbpt.haui@gmail.com`.
- Client ID công khai nằm trong `wrangler.jsonc`; Node local đọc `.env`. Không cần Google client secret cho luồng GIS này.
- Chỉ thêm email ở phía server; không có API nhập email để tự cấp quyền.
- Google test users và JavaScript origins phải được cấu hình đúng trong Google Cloud. Xem [cấu hình và deploy](docs/DEPLOYMENT.md).

## Kiểm tra

```sh
npm test
npm run build
npm run format:check
npx tsx scripts/smoke-websocket.ts http://localhost:8788
```

Test dùng fixture bộ nhớ, không tạo tài khoản hoặc tự bỏ qua xác thực Google trong app thật.

## Cấu trúc

```text
src/pages/                 Trang học viên, Google login, dashboard, game
src/games/gold-rush/       Phaser scene, assets, audio, UI game
src/lib/                   WebSocket client, Google GIS loader, helpers
shared/                    Types, schemas, bộ câu hỏi mẫu
server/auth.ts             Token verification, sessions, nonce, allowlist
server/room-hub.ts         Luật phòng và quyền chủ phòng dùng chung
server/index.ts            Node adapter cho dev / integration tests
server/main.ts             Entrypoint Node local
cloudflare/worker.ts       Worker + Durable Object + hibernating WebSockets
tests/                     Auth, quyền phòng, game và paste regression
docs/                      Kế hoạch, kiến trúc, triển khai, kiểm tra
```

## Lưu dữ liệu

Cloudflare lưu phòng và phiên giáo viên trong Durable Object; thời hạn phiên 8 giờ, phòng 6 giờ. Node adapter lưu trong RAM và mất khi restart. Bộ câu hỏi tự soạn vẫn lưu trên trình duyệt; có nhập/xuất JSON để sao lưu. Chưa kiểm thử tải đủ 60 điện thoại thực tế.

Xem [kiến trúc](docs/ARCHITECTURE.md), [game engine](docs/GAME_ENGINE.md), [kiểm tra](docs/TESTING.md) và [kế hoạch](docs/PLAN.md).
