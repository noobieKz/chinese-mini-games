# Vườn chữ · Luật đang dùng

Hai kiểu ôn tập: ghép hai chữ thành từ, hoặc nối từ tiếng Trung với nghĩa tiếng Việt.

Ghép chữ có hai độ khó: **Bình thường** (mặc định, chọn hai chữ theo thứ tự nào cũng được) và **Khó** (chọn đúng thứ tự tạo từ). Nối nghĩa luôn chấp nhận hai thứ tự. Ô chữ không hiển thị nhãn đầu/sau; các chữ giống nhau dùng thay nhau được, không bị ràng buộc bởi ID nguồn.

Tùy chọn: HSK 1/2; tổng hợp 18 từ mẫu hoặc 3 nhóm luyện, mỗi nhóm 6 từ; bàn 4/8/12/18 cặp. Khi nhóm ít từ, số cặp giảm theo số từ thật. Đây là nhóm từ mẫu chọn lọc của HanPlay, không phải 15 bài trong tài liệu của website tham khảo.

Đếm ngược 4 phút hoặc Thư thả. Đúng +10 điểm, sai −2, gợi ý −3; điểm không âm. Mỗi ván có 3 gợi ý và 1 lần nối giúp (không cộng điểm). Gợi ý pinyin chỉ hiện cách đọc của một cặp đang nối được. Đảo ô miễn phí. Có tạm dừng, toàn màn hình, kết thúc lượt và chơi ván mới. Khi đổi tab tự tạm dừng. Kỷ lục lưu tại thiết bị.

Đường nối ngang/dọc, đi qua ô trống, tối đa hai lần rẽ; được đi vòng ngoài bàn. Tọa độ viền logic được ánh xạ vào rãnh hiển thị bên trong canvas, tránh cắt đường ở mép màn hình. Game tự đảo nếu không còn đường.

Chữ trong ô dùng HTML/CSS ở độ phân giải màn hình, không phóng chữ bitmap trong canvas. Phaser vẽ mặt ô, đường nối và hiệu ứng. Component Select được lấy và điều chỉnh từ `D:/Bitronics/classroom-management/src/components/select.tsx`, dùng chung cho mọi dropdown của game; menu portal, hỗ trợ bàn phím và tự đổi hướng mở.
