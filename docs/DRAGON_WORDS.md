# Rồng săn chữ · 游龙识字

Route: `/games/rong-san-chu`. Game thể loại rắn săn mồi, dùng để luyện nhớ chữ Hán theo nghĩa và thứ tự chữ trong từ.

## Luật

- Đề bài hiện nghĩa tiếng Việt (và pinyin nếu bật gợi ý). Rồng phải ăn các viên ngọc chữ Hán **theo đúng thứ tự** để ghép từ, ví dụ 朋 → 友 cho “bạn bè”. Từ có chữ lặp (谢谢) ăn viên nào cũng được.
- Mỗi lượt có các chữ của từ cộng 3 chữ gây nhiễu lấy từ những từ khác cùng bộ, không trùng chữ của từ đang hỏi. Ngọc không xuất hiện trên thân rồng, sát đầu rồng hay trên 4 ô ngay trước mặt nó.
- Mỗi chữ đúng +5 điểm, rồng dài thêm 1 đốt. Ghép xong từ +10, chuỗi từ liền mạch thưởng thêm 2 điểm mỗi bậc, tối đa +8 (giống Chém hoa quả). Mỗi từ ghép xong rồng nhanh hơn một chút, có giới hạn theo tốc độ đã chọn.
- Ăn nhầm chữ, kể cả chữ đúng nhưng sai thứ tự: mất 1 mạng, chuỗi về 0; viên ngọc đó hiện lại ở chỗ khác để lượt chơi luôn giải được.
- Cắn vào thân mình: mất 1 mạng và đứt phần đuôi từ chỗ bị cắn, không thua ngay. Ra mép bàn thì rồng hiện ở mép đối diện, nên chỉ thân rồng là chướng ngại.
- 3 mạng; hết mạng là hết lượt. Chơi vô tận, hết danh sách từ thì xáo lại, không lặp một từ hai lần liền.
- Tốc độ: Chậm / Vừa / Nhanh. Kỷ lục lưu trên thiết bị theo bộ từ + tốc độ (`hanplay-best-dragon-HSK1-normal`, …).
- Màn kết quả: điểm, số từ ghép, chuỗi dài nhất, kỷ lục và danh sách ôn lại; đánh dấu từ ghép sai ("sai N lần") và từ chưa ghép xong.

## Điều khiển

Phím mũi tên / WASD; vuốt trên bàn (mỗi đoạn vuốt 24px đổi hướng một lần, một đường vuốt dài rẽ được hai lần); nút điều hướng hiện trên màn cảm ứng hoặc màn hẹp. Lệnh rẽ được đệm tối đa 2 lần giữa hai bước, không cho quay ngược vào cổ. P / Esc tạm dừng, đổi tab tự tạm dừng.

## Mã nguồn

- `src/games/dragon-words/model.ts`: luật thuần (lưới, bước đi, ngọc, điểm, mạng), test ở `tests/dragon-words.test.ts`.
- `DragonScene.ts`: Phaser vẽ bàn và rồng; nội suy vị trí giữa hai ô theo thời gian thực, qua mép thì nhảy chứ không trượt ngang bàn; hiệu ứng ăn ngọc, ghép từ, ăn nhầm. Bước đi theo wall clock, tạm dừng dời mốc thời gian.
- `DragonWords.tsx`: HUD, đề bài, ngọc chữ bằng DOM (chữ sắc nét), điều khiển, các màn; dùng lại khung trang, hộp thoại và nút của Nối cặp.
- `dragon.css`: bàn, ngọc, nút điều hướng, bố cục vừa một màn hình (laptop và điện thoại từ 667px).
- Âm thanh: `dragonAudioProfile` (nhạc Dragon Dance, tiếng ăn ngọc, báo đúng/sai).
- Bàn 18 × 12 trên màn ngang, 12 × 15 trên điện thoại; chọn khi bắt đầu lượt và giữ nguyên trong lượt.
- Bản dev có `window.__dragon` để kiểm thử trong trình duyệt; Vite loại bỏ đoạn này khỏi bản build.

## Đã kiểm tra

36 test đạt (6 test luật rồng). Trên trình duyệt: thẻ thư viện 2 × 2; bàn vừa một màn hình ở 1280 × 800 và 375 × 667; phím mũi tên, nút điều hướng và vuốt đều đổi hướng; ăn đúng chữ điền ô và cộng điểm, ăn nhầm mất mạng, ghép xong từ chuyển từ mới; hết mạng ra màn kết quả có kỷ lục mới và danh sách ôn. Khung trình duyệt bị ẩn trong lúc kiểm tra nên nhịp chạy được giả lập bằng cách gọi `update()`; chưa chơi thử trên điện thoại thật.
