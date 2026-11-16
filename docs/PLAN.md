# Kế hoạch HanPlay

## Đã triển khai · 16/11/2026

- Chuyển sản phẩm sang game chơi cá nhân; bỏ luồng đăng nhập/phòng khỏi entrypoint.
- Thư viện `/games` và hai game `/games/noi-tu`, `/games/ghep-chu`.
- Phaser vẽ bàn ô nổi, đường nối, chuyển động ghép đúng và hạt sáng.
- React quản lý HUD, điều khiển, chọn bộ từ/nhịp chơi, sổ tay, bắt đầu/tạm dừng/kết quả.
- Bộ từ mẫu HSK 1–2 tách khỏi luật và scene.
- Bàn 6×4 desktop, 4×6 mobile; đổi kích thước giữ tiến độ.
- Kiểm thử thuật toán và thử lượt hoàn chỉnh bằng browser; deploy cùng Worker hiện có bằng Wrangler.

## Sau này, khi có yêu cầu

- Landing page giới thiệu khóa học tại `/`, giữ thư viện ở `/games`.
- Bổ sung bộ từ theo bài học thực tế và kiểm duyệt nội dung.
- Game khác như chém hoa quả; không hiển thị nút chơi cho tính năng chưa được xây dựng.
- Dọn code legacy sau khi quyết định không cần giữ tham khảo. Không tự xóa tài nguyên cloud hay dữ liệu cũ.
