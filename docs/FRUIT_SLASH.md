# Chém hoa quả · Fruit Slash

## Trải nghiệm

Sân game toàn màn hình dùng Phaser. Bối cảnh sân gỗ/vườn núi, đèn lồng và quả tạo bằng texture canvas thủ tục. Quả bay theo quỹ đạo ném, ba làn đáp án; vuốt giữ chuột/cảm ứng hoặc chạm quả. Phím 1/2/3 là cách thay thế. Không cần camera hoặc nhận diện tay.

Mỗi quả mang đáp án trực tiếp, không bắt học viên nhớ màu rồi ánh xạ đáp án. Chữ/câu hỏi/HUD dùng HTML để sắc nét; vị trí nhãn đáp án cập nhật theo sprite trong scene. Không dùng các card web đứng yên làm bàn game.

Ba bộ thử thách: chọn chữ Hán theo nghĩa tiếng Việt ở HSK 1, HSK 2; hoặc ghép động từ với danh từ thông dụng. Mỗi lượt 12 câu. Thời gian 10/15/20/30 giây hoặc Thư thả. Nội dung mẫu chọn lọc trong `questions.ts`, không sao chép ngân hàng riêng từ web tham khảo.

## Luật

- Một câu chỉ nhận một đáp án. Đúng +10, chuỗi đúng cộng thêm 2 điểm mỗi bậc, tối đa +8/câu. Sai −2, không âm; hết giờ 0, reset combo.
- Quả rơi được phóng lại, không bị trừ điểm chỉ vì chưa chém. Đồng hồ vẫn chạy nếu chọn tính giờ.
- Phản hồi hiện chữ Hán, pinyin và nghĩa trước khi tự sang câu tiếp theo.
- P/Escape hoặc nút tạm dừng; đổi tab tự dừng. Kết thúc sớm có xác nhận, xem kết quả và các từ đã gặp.

## Phân chia code

- `round.ts`: model thời gian thực, điểm, combo, trạng thái câu, tạm dừng, chống đáp án lặp/ID cũ; hàm segment–circle cho đường kiếm nhanh.
- `questions.ts`: tạo các lượt 12 câu, ba lựa chọn duy nhất/câu; ngân hàng ghép từ.
- `art.ts`: vẽ texture quả, cảnh vườn/sân gỗ, ánh sáng, đường nét.
- `FruitScene.ts`: Phaser scene, quỹ đạo bay, swept collision, vệt kiếm, tách hai nửa, nước quả/hạt sáng, confetti, resize và hủy tài nguyên.
- `FruitSlash.tsx`: HUD, thiết lập dùng Select chung, pause/help/kết quả, input thay thế và điều hướng.
- `fruit.css`: lớp điều khiển và bố cục responsive của sân game.
- `audio.ts`: mixer Web Audio, phát loop nhạc Lotus Pond từ asset cùng origin, tổng hợp tiếng gió/vỡ quả và âm báo đúng/sai; mỗi kênh có gain riêng sau gain tổng. Không gọi dịch vụ âm thanh ngoài trong lúc chơi.
- `useFruitAudio.ts`, `AudioSettings.tsx`: vòng đời mixer, lưu thiết lập có kiểm tra dữ liệu, hộp thoại âm lượng/bật tắt và nghe thử.

Âm thanh mặc định bật tất cả (tổng 80%, nhạc 18%, dao 70%, bổ quả 80%, báo đúng/sai 70%). Trình duyệt chỉ bắt đầu phát sau tương tác pointer/keyboard đầu tiên. Thiết lập được lưu riêng cho game dưới `hanplay.fruit.audio.v1`; lựa chọn cũ được giữ khi tải lại. Mở cài đặt sẽ dừng lượt chơi, nhạc vẫn phát để chỉnh trực tiếp. Đổi tab dừng nguồn âm và suspend context; nhạc tiếp tục đúng vị trí khi quay lại. Rời game hủy nguồn và context. Tiếng vung dao giới hạn một lần mỗi 140ms khi đang nhận đáp án; âm gió có attack tròn, sweep lên/xuống và một lớp sine hạ nhanh để tạo tiếng “vút”. Tiếng bổ quả chỉ phát khi thực sự chọn đáp án. Không lóe sáng/rung camera khi đúng/sai.

Nhạc: Lotus Pond — Loop, BiteMe Games, từ gói Chinese Game Music. Bản WAV 64 giây được nén thành MP3 stereo 128 kbit/s (~1 MB), chuẩn hóa −18 LUFS / −2 dBTP. File được tải/giải mã một lần sau tương tác, không phát chồng loop khi click nhiều lần. Nguồn và giấy phép ghi ở `public/audio/CREDITS.md`; credit cũng hiện trong bảng cài đặt. Nhạc gốc VLTK không được đưa vào dự án.

Một đường vuốt chỉ thuộc về câu bắt đầu nó. Khi sang câu, cần một lần nhấn/vuốt mới. Model đóng câu ngay khi nhận đáp án, kiểm ID câu và có khoảng khóa ngắn đầu câu; nhãn đáp án chỉ hiện khi input sẵn sàng. Tránh lỗi click/vuốt xuyên câu cũ.

Quỹ đạo dùng thời gian thực, tạm dừng điều chỉnh mốc phóng; không tích lũy theo frame bị throttle. Khi resize, phóng lại cùng câu và giữ điểm/deadline. Scene shutdown hủy listener, engine và tween; tween trang trí cũ bị hủy khi resize.

## Kiểm tra

29 test bao gồm hồi quy Pikachu/legacy, 5 test Fruit Slash và 2 test âm thanh: mặc định/lưu thiết lập bị lỗi/giới hạn âm lượng; mở context sau tương tác, tách kênh, ngừng âm khi ẩn tab và giải phóng tài nguyên.

Browser: đã kéo chuột qua quả đúng và nhận điểm, thử phím số, hoàn thành 12 câu ghép từ ở viewport mobile 375px (cố ý chọn sai 1 câu: 11/12, 158 điểm, combo ×8), xem danh sách ôn từ và chơi lại. Không tràn ngang ở viewport đã kiểm tra. Đã thử để hết giờ liên tiếp và kết thúc sớm; bảng ôn ghi đúng các câu hết giờ, không cộng điểm. Chưa thử cảm ứng trên thiết bị thật, chưa đo FPS hoặc nghe kiểm chứng âm thanh trực tiếp.
