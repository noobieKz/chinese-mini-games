# Kiến trúc HanPlay

## Vai trò và giao diện

`/` là cổng học viên, không cần tài khoản. Nhập mã phòng và tên để chơi; không có UI tạo phòng hay soạn câu hỏi. `/teacher` là trang Google login, sau xác thực mới hiển thị dashboard / câu hỏi. Màn game có HUD riêng theo host hoặc player, dùng Phaser cho scene và React cho chữ / điều khiển truy cập được bằng bàn phím.

Ẩn UI không phải ranh giới bảo mật. `server/room-hub.ts` bắt buộc identity giáo viên ở create, start, finish và resume quyền host. Room gắn `teacherId` lấy từ Google `sub`, vì thế có host token vẫn chưa đủ để chiếm quyền, kể cả một giáo viên được allowlist khác.

## Runtime

Worker `cloudflare/worker.ts` phục vụ API và chuyển sang `ClassroomHub`, một SQLite-backed Durable Object. Static assets / SPA phục vụ qua binding `ASSETS`, chỉ `/api/*` chạy Worker trước. Cấu hình và migrations nằm trong `wrangler.jsonc`; build ra `dist/client` và `dist/server/index.js`.

`ClassroomHub` phục hồi phòng từ storage và connection từ serialized WebSocket attachments khi wake. `acceptWebSocket` cho hibernation, không dùng interval giữ Worker chạy. Alarm xử lý deadline và hết hạn phòng; mỗi mutation lưu lại state. Các WebSocket message được xử lý tuần tự trong Durable Object để tránh race khi đọc phiên và ghi state.

Node adapter dùng cùng AuthService và RoomHub qua `ws`, phục vụ dev / tests; cổng 3001 phía sau Vite 5173. Bản Wrangler local ở 8788 dùng đúng runtime triển khai và storage riêng trên máy.

## Xác thực Google

1. Client POST `/api/auth/challenge`: server tạo nonce, cookie challenge HttpOnly và record 10 phút.
2. Google GIS nhận nonce và trả ID token qua callback trình duyệt.
3. Client POST token tới `/api/auth/google`. Server tiêu thụ challenge nguyên tử, xác minh chữ ký Google JWKS, issuer, audience, expiry, nonce, `email_verified`, `sub` và email allowlist.
4. Server tạo opaque session ngẫu nhiên, cookie HttpOnly / SameSite=Lax / Secure trên HTTPS. Session TTL 8 giờ, không lưu Google access/refresh token.
5. Mỗi lệnh host đọc lại session và allowlist; WebSocket không tin role hay email do client gửi. POST logout yêu cầu origin được cho phép và CSRF token, xóa phiên và báo client kết thúc quyền giáo viên.

Phía Node dùng MemoryAuthStore; Durable Object dùng storage transaction để challenge không bị replay đồng thời. Không có endpoint dev-login, mã bí mật hoặc tự khai email để bỏ qua Google.

## Protocol

Một WebSocket cùng origin tại `/api/socket`. Client gửi `{ id, event, data }`; server ack `{ id, reply }` hoặc push `{ event, data }`.

- `create { bank, teamCount, duration }`, `join { code, name }` → `{ code, token }`.
- `resume { code, token }`, `start {}`, `finish {}`, `leave {}`.
- `answer { index, option }` → `{ correct, correctAnswer }`.
- `claim { target? }` → `{ reward, amount }`.
- Push: `room`, `replaced`, `room-expired`, `auth-required`.

Client timeout 8 giây, reconnect backoff tới 10 giây, không tự retry mutation. Token tham gia lưu trong localStorage (hết hạn sau 6 giờ) nên học viên lỡ đóng tab vẫn mở lại web và chơi tiếp. Mỗi view `room` kèm `serverTime` để đồng hồ đếm ngược không lệch theo giờ điện thoại; server chỉ gửi lại view khi nội dung thay đổi. Durable Object chỉ ghi các phòng vừa thay đổi. Google cookie tách biệt, chỉ server đọc được. Server chỉ gửi câu hỏi hiện tại và đáp án sau khi chốt lựa chọn, không broadcast bank / host token.

## Giới hạn

Một Durable Object điều phối app v1; chưa đo tải 60 máy thực tế hoặc chia shard theo phòng. Bộ tự soạn chưa có database riêng. Session / challenge hết hạn bị từ chối; record cũ có thể còn trong storage cho đến thao tác dọn hoặc truy cập. Google test mode cho phép test users đã đăng ký; allowlist server vẫn bắt buộc dù sau này publish Google app.
