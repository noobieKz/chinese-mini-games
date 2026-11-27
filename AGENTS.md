# Quy tắc giao diện HanPlay

- Khi thêm hoặc sửa giao diện, kiểm tra các component sẵn có trong `src/components/` và `src/arcade/`. Dùng component chung nếu đã có thành phần đảm nhiệm cùng chức năng.
- Dropdown chọn một giá trị trong mọi màn React, kể cả khu giáo viên, dùng `Select` từ `src/components/Select.tsx`. Dùng `value`, `onValueChange` và `<option>` theo API của component. Giữ nhãn truy cập, trạng thái bắt buộc hoặc vô hiệu hóa theo hành vi của form.
- Đặt CSS bố cục ở màn sử dụng. Nếu dropdown cần sửa hành vi hoặc giao diện dùng chung, sửa ở `Select` và kiểm tra các màn đang dùng component trước khi hoàn tất.
