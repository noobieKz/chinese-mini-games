# Deploy HanPlay · Chơi cá nhân

Dùng Wrangler theo mẫu classroom-management: một Worker phục vụ bản build SPA. URL chính: https://hanplay-classroom.giathe-bk.workers.dev.

1. `npm run build`
2. `npm run preview` — http://localhost:8788. Không dùng 8787 vì đã dành cho dự án classroom-management.
3. Kiểm tra rồi `npm run deploy` (build + `wrangler deploy`).

`npm run dev` chạy riêng Vite 5173 để sửa giao diện nhanh. Không cần Node API, Google OAuth hoặc WebSocket cho ứng dụng mới. Không cần cấu hình `.env` để chơi.

Các URL `/api/*` cũ trả HTTP 410. Frontend mới không gọi auth, socket hoặc phòng. Durable Object class/binding/migration được giữ lại để tương thích tài nguyên đã deploy; không có luồng public tạo mới hoặc tham gia phòng. Không xóa dữ liệu Cloudflare hay OAuth client cũ trong lần chuyển đổi này.

Các trang game dùng SPA fallback, vì vậy mở trực tiếp `/games/noi-tu` và `/games/ghep-chu` phải trả ứng dụng. `/` và `/games` hiện là thư viện. Khi thêm landing page sau, giữ nguyên `/games` và các link game để học viên vẫn dùng link cũ.

Phaser được tách thành chunk tải khi vào bàn chơi. Font Google có fallback hệ thống. Không có service worker/offline cache: lần tải đầu cần mạng; game đã tải xong không cần API.

Bản Vườn chữ đã deploy ngày 16/11/2026: version d6422f4e-d566-4c5c-8c59-e3d239d542d4. Đã mở game từ thư viện online, ghép cặp và nhận điểm; API auth cũ trả HTTP 410. Ảnh xác minh: docs/screenshots/word-garden-online.jpg.

Bản sửa Pikachu ngày 16/11/2026: cecc7dba-0bef-45d7-a713-ef0706d1e946. Đã kiểm tra online dropdown Bình thường/Khó và ghép cặp không yêu cầu thứ tự. Chữ ô render HTML; rãnh đường nối nằm trong canvas. 22 test đạt.

Bản Chém hoa quả và thư viện ba game ngày 16/11/2026: f8d3df82-7218-42ea-a04d-8195cd3ed2be. Ba trang riêng: `/games/ghep-chu`, `/games/noi-tu`, `/games/chem-hoa-qua`; bỏ dropdown đổi kiểu chơi bên trong hai game nối. Build và 27 test đạt. Đã xác minh thư viện và game trên URL công khai. Ảnh: `docs/screenshots/fruit-slash-library-online.jpg`, `docs/screenshots/fruit-slash-online.jpg`, `docs/screenshots/fruit-slash-result-mobile.jpg`.

Bản cài đặt âm thanh Chém hoa quả ngày 16/11/2026: b0e76187-5db1-44a1-ad3c-6f4d556c797a. Nhạc nền, vung dao, bổ quả và báo đúng/sai mặc định bật; mỗi kênh và âm lượng tổng có bật/tắt, volume, lưu trên thiết bị. Build, format và 29 test đạt. Đã thử thanh âm lượng, bật/tắt, nút nghe thử không có lỗi console, tải lại giữ thiết lập, mở cài đặt tạm dừng câu hỏi và bố cục 375px. Bản online đã xác minh tất cả kênh bật mặc định. Ảnh: `docs/screenshots/fruit-audio-settings-online.jpg`. Chưa nghe kiểm chứng trực tiếp trên loa hoặc thiết bị cảm ứng thật.

Bản nhạc Lotus Pond và tiếng dao “vút” ngày 16/11/2026: 31a82042-b447-41d4-acf3-a11afd7b30bb. Thay nhạc oscillator bằng asset loop 64 giây (~1 MB) của BiteMe Games, mặc định nhạc 18%, giữ các tùy chỉnh người dùng đã lưu. Nguồn/giấy phép: `public/audio/CREDITS.md`. Dao dùng sweep bandpass và sine glide, bổ quả ngắn và nhẹ hơn. Build, format và 29 test đạt; test bổ sung xác minh không chồng loop, chỉ tải nhạc một lần và tiếp tục đúng vị trí sau khi đổi tab. Preview tải MP3 HTTP 200, các nút nghe thử không ghi lỗi console; bản public đã mở đúng track và đặt nhạc 18% trên trình duyệt hiện tại. Ảnh: `docs/screenshots/fruit-lotus-whoosh-online.jpg`. Chưa nghe kiểm chứng chất âm trực tiếp qua loa.

Bản đổi nhạc nền Pikachu ngày 16/11/2026: 46ce9d2a-bd34-4cdc-b9ab-670a874c95f8. Hai game Pikachu (Ghép chữ, Nối từ) dùng chung Lotus Pond với Chém hoa quả thay cho Eastern Thought 3,6 MB. Build và 29 test đạt. Bản online `/games/noi-tu` tải `lotus-pond-loop.mp3` HTTP 200, không lỗi console. `eastern-thought.mp3` vẫn được upload nhưng không game nào tải. Chưa nghe kiểm chứng trực tiếp qua loa.

Bản chỉnh UI/UX và sửa P0/P1 ngày 16/11/2026: f9edd1ff-28aa-43d7-be9c-b79611ba2c15. Thư viện: thẻ thứ ba trải rộng ở khổ 2 cột, bỏ nhãn thừa trên header, tên "Nối cặp" thay "Pikachu", trang 404. Nối cặp: bàn vừa một màn hình trên laptop, 6 công cụ chữ ngắn xếp lưới đều, logo hỏi trước khi rời lượt, không trừ điểm từ có thật ngoài bàn (医生, 天天…), kỷ lục theo cấu hình, 20 giây mỗi cặp. Chém hoa quả: kỷ lục theo bộ + thời gian, nhạc nền Dragon Dance (CC0). Cả hai game: icon loa cho cài đặt âm thanh. Build, format và 30 test đạt. Bản online: thư viện hiện "NỐI CẶP", `/games/khong-co` ra trang 404, hàng công cụ đúng chữ mới, `dragon-dance-loop.mp3` HTTP 200, không lỗi console. Chưa nghe kiểm chứng nhạc qua loa.
