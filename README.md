# cheese-editor

[![npm](https://img.shields.io/npm/v/cheese-editor)](https://www.npmjs.com/package/cheese-editor) [![CI](https://github.com/mtri-git/cheese-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/mtri-git/cheese-editor/actions/workflows/ci.yml) [![license](https://img.shields.io/npm/l/cheese-editor)](https://github.com/mtri-git/cheese-editor/blob/main/LICENSE)

Rich text editor nhẹ cho React, dựng trên **Tiptap v3**. Mỗi tính năng là một "feature" độc lập: tính năng nào không dùng thì không đưa vào, và thêm component React custom chỉ cần một lời gọi `createNodeFeature()`.

**Demo:** https://mtri-git.github.io/cheese-editor/

## Cài đặt

```sh
pnpm add cheese-editor react react-dom
# hoặc: npm install cheese-editor react react-dom
```

Cần React 18 hoặc 19. Nếu dùng `cheese-editor/code-block` (tô màu code), cài thêm `lowlight`: `pnpm add lowlight`.

Nhớ import CSS một lần ở nơi khởi động ứng dụng: `import "cheese-editor/styles.css"`.

## Dùng

```tsx
import { basicKit, Editor } from "cheese-editor";
import { image } from "cheese-editor/image";
import { table } from "cheese-editor/table";
import "cheese-editor/styles.css";

// Khai báo ở module scope (hoặc useMemo): features chỉ được đọc một lần lúc mount.
const features = [...basicKit(), image({ upload: uploadToS3 }), table()];

export function Page() {
  return (
    <Editor
      features={features}
      content="# Hello"
      contentType="markdown" // "html" | "json" | "markdown"
      onChange={(editor) => save(editor.getHTML())} // hoặc getJSON() / getMarkdown()
    />
  );
}
```

### Tính năng có sẵn

| Import                     | Nội dung                                                                                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basicKit(options)`        | Paragraph/heading, bold/italic/underline/strike/code, link, màu chữ + highlight, căn lề, bullet/numbered/task list, quote, divider, undo/redo, **markdown** (import file `.md`, export, tự nhận dạng khi paste) |
| `cheese-editor/image`      | Upload (mặc định base64, truyền `upload` để đưa lên server), paste/kéo thả ảnh, resize, alt text                                                                                                                |
| `cheese-editor/table`      | Bảng với bubble menu thêm/xóa hàng cột, merge/split, header                                                                                                                                                     |
| `cheese-editor/code-block` | Code block có syntax highlight (lowlight, cần cài `lowlight`) và chọn ngôn ngữ                                                                                                                                  |
| `cheese-editor/callout`    | Khối ghi chú 5 màu, import/export theo cú pháp GitHub `> [!NOTE]`                                                                                                                                               |
| `cheese-editor/details`    | Khối thu gọn (`<details>`)                                                                                                                                                                                      |
| `cheese-editor/video`      | Nhúng YouTube / Vimeo / mp4                                                                                                                                                                                     |
| `cheese-editor/html-block` | Khối HTML thô (widget nhúng, bảng có class…), giữ nguyên như đã viết. Xem mã nguồn và preview trong iframe sandbox (không chạy script)                                                                          |
| `cheese-editor/emoji`      | Gõ `:smile` để gợi ý, kèm picker trên toolbar                                                                                                                                                                   |

Link không có `target` và `rel` trừ khi bật "Open in new tab" trong popover link: khi đó là `target="_blank" rel="noopener noreferrer"`. Không có `nofollow`, để công cụ tìm kiếm vẫn theo link của chính trang web.

Bỏ bớt tính năng trong basicKit: `basicKit({ color: false, taskList: false, heading: [1, 2] })`.

Luôn bật sẵn: slash menu (`/`), bubble menu khi bôi đen, drag handle cho từng block (tự viết, không kéo theo Yjs như drag handle chính thức của Tiptap).

## Thêm component custom

```tsx
import { createNodeFeature, NodeContent, ToolbarButton } from "cheese-editor";

export const productCard = createNodeFeature({
  name: "productCard", // → <div data-type="product-card" data-product-id="..." />
  attrs: { productId: "", layout: "horizontal" }, // giá trị mặc định, tự lưu vào data-*
  component: ({ attrs, updateAttrs, selected, editable }) => <ProductCard {...attrs} />,
  // content: true,            // nếu node chứa nội dung soạn được → render <NodeContent />
  toolbar: { icon: Package, title: "Sản phẩm" },
  slash: { title: "Sản phẩm", keywords: ["product", "san pham"] },
  bubble: ({ attrs, updateAttrs, deleteNode }) => (
    <ToolbarButton title="Xóa" onClick={deleteNode} />
  ),
});

const features = [...basicKit(), productCard];
productCard.insert(editor, { productId: "sp-001" }); // chèn bằng code
```

- Node dạng atom (không có `content`) export ra markdown dưới dạng HTML `<div data-type=...>`, và import lại được nguyên vẹn.
- Node có `content` mặc định chỉ export phần nội dung. Truyền `markdown: (attrs, children) => string` để tự định nghĩa (xem `features/callout.tsx`).
- Tên attribute `type` bị chặn vì nó trùng với `data-type`, dùng tên khác như `variant`.
- Cần can thiệp sâu thì dùng `extend: { ... }` để ghi đè config Tiptap của node.

Feature không phải node (chỉ thêm nút hoặc extension) thì dùng `defineFeature({ name, extensions, toolbar, slash, bubble })`. Feature khai báo sau sẽ ghi đè feature trước nếu trùng `name`.

## Hiển thị nội dung ở frontend

Trang chỉ hiển thị nội dung thì không cần React hay Tiptap. `cheese-editor/render` đổi nội dung JSON thành HTML, không phụ thuộc gì (14 kB, chạy được trên Cloudflare Workers, Node, Bun và trình duyệt).

```ts
import { renderContent } from "cheese-editor/render";
import "cheese-editor/prose.css"; // kiểu chữ cho nội dung đã render

// Lưu: onChange={(editor) => save(editor.getJSON())}
const html = renderContent(post.content);
// <div class="ce-prose" dangerouslySetInnerHTML={{ __html: html }} />
```

| Hàm                             | Việc                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `renderContent(value, options)` | JSON thì render an toàn. Chuỗi HTML thì chỉ trả về qua `options.sanitize` (không có thì ném `TypeError`) |
| `renderToHtml(doc, options)`    | Như trên nhưng chỉ nhận JSON                                                                             |
| `toPlainText(value)`            | Văn bản thuần cho excerpt, meta description, chỉ mục tìm kiếm                                            |
| `dataNode(options)`             | Render node `createNodeFeature` thành `<div data-type="product-card" data-...>` để bạn gắn component     |
| `createEmojiResolver(items)`    | Đổi tên emoji thành ký tự, từ `gitHubEmojis` của `@tiptap/extension-emoji`                               |
| `escapeHtml(text)`              | Escape khi tự viết `nodes` hoặc `marks`                                                                  |

**Nên lưu JSON (`getJSON()`) thay vì HTML.** JSON được render từ danh sách node và mark đã biết: text và thuộc tính được escape, link và ảnh chỉ nhận `http` và `https` (link thêm `mailto`, `tel`) cùng URL tương đối, màu chỉ nhận giá trị hợp lệ, node lạ bị bỏ qua. Video chỉ nhúng iframe cho YouTube và Vimeo, dựng từ id video chứ không dùng URL nhập vào. HTML thì là bất cứ thứ gì đã được lưu, nên phải qua `sanitize`:

```ts
import DOMPurify from "isomorphic-dompurify";

renderContent(post.contentHtml, { sanitize: (html) => DOMPurify.sanitize(html) });
```

Node tự định nghĩa (`createNodeFeature`) không nằm trong danh sách có sẵn, nên khai báo cách render:

```ts
renderContent(doc, {
  nodes: { productCard: dataNode() }, // <div data-type="product-card" data-product-id="sp-001">
  emoji: createEmojiResolver(gitHubEmojis),
});
```

Khối HTML (`cheese-editor/html-block`) không được escape, nên mặc định bị bỏ qua khi render. Bật khi người viết nội dung là người bạn tin (`rawHtml: true`), hoặc truyền hàm làm sạch (`rawHtml: (html) => DOMPurify.sanitize(html)`). Có `sanitize` mà không có `rawHtml` thì khối HTML đi qua `sanitize`.

Khi import HTML vào editor, viết khối HTML thô dưới dạng `<div data-type="html-block">…</div>`: editor giữ nguyên phần bên trong thay vì bỏ những thẻ nó không biết.

Bảng được render không kèm độ rộng cột để co giãn theo màn hình, và `<details>` giữ trạng thái mở như lúc lưu. Code block ra `<code class="language-ts">`: tô màu bằng highlight.js hoặc Shiki phía bạn nếu cần.

## Theme

Mọi màu sắc đều là CSS variable `--ce-*` (xem `packages/editor/src/styles.css`). Dark mode tự bật khi có class `.dark` hoặc `[data-theme="dark"]` ở phần tử cha.

## Phát triển

Monorepo được quản lý hoàn toàn bằng [Vite+](https://viteplus.dev) (`vp`).

```
packages/editor     → thư viện `cheese-editor` (vp pack)
apps/playground     → app demo, alias thẳng vào source để có HMR (vp dev)
```

### Lệnh

| Việc                          | Lệnh                                    |
| ----------------------------- | --------------------------------------- |
| Cài dependencies              | `vp install`                            |
| Chạy playground               | `vp run dev` (http://localhost:5173)    |
| Build thư viện                | `vp run build`                          |
| Test                          | `vp run test`                           |
| Format, lint, type-check      | `vp check` (`vp check --fix` để tự sửa) |
| Chạy tất cả trước khi release | `vp run ready`                          |

Phát hành phiên bản mới: xem [RELEASING.md](https://github.com/mtri-git/cheese-editor/blob/main/RELEASING.md). Lịch sử thay đổi: [CHANGELOG.md](https://github.com/mtri-git/cheese-editor/blob/main/CHANGELOG.md).
