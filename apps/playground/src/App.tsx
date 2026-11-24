import { useState } from "react";
import { basicKit, Editor, importMarkdown, type TiptapEditor } from "cheese-editor";
import { callout } from "cheese-editor/callout";
import { codeBlock } from "cheese-editor/code-block";
import { details } from "cheese-editor/details";
import { emoji } from "cheese-editor/emoji";
import { image } from "cheese-editor/image";
import { table } from "cheese-editor/table";
import { video } from "cheese-editor/video";

import { productCard } from "./ProductCard";

// Module scope: features are read once when the editor mounts.
const features = [
  ...basicKit(),
  image(),
  table(),
  codeBlock(),
  callout(),
  details(),
  video(),
  emoji(),
  productCard,
];

const INITIAL = `# Cheese Editor

Editor nhẹ dựa trên **Tiptap v3**. Gõ \`/\` để mở menu lệnh, bôi đen chữ để hiện bubble menu.

- Import file \`.md\` bằng nút trên toolbar, hoặc **paste markdown** trực tiếp
- Thêm component custom chỉ với \`createNodeFeature()\`

> [!TIP]
> Kéo icon ⠿ bên trái mỗi block để di chuyển.

\`\`\`ts
const features = [...basicKit(), image(), table(), productCard];
\`\`\`

| Tính năng | Subpath |
| --- | --- |
| Table | \`cheese-editor/table\` |
| Image | \`cheese-editor/image\` |

<div data-type="product-card" data-product-id="sp-002" data-layout="horizontal"></div>
`;

type OutputTab = "markdown" | "html" | "json";

export function App() {
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [tab, setTab] = useState<OutputTab>("markdown");
  const [, setVersion] = useState(0);
  const [dark, setDark] = useState(false);
  const [editable, setEditable] = useState(true);
  const [mdInput, setMdInput] = useState("");

  const output = !editor
    ? ""
    : tab === "markdown"
      ? editor.getMarkdown()
      : tab === "html"
        ? editor.getHTML()
        : JSON.stringify(editor.getJSON(), null, 2);

  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <header className="app-header">
        <h1>Cheese Editor</h1>
        <div className="app-actions">
          <label>
            <input
              type="checkbox"
              checked={editable}
              onChange={(e) => setEditable(e.target.checked)}
            />{" "}
            Editable
          </label>
          <button type="button" onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main className="app-main">
        <Editor
          features={features}
          content={INITIAL}
          contentType="markdown"
          editable={editable}
          onReady={setEditor}
          onChange={() => setVersion((v) => v + 1)}
        />

        <aside className="app-side">
          <section>
            <h2>Import markdown text</h2>
            <textarea
              value={mdInput}
              onChange={(e) => setMdInput(e.target.value)}
              placeholder="# Paste markdown here"
              rows={6}
            />
            <div className="app-row">
              <button
                type="button"
                disabled={!editor || !mdInput}
                onClick={() => editor && importMarkdown(editor, mdInput, "replace")}
              >
                Replace
              </button>
              <button
                type="button"
                disabled={!editor || !mdInput}
                onClick={() => editor && importMarkdown(editor, mdInput, "insert")}
              >
                Insert at cursor
              </button>
            </div>
          </section>

          <section>
            <div className="app-tabs">
              {(["markdown", "html", "json"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "is-active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <pre className="app-output">{output}</pre>
          </section>
        </aside>
      </main>
    </div>
  );
}
