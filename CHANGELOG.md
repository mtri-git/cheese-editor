# Changelog

Mỗi phiên bản có một mục `## X.Y.Z`. Khi phát hành, workflow `release` lấy đúng mục của phiên bản đó làm ghi chú cho GitHub release (xem `RELEASING.md`).

## 0.2.0

Gồm cả các thay đổi của 0.1.1 (bản đó chưa lên được npm).

### Thay đổi

- Link không còn mặc định `target="_blank" rel="noopener noreferrer nofollow"` (mặc định của Tiptap). Link mới không có `target` và `rel`, nên công cụ tìm kiếm theo được link nội bộ. Popover link có thêm ô "Open in new tab", bật lên thì link có `target="_blank" rel="noopener noreferrer"`. Nội dung đã lưu không bị sửa: link cũ vẫn giữ `nofollow` cho tới khi được sửa lại.

### Thêm

- `cheese-editor/html-block`: khối HTML thô, giữ nguyên như đã viết. Editor hiện mã nguồn và preview trong iframe sandbox không chạy script. `getHTML()` lưu nó trong thuộc tính `data-html`, nên không có gì của nó chạy trong editor. HTML được mở với `<div data-type="html-block">…</div>` cũng thành khối HTML, tiện khi import.
- `cheese-editor/render`: tuỳ chọn `rawHtml` (`true` hoặc một hàm) để render khối HTML. Mặc định khối HTML bị bỏ qua, hoặc đi qua `sanitize` nếu có.

## 0.1.1

### Sửa

- Hộp chọn file (`pickFiles`, dùng cho chèn ảnh và import markdown) không còn treo mãi khi người dùng đóng hộp thoại mà không chọn file.

### Khả năng tiếp cận

- Vùng soạn thảo có tên đọc được bằng trình đọc màn hình và được báo là nhiều dòng (`aria-multiline`). Đặt tên bằng prop `label` (mặc định `"Rich text editor"`).
- Toolbar có tên (prop `toolbarLabel`, mặc định `"Formatting"`).
- Nút mở popover có `aria-haspopup`, và `aria-controls` trỏ tới panel khi nó đang mở.
- `editorOptions.editorProps.attributes` được gộp với các thuộc tính trên thay vì thay thế chúng, và vẫn ghi đè được nếu trùng tên.

### Khác

- README: thêm hướng dẫn cài đặt và link demo, chuyển phần lệnh phát triển xuống cuối.
- Playground: thêm tab "preview" hiển thị nội dung bằng `cheese-editor/render` và `cheese-editor/prose.css`, và được đưa lên GitHub Pages.
- Quy trình phát hành: ghi chú của GitHub release lấy từ file này.

## 0.1.0

Bản đầu tiên.

- Editor dựng từ các feature độc lập (`basicKit`, `image`, `table`, `code-block`, `callout`, `details`, `video`, `emoji`, markdown) trên Tiptap v3, có slash menu, bubble menu và drag handle. `createNodeFeature()` để thêm component tuỳ ý.
- `cheese-editor/render`: đổi nội dung JSON thành HTML mà không cần React hay Tiptap. Text được escape, URL và màu chỉ nhận giá trị an toàn, video chỉ nhúng YouTube và Vimeo từ id. Kèm `toPlainText`, `dataNode`, `createEmojiResolver`.
- `cheese-editor/prose.css`: kiểu chữ cho nội dung đã render.
