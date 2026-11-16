# Vườn chữ · Luật đang dùng

Hai kiểu ôn tập: ghép hai chữ thành từ, hoặc nối từ tiếng Trung với nghĩa tiếng Việt.

Ghép chữ có hai độ khó: **Bình thường** (mặc định, chọn hai chữ theo thứ tự nào cũng được) và **Khó** (chọn đúng thứ tự tạo từ). Nối nghĩa luôn chấp nhận hai thứ tự. Ô chữ không hiển thị nhãn đầu/sau; các chữ giống nhau dùng thay nhau được, không bị ràng buộc bởi ID nguồn.

Tùy chọn: HSK 1/2; tổng hợp 18 từ mẫu hoặc 3 nhóm luyện, mỗi nhóm 6 từ; bàn 4/8/12/18 cặp. Khi nhóm ít từ, số cặp giảm theo số từ thật. Đây là nhóm từ mẫu chọn lọc của HanPlay, không phải 15 bài trong tài liệu của website tham khảo.

Thư thả hoặc tính giờ theo kích thước bàn: 20 giây mỗi cặp (4 cặp 1 phút 20 giây, 6 cặp 2 phút, 8 cặp 2 phút 40 giây, 12 cặp 4 phút, 18 cặp 6 phút). Đúng +10 điểm, sai −2, gợi ý −3; điểm không âm. Mỗi ván có 3 gợi ý và 1 lần nối giúp (không cộng điểm). Gợi ý pinyin chỉ hiện cách đọc của một cặp đang nối được. Đảo ô miễn phí. Có tạm dừng, toàn màn hình, kết thúc lượt và chơi ván mới. Khi đổi tab tự tạm dừng. Kỷ lục lưu tại thiết bị, tách riêng theo kiểu chơi, độ khó, bộ từ, bài luyện, số cặp và chế độ giờ (`hanplay-best-…`), nên bàn nhỏ không so với bàn lớn.

Ghép chữ ra một từ có thật nhưng không thuộc bàn (医 + 生 = 医生, 天 + 天 = 天天…) không bị trừ điểm và không mất combo: game báo từ đó đúng, kèm pinyin và nghĩa, rồi nhắc ghép từ khác. Danh sách ở `src/games/word-garden/extra-words.ts`, không được trùng từ mục tiêu (có test kiểm). Mức Khó chỉ nhận đúng thứ tự của từ đó.

Tên hiển thị trong thư viện là **Nối cặp** (không dùng tên thương hiệu); route `/games/pikachu` cũ vẫn hoạt động.

Đường nối ngang/dọc, đi qua ô trống, tối đa hai lần rẽ; được đi vòng ngoài bàn. Tọa độ viền logic được ánh xạ vào rãnh hiển thị bên trong canvas, tránh cắt đường ở mép màn hình. Game tự đảo nếu không còn đường.

Chữ trong ô dùng HTML/CSS ở độ phân giải màn hình, không phóng chữ bitmap trong canvas. Phaser vẽ mặt ô, đường nối và hiệu ứng. Component Select được lấy và điều chỉnh từ `D:/Bitronics/classroom-management/src/components/select.tsx`, dùng chung cho mọi dropdown của game; menu portal, hỗ trợ bàn phím và tự đổi hướng mở.
