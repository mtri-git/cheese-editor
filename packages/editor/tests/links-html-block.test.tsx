import { Editor as TiptapEditor, type AnyExtension } from "@tiptap/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import { basicKit, Editor, FeatureRegistry, resolveFeatures } from "../src";
import { htmlBlock } from "../src/html-block";
import { renderToHtml } from "../src/render";

const editors: TiptapEditor[] = [];

function createEditor(content: string | object = "") {
  const resolved = resolveFeatures([...basicKit(), htmlBlock()]);
  const extensions: AnyExtension[] = [
    ...resolved.extensions,
    FeatureRegistry.configure({ resolved }),
  ];
  const editor = new TiptapEditor({ extensions, content });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  cleanup();
});

const linkOf = (editor: TiptapEditor) =>
  editor.getJSON().content?.[0]?.content?.[0]?.marks?.find((mark) => mark.type === "link");

describe("links", () => {
  test("a new link has no target and no rel: no nofollow on a site's own links", () => {
    const editor = createEditor("<p>hello</p>");
    editor.chain().setTextSelection({ from: 1, to: 6 }).setLink({ href: "/pricing" }).run();
    expect(linkOf(editor)?.attrs).toMatchObject({ href: "/pricing", target: null, rel: null });
    expect(editor.getHTML()).toBe('<p><a href="/pricing">hello</a></p>');
  });

  test("an autolinked URL has no nofollow either", () => {
    const editor = createEditor('<p><a href="https://gohub.com">gohub</a></p>');
    expect(editor.getHTML()).toBe('<p><a href="https://gohub.com">gohub</a></p>');
  });

  test("keeps the target and rel of HTML it opens", () => {
    const html =
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://x.dev">x</a></p>';
    expect(createEditor(html).getHTML()).toBe(html);
  });

  test('"Open in new tab" in the link popover adds target and noopener noreferrer only', async () => {
    let instance: TiptapEditor | null = null;
    const view = render(
      <Editor
        features={basicKit()}
        content="<p>hello</p>"
        onReady={(editor) => {
          instance = editor;
          editor.commands.setTextSelection({ from: 1, to: 6 });
        }}
      />,
    );
    await screen.findByRole("button", { name: "Link" });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = view.baseElement.querySelector<HTMLInputElement>(".ce-link-form input.ce-input");
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, { target: { value: "https://gohub.com" } });
    fireEvent.click(screen.getByLabelText("Open in new tab"));
    fireEvent.submit(input!.form as HTMLFormElement);
    expect(linkOf(instance!)?.attrs).toMatchObject({
      href: "https://gohub.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });
});

describe("htmlBlock", () => {
  const raw = '<div class="price"><span onclick="x()">1</span></div>';

  test("opens a block written as <div data-type=html-block>RAW</div>, as an import writes it", () => {
    const editor = createEditor(`<p>a</p><div data-type="html-block">${raw}</div>`);
    const block = editor.getJSON().content?.[1];
    expect(block).toMatchObject({ type: "htmlBlock", attrs: { html: raw } });
  });

  test("saves its HTML in an attribute, so nothing of it runs in the editor, and opens it again", () => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "htmlBlock", attrs: { html: raw } }],
    });
    const html = editor.getHTML();
    expect(html).toContain('data-type="html-block"');
    // Only an attribute: parsing the saved HTML creates no element from the block.
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(parsed.querySelector(".price, span")).toBeNull();
    expect(createEditor(html).getJSON().content?.[0]?.attrs?.html).toBe(raw);
  });

  test("render leaves it out unless the page allows it", () => {
    const doc = { type: "doc", content: [{ type: "htmlBlock", attrs: { html: raw } }] };
    expect(renderToHtml(doc)).toBe("");
    expect(renderToHtml(doc, { rawHtml: true })).toBe(`<div data-type="html-block">${raw}</div>`);
    expect(
      renderToHtml(doc, { rawHtml: (html) => html.replace(/ onclick="[^"]*"/, "") }),
    ).not.toContain("onclick");
    expect(renderToHtml(doc, { sanitize: () => "<b>clean</b>" })).toBe(
      '<div data-type="html-block"><b>clean</b></div>',
    );
  });
});
