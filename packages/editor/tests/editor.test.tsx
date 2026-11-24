import { Editor as TiptapEditor, type AnyExtension, type JSONContent } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { afterEach, describe, expect, test } from "vite-plus/test";

import {
  basicKit,
  createNodeFeature,
  defineFeature,
  FeatureRegistry,
  importMarkdown,
  looksLikeMarkdown,
  resolveFeatures,
} from "../src";
import { callout } from "../src/callout";
import { table } from "../src/table";
import { video } from "../src/video";

const editors: TiptapEditor[] = [];

function createEditor(
  features = basicKit(),
  content = "",
  contentType: "html" | "markdown" = "html",
) {
  const resolved = resolveFeatures(features);
  const extensions: AnyExtension[] = [
    ...resolved.extensions,
    FeatureRegistry.configure({ resolved }),
    Markdown,
  ];
  const editor = new TiptapEditor({ extensions, content, contentType });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

const card = createNodeFeature({
  name: "productCard",
  attrs: { productId: "sp-001", qty: 1 },
  component: () => null,
  toolbar: { icon: () => null, title: "Card" },
  slash: { title: "Card" },
});

describe("resolveFeatures", () => {
  test("orders toolbar items by group and lets later features override by name", () => {
    const resolved = resolveFeatures([
      defineFeature({
        name: "a",
        toolbar: [{ id: "insert", group: "insert", render: () => null }],
      }),
      defineFeature({ name: "b", toolbar: [{ id: "undo", group: "history", render: () => null }] }),
      defineFeature({
        name: "a",
        toolbar: [{ id: "replaced", group: "format", render: () => null }],
      }),
    ]);
    expect(resolved.toolbar.map((item) => item.id)).toEqual(["undo", "replaced"]);
  });

  test("basicKit options remove features", () => {
    const names = basicKit({ color: false, markdown: false, taskList: false }).map((f) => f.name);
    expect(names).not.toContain("color");
    expect(names).not.toContain("markdown");
    expect(names).not.toContain("taskList");
    expect(names).toContain("starterKit");
  });
});

describe("createNodeFeature", () => {
  test("round-trips attributes through HTML", () => {
    const editor = createEditor([...basicKit(), card]);
    card.insert(editor, { productId: "sp-042", qty: 3 });
    const html = editor.getHTML();
    expect(html).toContain('data-type="product-card"');
    expect(html).toContain('data-product-id="sp-042"');
    expect(html).toContain('data-qty="3"');

    const reloaded = createEditor([...basicKit(), card], html);
    const node = reloaded.getJSON().content?.find((n) => n.type === "productCard");
    expect(node?.attrs).toEqual({ productId: "sp-042", qty: 3 });
  });

  test("atom nodes round-trip through markdown as HTML", () => {
    const editor = createEditor([...basicKit(), card]);
    card.insert(editor, { productId: "sp-007", qty: 2 });
    const md = editor.getMarkdown();
    expect(md).toContain(
      '<div data-type="product-card" data-product-id="sp-007" data-qty="2"></div>',
    );

    const reloaded = createEditor([...basicKit(), card], md, "markdown");
    const node = reloaded.getJSON().content?.find((n) => n.type === "productCard");
    expect(node?.attrs).toEqual({ productId: "sp-007", qty: 2 });
  });

  test("registers toolbar and slash items", () => {
    const resolved = resolveFeatures([card]);
    expect(resolved.toolbar.map((i) => i.id)).toEqual(["productCard"]);
    expect(resolved.slash.map((i) => i.title)).toEqual(["Card"]);
  });

  test("content nodes keep editable children and custom markdown", () => {
    const editor = createEditor([...basicKit(), callout()]);
    editor.commands.setContent(
      '<div data-type="callout" data-variant="warning"><p>Hello</p></div>',
    );
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "callout",
      attrs: { variant: "warning" },
    });
    expect(editor.getHTML()).toContain(
      '<div data-type="callout" data-variant="warning"><p>Hello</p></div>',
    );
    expect(editor.getMarkdown().trim()).toBe("> [!WARNING]\n> Hello");
  });

  test("callout imports GitHub alerts and leaves plain quotes alone", () => {
    const md = "> [!TIP]\n> Use **slash** menu\n\n> just a quote";
    const editor = createEditor([...basicKit(), callout()], md, "markdown");
    const [first, second]: JSONContent[] = editor.getJSON().content ?? [];
    expect(first).toMatchObject({ type: "callout", attrs: { variant: "tip" } });
    expect(first.content?.[0].content?.map((n) => n.text)).toEqual(["Use ", "slash", " menu"]);
    expect(second.type).toBe("blockquote");
    expect(editor.getMarkdown().trim()).toBe(md);
  });

  test("rejects the reserved `type` attribute", () => {
    expect(() =>
      createNodeFeature({ name: "bad", attrs: { type: "x" }, component: () => null }),
    ).toThrow(/reserved/);
  });

  test("video stores its src", () => {
    const feature = video();
    const editor = createEditor([...basicKit(), feature]);
    feature.insert(editor, { src: "https://youtu.be/dQw4w9WgXcQ" });
    expect(editor.getHTML()).toContain('data-src="https://youtu.be/dQw4w9WgXcQ"');
  });
});

describe("markdown", () => {
  test("detects markdown-looking text", () => {
    expect(looksLikeMarkdown("# Title")).toBe(true);
    expect(looksLikeMarkdown("- item\n- item")).toBe(true);
    expect(looksLikeMarkdown("see [docs](https://x.dev)")).toBe(true);
    expect(looksLikeMarkdown("just a sentence.")).toBe(false);
  });

  test("importMarkdown replaces an empty doc and inserts otherwise", () => {
    const editor = createEditor([...basicKit(), table()]);
    importMarkdown(editor, "# Title\n\n**bold** text\n\n| a | b |\n| - | - |\n| 1 | 2 |");
    const types = editor.getJSON().content?.map((n) => n.type);
    // TrailingNode keeps an empty paragraph after the table so the cursor can leave it.
    expect(types).toEqual(["heading", "paragraph", "table", "paragraph"]);

    // After setContent the cursor sits in the last table cell; move it to the trailing paragraph.
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    importMarkdown(editor, "- one\n- two", "insert");
    expect(editor.getJSON().content?.map((n) => n.type)).toEqual([
      "heading",
      "paragraph",
      "table",
      "bulletList",
      "paragraph",
    ]);
  });

  test("exports markdown", () => {
    const editor = createEditor(
      basicKit(),
      "<h2>Hi</h2><p><strong>bold</strong> and <em>it</em></p><ul><li><p>a</p></li></ul>",
    );
    expect(editor.getMarkdown()).toBe("## Hi\n\n**bold** and *it*\n\n- a");
  });
});
