# Kiến trúc hiện tại

Chơi cá nhân, không cần tài khoản/mã phòng. React quản lý đường dẫn, chữ rõ, HUD, tùy chọn và các màn bắt đầu/tạm dừng/kết quả. Phaser quản lý sân chơi, đồ họa, chuyển động và va chạm. Cloudflare Worker phục vụ static assets; API auth/phòng cũ trả 410.

## Điều hướng

Thư viện có ba lối vào: Ghép chữ thành từ (`/games/ghep-chu`), Nối từ với nghĩa (`/games/noi-tu`), Chém hoa quả (`/games/chem-hoa-qua`). Hai trò nối dùng chung module `word-garden`; chọn riêng từ ngoài và không có dropdown chuyển kiểu. Các alias `/games/pikachu` và query `mode=meaning` giữ tương thích link cũ.

`/games` độc lập với `/`, để sau này thay trang chủ bằng landing page khóa học mà không thay link game. App hỗ trợ Back/Forward và đổi title theo trò. Lỗi tải chunk cũ sau deploy có cơ chế reload một lần, có giới hạn chống vòng lặp; khi offline giữ nút tải lại thủ công.

## Engine

Pikachu: luật tìm đường tối đa hai lần rẽ và layout tách khỏi scene. Chữ ô dùng HTML/CSS native để sắc nét; Phaser vẽ mặt ô, đường nối và hiệu ứng. Một hệ input DOM tránh bấm xuyên. Bình thường/Khó thay luật yêu cầu thứ tự. Timer mở khóa theo wall clock, được hủy khi shutdown.

Fruit Slash: full-screen Phaser scene, art canvas thủ tục, quỹ đạo ném theo thời gian thực, swept segment–circle collision, vệt kiếm, hai nửa quả và juice particles. Input canvas thực; phím số và nút đáp án cho bàn phím là cách thay thế. Một stroke chỉ thuộc về câu lúc bắt đầu; model đóng câu khi nhận đáp án, kiểm question ID và khoảng khóa đầu câu. React cập nhật HUD theo nhịp giới hạn; vị trí nhãn quả được cập nhật qua refs, không rerender React theo từng frame.

Nội dung tách khỏi scene và luật, gồm từ mẫu HSK 1/2 và cụm ghép động từ. Đây không phải toàn bộ ngân hàng HSK hoặc bản sao tài liệu của website tham khảo. Dropdown dùng chung Select từ dự án classroom-management, có portal, bàn phím và tự đổi hướng mở.

Code legacy của bản lớp học chưa xóa để giữ tham khảo, không được import vào entrypoint. Durable Object class/binding giữ tương thích deploy trước; frontend mới không gọi nó. Xem WORD_GARDEN.md, FRUIT_SLASH.md, DESIGN.md và DEPLOYMENT.md.
