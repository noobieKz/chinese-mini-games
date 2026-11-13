# Cấu hình và deploy HanPlay

## Quy trình đã chọn

Theo mẫu `D:\Bitronics\classroom-management`: Wrangler deploy một Worker chứa static SPA + API. Durable Object đảm nhiệm phòng realtime và auth storage.

```sh
npm run build
npm run preview
# kiểm tra local đạt rồi:
npm run deploy
```

Preview: `http://localhost:8788`. Cổng 8787 dành cho app classroom-management đang có trên máy. `npm run dev` vẫn hỗ trợ Vite `http://localhost:5173` + Node `3001` khi sửa UI nhanh.

## Tài nguyên

- Cloudflare account: `055aaf3c6be57fe42c3a6bbc20b8d854`.
- Worker chính: `hanplay-classroom`.
- URL dự kiến theo account subdomain: `https://hanplay-classroom.giathe-bk.workers.dev` (chỉ xem là đã deploy khi Wrangler trả URL và kiểm tra HTTP đạt).
- Durable Object: `ClassroomHub`, SQLite migration `v1`, instance `hanplay-v1`.
- Google Cloud project: `onyx-silo-514608-b1` / **HanPlay Classroom**.
- OAuth Web client: **HanPlay Classroom · Web + localhost**.

Giai đoạn chuẩn bị ban đầu đã tạo Worker `hanplay-realtime` và một Pages project rỗng `hanplay-classroom`; bản chính thức dùng mô hình Worker một site theo yêu cầu sau cùng. Hai tài nguyên chuẩn bị không được dùng làm URL bàn giao và chưa tự xóa để tránh thao tác phá hủy ngoài phạm vi.

## Google Identity Services

Web dùng GIS popup và POST ID token tới API cùng origin. Không dùng authorization-code redirect nên không cần redirect URI hoặc client secret trong server. Chỉ cần Google Web client ID và **Authorized JavaScript origins** chính xác:

```text
https://hanplay-classroom.giathe-bk.workers.dev
http://localhost:5173
http://localhost:8788
http://127.0.0.1:8788
http://localhost:3001
```

Không dùng wildcard. Đổi host/port phải cập nhật cả origins Google và `ALLOWED_ORIGINS` server. Google có thể cần thời gian để áp dụng thay đổi. Đăng nhập từ IP LAN không nằm trong danh sách trên; học viên vào phòng từ LAN không cần Google login.

Google Audience đang Testing, thêm riêng hai test users `giathe.bk@gmail.com` và `anhbpt.haui@gmail.com`. Google có thể hiển thị email đầu theo dạng `GiaThe.BK@gmail.com`; server so sánh không phân biệt hoa/thường. Không bấm Publish app để mở rộng đối tượng nếu chưa có yêu cầu.

## Biến môi trường

- `GOOGLE_CLIENT_ID`: ID công khai, có trong `wrangler.jsonc`. Node đọc `.env`; `.env.example` là mẫu.
- `TEACHER_EMAILS`: CSV allowlist phía server; ban đầu gồm hai email trên.
- `ALLOWED_ORIGINS`: CSV origin được gửi auth POST / WebSocket. Bản production trong Wrangler gồm URL online và localhost. Local `.env` chứa localhost.

Wrangler dev tự đọc `.env`, vì vậy `.env` phải có origin `8788` để không ghi đè mất quyền origin preview. Không đưa Google client secret hoặc ID token vào frontend, log, screenshot hay tài liệu. Cookie và auth record được tạo bởi server; không cần biến SESSION_SECRET vì session là opaque token lưu tại server.

## Kiểm tra sau deploy

1. `/` hiển thị form học viên; `/teacher` hiển thị Google login.
2. `/api/health` trả `runtime: durable-object`; `/api/auth/session` anonymous trả `teacher: null` và đúng clientId.
3. Chạy smoke WebSocket với origin thật: `npx tsx scripts/smoke-websocket.ts https://<deployed-host>`; anonymous create phải bị từ chối.
4. Chủ tài khoản tự đăng nhập Google ở online và localhost; xác nhận dashboard, tạo phòng và logout. Không đánh đồng việc nút Google xuất hiện với việc login thật đã được xác minh.
5. Học viên vào phòng không cần tài khoản. Một giáo viên khác hoặc người chỉ có host token không thể chiếm phòng.

Tham chiếu: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Workers static assets](https://developers.cloudflare.com/workers/static-assets/), [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
