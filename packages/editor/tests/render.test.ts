// @vitest-environment node
import { generateHTML } from "@tiptap/html/server";
import { describe, expect, test } from "vite-plus/test";

import { basicKit, resolveFeatures } from "../src";
import { callout } from "../src/callout";
import { codeBlock } from "../src/code-block";
import { details } from "../src/details";
import { emoji } from "../src/emoji";
import { image } from "../src/image";
import {
  type ContentNode,
  createEmojiResolver,
  dataNode,
  renderContent,
  renderToHtml,
  toPlainText,
} from "../src/render";
import { table } from "../src/table";
import { video } from "../src/video";

const t = (text: string, marks?: ContentNode["marks"]): ContentNode => ({
  type: "text",
  text,
  ...(marks ? { marks } : {}),
});
const p = (...content: ContentNode[]): ContentNode => ({ type: "paragraph", content });
const doc = (...content: ContentNode[]): ContentNode => ({ type: "doc", content });
const link = (href: string, extra: Record<string, unknown> = {}) => [
  { type: "link", attrs: { href, ...extra } },
];

/** A document that uses every node and mark of the editor, except video and emoji (tested below). */
const everything = doc(
  { type: "heading", attrs: { level: 1, textAlign: "center" }, content: [t("Title")] },
  {
    type: "paragraph",
    attrs: { textAlign: "right" },
    content: [
      t("a", [{ type: "bold" }, { type: "italic" }]),
      t("u", [{ type: "underline" }]),
      t("s", [{ type: "strike" }]),
      t("c", [{ type: "code" }]),
      t("l", link("https://x.dev", { target: "_blank", rel: "noopener noreferrer nofollow" })),
      t("red", [{ type: "textStyle", attrs: { color: "#e03131" } }]),
      t("hl", [{ type: "highlight", attrs: { color: "#ffec99" } }]),
      t("plain", [{ type: "highlight" }]),
    ],
  },
  { type: "blockquote", content: [p(t("quote"))] },
  { type: "bulletList", content: [{ type: "listItem", content: [p(t("bullet"))] }] },
  {
    type: "orderedList",
    attrs: { start: 3 },
    content: [{ type: "listItem", content: [p(t("one"))] }],
  },
  {
    type: "taskList",
    content: [
      { type: "taskItem", attrs: { checked: true }, content: [p(t("done"))] },
      { type: "taskItem", attrs: { checked: false }, content: [p(t("todo"))] },
    ],
  },
  { type: "codeBlock", attrs: { language: "ts" }, content: [t("const a = 1")] },
  {
    type: "image",
    attrs: { src: "https://x.dev/a.png", alt: "A", title: "T", width: 120, height: 80 },
  },
  { type: "callout", attrs: { variant: "tip" }, content: [p(t("tip body"))] },
  {
    type: "details",
    attrs: { open: true },
    content: [
      { type: "detailsSummary", content: [t("Sum")] },
      { type: "detailsContent", content: [p(t("hidden"))] },
    ],
  },
  {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: [
          {
            type: "tableHeader",
            attrs: { colspan: 2, colwidth: [100, 120] },
            content: [p(t("H"))],
          },
        ],
      },
      {
        type: "tableRow",
        content: [
          { type: "tableCell", content: [p(t("c"))] },
          {
            type: "tableCell",
            attrs: { rowspan: 2, colspan: 1 },
            content: [{ type: "paragraph" }],
          },
        ],
      },
    ],
  },
  { type: "horizontalRule" },
  p(t("x"), { type: "hardBreak" }, t("y")),
);

// Structure only: attributes, <colgroup> and whitespace are compared in the exact-output tests below.
const structure = (html: string) =>
  html
    .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, "")
    .replace(/<(\w+)(\s[^>]*)?>/g, "<$1>")
    .replace(/\s+/g, "");

describe("renderToHtml", () => {
  test("has the same structure as the HTML Tiptap generates from this editor's own features", () => {
    const { extensions } = resolveFeatures([
      ...basicKit(),
      image(),
      table(),
      codeBlock(),
      callout(),
      details(),
      video(),
      emoji(),
    ]);
    expect(structure(renderToHtml(everything))).toBe(
      structure(generateHTML(everything as never, extensions)),
    );
  });

  test("renders what the editor saved", () => {
    const saved = doc(p(t("Đậm", [{ type: "bold" }]), t(" và chữ thường.")));
    expect(renderToHtml(saved)).toBe("<p><strong>Đậm</strong> và chữ thường.</p>");
  });

  test("writes attributes the way Tiptap does", () => {
    const html = renderToHtml(everything);
    expect(html).toContain('<h1 style="text-align: center;">Title</h1>');
    expect(html).toContain('<p style="text-align: right;">');
    expect(html).toContain("<strong><em>a</em></strong>");
    expect(html).toContain(
      '<a target="_blank" rel="noopener noreferrer nofollow" href="https://x.dev">l</a>',
    );
    expect(html).toContain('<span style="color: #e03131;">red</span>');
    expect(html).toContain(
      '<mark data-color="#ffec99" style="background-color: #ffec99; color: inherit;">hl</mark>',
    );
    expect(html).toContain("<mark>plain</mark>");
    expect(html).toContain('<ol start="3">');
    expect(html).toContain(
      '<li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked disabled>',
    );
    expect(html).toContain('<pre><code class="language-ts">const a = 1</code></pre>');
    expect(html).toContain(
      '<img src="https://x.dev/a.png" alt="A" title="T" width="120" height="80" loading="lazy">',
    );
    expect(html).toContain('<div data-type="callout" data-variant="tip"><p>tip body</p></div>');
    expect(html).toContain(
      '<details open><summary>Sum</summary><div data-type="detailsContent"><p>hidden</p></div></details>',
    );
    expect(html).toContain('<th colspan="2">');
    expect(html).toContain('<td rowspan="2">');
    expect(html).toContain("<p>x<br>y</p>");
  });

  test("leaves out defaults: left alignment, start 1, spans of 1, a closed details", () => {
    const html = renderToHtml(
      doc(
        { type: "paragraph", attrs: { textAlign: "left" }, content: [t("a")] },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [{ type: "listItem", content: [p(t("b"))] }],
        },
        {
          type: "details",
          attrs: { open: false },
          content: [{ type: "detailsSummary", content: [t("s")] }],
        },
      ),
    );
    expect(html).toBe("<p>a</p><ol><li><p>b</p></li></ol><details><summary>s</summary></details>");
  });

  test("can turn off lazy images", () => {
    const image = doc({ type: "image", attrs: { src: "/a.png" } });
    expect(renderToHtml(image)).toBe('<img src="/a.png" loading="lazy">');
    expect(renderToHtml(image, { lazyImages: false })).toBe('<img src="/a.png">');
  });

  test("renders nothing for empty input", () => {
    expect(renderToHtml(null)).toBe("");
    expect(renderToHtml(undefined)).toBe("");
    expect(renderToHtml({} as ContentNode)).toBe("");
    expect(renderToHtml(doc())).toBe("");
  });
});

describe("colors", () => {
  test.each(["#e03131", "#fff", "red", "rgb(1, 2, 3)", "rgba(1,2,3,0.5)", "hsl(120 50% 50%)"])(
    "keeps a safe color (%s)",
    (color) => {
      const html = renderToHtml(doc(p(t("c", [{ type: "textStyle", attrs: { color } }]))));
      expect(html).toBe(`<p><span style="color: ${color};">c</span></p>`);
    },
  );

  test.each([
    "red;background:url(https://evil.dev)",
    "url(javascript:alert(1))",
    "expression(alert(1))",
    '#fff" onload="alert(1)',
    "rgb(1,2,3);x",
    "var(--x)",
    "",
    null,
    42,
  ])("drops an unsafe color (%j) and keeps the text", (color) => {
    expect(renderToHtml(doc(p(t("c", [{ type: "textStyle", attrs: { color } }]))))).toBe(
      "<p>c</p>",
    );
    expect(renderToHtml(doc(p(t("c", [{ type: "highlight", attrs: { color } }]))))).toBe(
      "<p><mark>c</mark></p>",
    );
  });
});

describe("callout, details", () => {
  test("only writes known callout variants", () => {
    for (const variant of ["info", "tip", "success", "warning", "danger"]) {
      expect(renderToHtml(doc({ type: "callout", attrs: { variant }, content: [p(t("a"))] }))).toBe(
        `<div data-type="callout" data-variant="${variant}"><p>a</p></div>`,
      );
    }
    const html = renderToHtml(
      doc({ type: "callout", attrs: { variant: 'x" onclick="alert(1)' }, content: [p(t("a"))] }),
    );
    expect(html).toBe('<div data-type="callout" data-variant="info"><p>a</p></div>');
  });
});

describe("video", () => {
  const video = (src: unknown) => renderToHtml(doc({ type: "video", attrs: { src } }));

  test("embeds YouTube from the video id", () => {
    const html = video("https://youtu.be/dQw4w9WgXcQ");
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('data-src="https://youtu.be/dQw4w9WgXcQ"');
    expect(html).toContain('loading="lazy" allowfullscreen');
  });

  test("embeds Vimeo from the video id", () => {
    expect(video("https://vimeo.com/123456789")).toContain(
      '<iframe src="https://player.vimeo.com/video/123456789"',
    );
  });

  test("never puts the given URL in an iframe", () => {
    const html = video("https://evil.dev/?u=youtube.com/watch?v=aaaaaaaaaaa&x=1");
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/aaaaaaaaaaa"');
    expect(html.match(/<iframe src="([^"]*)"/)?.[1]).toBe(
      "https://www.youtube.com/embed/aaaaaaaaaaa",
    );
  });

  test("renders a direct video file as <video>", () => {
    expect(video("https://x.dev/a.mp4")).toBe(
      '<div data-type="video" data-src="https://x.dev/a.mp4"><video src="https://x.dev/a.mp4" controls preload="metadata"></video></div>',
    );
    expect(video("/media/a.webm")).toContain('<video src="/media/a.webm"');
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "file:///etc/passwd",
    "",
    "   ",
    null,
    5,
  ])("renders nothing for an unsafe or empty source (%j)", (src) => {
    expect(video(src)).toBe("");
  });
});

describe("emoji", () => {
  const emojiDoc = doc(p(t("hi "), { type: "emoji", attrs: { name: "smile" } }));

  test("shows :name: without a resolver", () => {
    expect(renderToHtml(emojiDoc)).toBe(
      '<p>hi <span data-type="emoji" data-name="smile">:smile:</span></p>',
    );
  });

  test("shows the character with a resolver", () => {
    const resolve = createEmojiResolver([{ name: "smile", emoji: "😄" }, { name: "custom" }]);
    expect(renderToHtml(emojiDoc, { emoji: resolve })).toBe(
      '<p>hi <span data-type="emoji" data-name="smile">😄</span></p>',
    );
    // An emoji without a character falls back to its name.
    expect(
      renderToHtml(doc(p({ type: "emoji", attrs: { name: "custom" } })), { emoji: resolve }),
    ).toContain(">:custom:</span>");
  });

  test("escapes what a resolver returns and drops odd names", () => {
    expect(renderToHtml(emojiDoc, { emoji: () => "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(renderToHtml(doc(p({ type: "emoji", attrs: { name: '"><x' } })))).toBe("<p></p>");
    expect(renderToHtml(doc(p({ type: "emoji", attrs: {} })))).toBe("<p></p>");
  });
});

describe("safety", () => {
  test("escapes text", () => {
    const html = renderToHtml(doc(p(t("<script>alert(1)</script> & \"q\" 's'"))));
    expect(html).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot; &#39;s&#39;</p>",
    );
  });

  test("escapes attributes", () => {
    const html = renderToHtml(
      doc({
        type: "image",
        attrs: { src: "https://x.dev/a.png", alt: '"><img src=x onerror=alert(1)>' },
      }),
    );
    expect(html).not.toContain("<img src=x");
    expect(html).toContain('alt="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
  });

  test.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "  javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ])("drops the anchor of an unsafe link (%j) and keeps the text", (href) => {
    expect(renderToHtml(doc(p(t("click", link(href)))))).toBe("<p>click</p>");
  });

  test.each([
    "https://x.dev/a?b=1",
    "http://x.dev",
    "mailto:a@x.dev",
    "tel:+84123",
    "/docs",
    "#top",
    "../up",
    "page.html",
  ])("keeps a safe link (%s)", (href) => {
    expect(renderToHtml(doc(p(t("l", link(href)))))).toContain(`href="${href}"`);
  });

  test("always adds noopener noreferrer to links that open a new tab", () => {
    const html = renderToHtml(doc(p(t("l", link("/a", { target: "_blank", rel: null })))));
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  });

  test("ignores a link target other than _blank and unknown rel values", () => {
    const html = renderToHtml(
      doc(p(t("l", link("/a", { target: "evil", rel: "nofollow onclick=x" })))),
    );
    expect(html).toBe('<p><a rel="nofollow" href="/a">l</a></p>');
  });

  test("drops images that are not http(s) or relative", () => {
    for (const src of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "ftp://x.dev/a.png",
      "",
    ]) {
      expect(renderToHtml(doc({ type: "image", attrs: { src } }))).toBe("");
    }
  });

  test("accepts only whole numbers as image sizes", () => {
    const html = renderToHtml(
      doc({ type: "image", attrs: { src: "/a.png", width: '10" onload="x', height: "20" } }),
    );
    expect(html).toBe('<img src="/a.png" height="20" loading="lazy">');
  });

  test("only writes known alignments, languages and heading levels", () => {
    expect(
      renderToHtml(
        doc({ type: "paragraph", attrs: { textAlign: "center;color:red" }, content: [t("a")] }),
      ),
    ).toBe("<p>a</p>");
    expect(
      renderToHtml(doc({ type: "codeBlock", attrs: { language: 'x"><b>' }, content: [t("a")] })),
    ).toBe("<pre><code>a</code></pre>");
    expect(renderToHtml(doc({ type: "heading", attrs: { level: 99 }, content: [t("a")] }))).toBe(
      "<h6>a</h6>",
    );
    expect(renderToHtml(doc({ type: "heading", attrs: { level: "x" }, content: [t("a")] }))).toBe(
      "<h2>a</h2>",
    );
  });

  test("skips unknown nodes but keeps their content, and drops unknown marks", () => {
    const html = renderToHtml(
      doc(
        { type: "iframe", attrs: { src: "https://evil.dev" } },
        { type: "script", content: [p(t("inside"))] },
        p(t("x", [{ type: "onclick", attrs: { value: "alert(1)" } }])),
      ),
    );
    expect(html).toBe("<p>inside</p><p>x</p>");
  });

  test("survives documents nested far too deep", () => {
    let node: ContentNode = p(t("deep"));
    for (let i = 0; i < 5000; i++) node = { type: "blockquote", content: [node] };
    expect(() => renderToHtml(doc(node))).not.toThrow();
  });

  test("survives malformed documents", () => {
    const bad = {
      type: "doc",
      content: [null, 1, "x", [], { type: "paragraph", content: "no" }, { type: "text", text: 5 }],
    };
    expect(() => renderToHtml(bad as unknown as ContentNode)).not.toThrow();
  });
});

describe("extending", () => {
  test("renders custom nodes and marks, and can replace built-in ones", () => {
    const html = renderToHtml(
      doc({ type: "note", content: [p(t("Hi", [{ type: "badge" }]))] }, { type: "horizontalRule" }),
      {
        nodes: {
          note: (_node, children) => `<aside>${children}</aside>`,
          horizontalRule: () => '<hr class="fancy">',
        },
        marks: { badge: (_mark, inner) => `<span class="badge">${inner}</span>` },
      },
    );
    expect(html).toBe('<aside><p><span class="badge">Hi</span></p></aside><hr class="fancy">');
  });

  test("dataNode renders a createNodeFeature node the way the editor saves it", () => {
    const product = doc({
      type: "productCard",
      attrs: { productId: "sp-001", layout: "horizontal", meta: { a: 1 }, empty: null, type: "x" },
    });
    expect(renderToHtml(product, { nodes: { productCard: dataNode() } })).toBe(
      '<div data-type="product-card" data-product-id="sp-001" data-layout="horizontal" data-meta="{&quot;a&quot;:1}"></div>',
    );
  });

  test("dataNode supports inline nodes, content and refuses odd names", () => {
    const inline = doc(p({ type: "mention", attrs: { userId: "7" }, content: [t("@ann")] }));
    expect(renderToHtml(inline, { nodes: { mention: dataNode({ inline: true }) } })).toBe(
      '<p><span data-type="mention" data-user-id="7">@ann</span></p>',
    );
    const odd = doc({ type: 'bad"type', attrs: { 'x"y': "1" } });
    expect(renderToHtml(odd, { nodes: { 'bad"type': dataNode() } })).toBe("");
    expect(
      renderToHtml(doc({ type: "box", attrs: { 'x" onclick="y': "1", ok: '"><b>' } }), {
        nodes: { box: dataNode() },
      }),
    ).toBe('<div data-type="box" data-ok="&quot;&gt;&lt;b&gt;"></div>');
  });
});

describe("renderContent", () => {
  test("renders a JSON document without options", () => {
    expect(renderContent(doc(p(t("a"))))).toBe("<p>a</p>");
  });

  test("returns an empty string for no content", () => {
    expect(renderContent(null)).toBe("");
    expect(renderContent(undefined)).toBe("");
    expect(renderContent("")).toBe("");
  });

  test("refuses an HTML string without a sanitizer", () => {
    expect(() => renderContent("<p>hi</p><script>alert(1)</script>")).toThrow(TypeError);
  });

  test("passes an HTML string through the sanitizer", () => {
    const seen: string[] = [];
    const html = renderContent('<p onclick="x">hi</p>', {
      sanitize: (dirty) => {
        seen.push(dirty);
        return dirty.replace(/ onclick="[^"]*"/g, "");
      },
    });
    expect(seen).toEqual(['<p onclick="x">hi</p>']);
    expect(html).toBe("<p>hi</p>");
  });
});

describe("toPlainText", () => {
  test("flattens a document", () => {
    const text = toPlainText(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Title")] },
        p(t("Hello "), t("world", [{ type: "bold" }]), { type: "hardBreak" }, t("again ")),
        p(t("hi "), { type: "emoji", attrs: { name: "smile" } }),
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [p(t("one"))] },
            { type: "listItem", content: [p(t("two"))] },
          ],
        },
        {
          type: "details",
          content: [
            { type: "detailsSummary", content: [t("Sum")] },
            { type: "detailsContent", content: [p(t("body"))] },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [p(t("a"))] },
                { type: "tableCell", content: [p(t("b"))] },
              ],
            },
          ],
        },
        { type: "image", attrs: { src: "/a.png", alt: "ignored" } },
        { type: "video", attrs: { src: "https://youtu.be/dQw4w9WgXcQ" } },
      ),
    );
    expect(text).toBe(
      "Title\n\nHello world\nagain\n\nhi :smile:\n\none\ntwo\n\nSum\n\nbody\n\na b",
    );
  });

  test("strips the tags of an HTML string and decodes entities", () => {
    expect(
      toPlainText(
        "<h2>A &amp; B</h2><p>x<br>y &lt;z&gt; &#39;q&#x27;&nbsp;end</p><script>bad()</script>",
      ),
    ).toBe("A & B\nx\ny <z> 'q' end");
  });

  test("handles no content", () => {
    expect(toPlainText(null)).toBe("");
    expect(toPlainText(undefined)).toBe("");
    expect(toPlainText(doc())).toBe("");
  });
});
