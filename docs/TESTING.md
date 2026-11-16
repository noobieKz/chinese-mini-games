# Xác minh phiên bản Vườn chữ · 16/11/2026

- Production build và TypeScript strict đạt.
- 19 test đạt, trong đó 3 test mới dành cho luật Vườn chữ; các test legacy chỉ kiểm hồi quy code cũ.
- Browser: hoàn thành 12/12 cặp ở Nối từ HSK 1 trên mobile và Ghép chữ HSK 2 ở chế độ 4 phút; điểm, sổ tay, màn kết quả hoạt động. Mỗi lượt thử dùng gợi ý, kết thúc 87 điểm theo luật trừ điểm gợi ý.
- Đồng hồ đã giảm khi đang chơi và giữ 3:38 trong lúc tạm dừng. Chuyển qua năm khổ 1440, 1280, 1024, 768, 375px không làm mất 3/12 cặp và 24 điểm. Chiều rộng document không vượt viewport ở các khổ này.
- Ghi nhận lỗi timer Phaser bị chậm khi trình duyệt throttle frame; đổi việc mở khóa input sang wall-clock timer, thử lại hoàn thành hai lượt thành công.
- Game không yêu cầu tài khoản hoặc mã phòng. API lớp học cũ trả 410 qua Worker.

Giới hạn: chưa thử điện thoại vật lý, chưa đo FPS/bộ nhớ, chưa đợi một lượt đầy đủ 4 phút để quan sát timeout. Âm thanh là tính năng tùy chọn, chưa kiểm bằng nghe trực tiếp. Từ mẫu không thay thế ngân hàng giáo trình đã kiểm duyệt.

## Bản sửa Pikachu và dropdown

Ngày 16/11/2026: 22 test đạt. Đã bổ sung kiểm thử rãnh đường nối luôn nằm trong canvas ở mọi kích thước, chữ giống nhau khác vị trí nguồn, hoàn thành các bàn 4/8/12/18 cặp trên hai cấp độ và cả hai mức yêu cầu thứ tự.

Browser đã thử: bàn 4 và 18 cặp; 3 gợi ý hết lượt thì khóa; nối giúp cộng số cặp nhưng không cộng điểm; gợi ý pinyin; kết thúc sớm và xem kết quả; nhóm 6 từ tự giảm bàn yêu cầu 18 còn 6 cặp; dropdown chuột và End/Enter; chọn HSK bằng menu trên mobile không tràn ngang. Chọn 果 → 水 ở Bình thường được +10; chọn 生 → 学 ở Khó bị từ chối, sau đó 学 → 生 được +10.

Ảnh chữ trước đây dùng canvas bị mờ khi scale. Bản này chuyển chữ ô sang HTML, bỏ toàn bộ nhãn phụ đầu/sau; Phaser vẫn đảm nhiệm đồ họa. Chưa đo FPS hoặc thử điện thoại vật lý.

## Fruit Slash · 16/11/2026

27 test đạt. Đã kéo chuột chém quả đúng (+10), thử phím số, hoàn thành 12 câu ghép từ ở viewport 375px: 11 đúng, 158 điểm, combo cao nhất ×8, và bảng ôn đủ 12 cụm từ. Một câu sai được chọn chủ động để kiểm tra phản hồi/reset combo. Xem FRUIT_SLASH.md cho phạm vi và giới hạn kiểm thử.

Thư viện theo yêu cầu sau cùng tách ba lối vào: Ghép chữ thành từ, Nối từ với nghĩa, Chém hoa quả. Hai trò nối dùng chung engine nhưng không còn dropdown đổi kiểu bên trong. Đã mở route ghép/nối và chuyển URL query cũ, giữ tương thích liên kết.
