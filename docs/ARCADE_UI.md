# Giao diện arcade

HanPlay dùng sảnh chọn game và sân chơi vừa viewport (`100dvh`), không còn landing page hoặc sidebar trong lúc chơi. Luật, ngân hàng bài, URL chia sẻ và kỷ lục vẫn giữ nguyên.

- `src/arcade/Lobby.tsx`: sảnh bốn game, liên kết thật để mở tab mới, hướng dẫn và toàn màn hình.
- `src/arcade/GameTopbar.tsx`: nút về sảnh, tên game, kỷ lục và các thao tác chung.
- `src/arcade/ArcadeDialog.tsx`: bảng nổi dùng native dialog, giữ focus và đóng bằng Escape.
- `src/arcade/arcade.css`: nền sân, HUD, bảng nổi và bố cục theo chiều rộng/chiều cao.
- Ghép chữ/Nối nghĩa: chọn bài và độ khó ở nút thiết lập; sổ tay mở riêng, tự dừng bàn và đồng hồ khi xem. Chỉ đổi thiết lập trước lượt hoặc sau khi kết thúc.
- Chém hoa quả/Rồng săn chữ: chọn bài tại màn bắt đầu; giữ các điều khiển hiện có.
- Màn ngang thấp đặt HUD và công cụ hai bên bàn nối/rồng. Màn dọc dùng HUD trên và các nút dưới bàn. Chỉ nội dung trong bảng nổi cuộn khi cần.
- Dropdown trong native dialog được portal vào chính dialog để không bị lớp nền vô hiệu hóa.

Kiểm tra UI: sảnh, vào cả bốn game, đổi kích thước bàn trong bảng nổi, tạm dừng/tiếp tục, mở sổ tay, kết thúc/xem kết quả và cảnh báo Back. Kiểm tra desktop 1280×720, điện thoại 390×844, màn nhỏ 320×568 và ngang 844×390. Chạy `npm test`, `npm run build` trước khi phát hành.

Không lưu lượt chơi. Xác nhận rời game vẫn hủy lượt như trước.
