# Bộ nhớ & Lưu trữ

Web thuyết trình 3D môn Tin học về RAM, HDD và SSD (dựa trên ThreeUI AshenPress).

- Trang web: https://thahnpahm.github.io/tin-hoc/ (GitHub Pages, phục vụ `index.html` từ nhánh `main`).
- `index.html`: bản chạy độc lập, ảnh nhúng sẵn, bấm đúp là mở.
- Artifact: https://claude.ai/artifact/YbNDwjs2r4Le8WtyLB1rd6 (trang `build/bo-nho-luu-tru.html`, ảnh ở `img/*.webp` lấy từ `build/out/`).

## Build lại

Sửa nội dung trong `build/books.js` (các phần), `book.js`, `devices.js` hoặc các file vá `*.txt`, rồi chạy trong thư mục `build`:

```bash
node build.mjs src/ashen-press.html ../index.html bo-nho-luu-tru.html
```

Ảnh linh kiện lấy từ Wikimedia Commons, tác giả và giấy phép ghi trong từng phần.
