/**
 * Render content saved by cheese-editor, for pages that only display it.
 *
 * No React, no DOM, no Tiptap: it runs on Cloudflare Workers, Node.js, Bun and in the browser, in any
 * framework. It renders the JSON document an editor holds (`editor.getJSON()`) to HTML. Only the nodes
 * and marks of cheese-editor's features are rendered. Anything else is skipped, text is escaped, URLs
 * are limited to safe schemes and colors to safe values, so a document is safe to put in a page as is.
 *
 * HTML strings (`editor.getHTML()`) are different: they are whatever was saved. They are only returned
 * through a `sanitize` function you pass in.
 *
 * Style the output with `cheese-editor/prose.css` (class `ce-prose`).
 */

import { toEmbedUrl } from "./core/embed";

export interface ContentMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ContentNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
  marks?: ContentMark[];
  text?: string;
}

/** What an editor holds: a document, an HTML string, or nothing. */
export type ContentValue = ContentNode | string | null | undefined;

export type NodeRenderer = (node: ContentNode, children: string) => string;
export type MarkRenderer = (mark: ContentMark, inner: string) => string;

export interface RenderOptions {
  /**
   * Cleans an HTML string (`editor.getHTML()`) and returns safe HTML. Pass DOMPurify
   * (`(html) => DOMPurify.sanitize(html)`), `sanitize-html`, or your own. Without it, rendering an HTML
   * string throws: nothing here guesses what is safe.
   */
  sanitize?: (html: string) => string;
  /**
   * Render a node type that is not built in (a `createNodeFeature` node, for example), or replace a
   * built-in one. `children` is the HTML of the node's content, already rendered. Return HTML and
   * escape what you insert (see `escapeHtml`). `dataNode()` makes the same `data-*` markup the editor
   * saves, for a component you mount on the page.
   */
  nodes?: Record<string, NodeRenderer>;
  /** Same as `nodes`, for marks. `inner` is the HTML the mark wraps. */
  marks?: Record<string, MarkRenderer>;
  /**
   * The character of an emoji, from its name (`smile` → 😄). Without it an emoji shows as `:smile:`.
   * See `createEmojiResolver` to build one from `gitHubEmojis`.
   */
  emoji?: (name: string) => string | null | undefined;
  /** Add `loading="lazy"` to images. Default `true`. */
  lazyImages?: boolean;
}

/** Documents nested deeper than this are cut off, so a hostile document cannot overflow the stack. */
const MAX_DEPTH = 64;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const isNode = (value: unknown): value is ContentNode =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// ---- URLs ------------------------------------------------------------------

const LINK_SCHEMES = new Set(["http", "https", "mailto", "tel"]);
const WEB_SCHEMES = new Set(["http", "https"]);

/**
 * Control characters, spaces and invisible separators: browsers skip them inside a URL scheme
 * (`java\tscript:`). Written as code points so no invisible character sits in this file.
 */
const isIgnoredInScheme = (code: number) =>
  code <= 0x20 ||
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200d) ||
  code === 0x2028 ||
  code === 0x2029 ||
  code === 0xfeff;

/**
 * The URL when it is safe, otherwise `null`. Relative URLs pass. A URL with a scheme must be in
 * `schemes`. Invisible characters are removed before the scheme is read.
 */
function safeUrl(value: unknown, schemes: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  const compact = Array.from(url)
    .filter((char) => !isIgnoredInScheme(char.codePointAt(0) ?? 0))
    .join("");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (scheme && !schemes.has(scheme[1].toLowerCase())) return null;
  return url;
}

// ---- Attributes ------------------------------------------------------------

const ALIGNMENTS = new Set(["center", "right", "justify"]);
const REL_TOKENS = new Set(["noopener", "noreferrer", "nofollow", "ugc", "sponsor"]);
const CALLOUT_VARIANTS = new Set(["info", "tip", "success", "warning", "danger"]);

/** A hex, `rgb()`/`hsl()` or named color. Nothing that could close a style value or call `url()`. */
const COLOR = /^(?:#[0-9a-f]{3,8}|[a-z]{3,30}|(?:rgb|hsl)a?\(\s*[\d.%\s,/-]{1,60}\))$/i;

const safeColor = (value: unknown): string | null =>
  typeof value === "string" && COLOR.test(value.trim()) ? value.trim() : null;

const attr = (name: string, value: string | number | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : ` ${name}="${escapeHtml(String(value))}"`;

/** `left` is the default, so only the other three are written. */
function alignStyle(node: ContentNode): string {
  const align = node.attrs?.textAlign;
  return typeof align === "string" && ALIGNMENTS.has(align) ? ` style="text-align: ${align};"` : "";
}

/** A whole number from 1 to `max`, or `null`. Accepts `"3"` as well as `3`. */
function positiveInt(value: unknown, max: number): number | null {
  const n = typeof value === "string" && /^\d{1,6}$/.test(value) ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 ? Math.min(n, max) : null;
}

// ---- Marks -----------------------------------------------------------------

const SIMPLE_MARKS: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
  strike: "s",
  code: "code",
};

function renderLink(mark: ContentMark, inner: string): string {
  const href = safeUrl(mark.attrs?.href, LINK_SCHEMES);
  // An unsafe link keeps its text and loses the anchor.
  if (!href) return inner;
  const blank = mark.attrs?.target === "_blank";
  const rel = new Set(
    typeof mark.attrs?.rel === "string"
      ? mark.attrs.rel.split(/\s+/).filter((token) => REL_TOKENS.has(token))
      : [],
  );
  if (blank) {
    rel.add("noopener");
    rel.add("noreferrer");
  }
  const title = typeof mark.attrs?.title === "string" ? mark.attrs.title : null;
  return `<a${blank ? ' target="_blank"' : ""}${attr("rel", [...rel].join(" "))}${attr("href", href)}${attr("title", title)}>${inner}</a>`;
}

function renderMark(mark: ContentMark, inner: string, options: RenderOptions): string {
  const custom = options.marks?.[mark.type];
  if (custom) return custom(mark, inner);
  switch (mark.type) {
    case "link":
      return renderLink(mark, inner);
    case "textStyle": {
      const color = safeColor(mark.attrs?.color);
      return color ? `<span style="color: ${color};">${inner}</span>` : inner;
    }
    case "highlight": {
      const color = safeColor(mark.attrs?.color);
      return color
        ? `<mark${attr("data-color", color)} style="background-color: ${color}; color: inherit;">${inner}</mark>`
        : `<mark>${inner}</mark>`;
    }
    default: {
      const tag = SIMPLE_MARKS[mark.type];
      // An unknown mark is dropped; its text stays.
      return tag ? `<${tag}>${inner}</${tag}>` : inner;
    }
  }
}

// ---- Nodes -----------------------------------------------------------------

const WRAPPERS: Record<string, string> = {
  paragraph: "p",
  blockquote: "blockquote",
  bulletList: "ul",
  listItem: "li",
  tableRow: "tr",
  detailsSummary: "summary",
};

function cellSpans(node: ContentNode): string {
  const colspan = positiveInt(node.attrs?.colspan, 1000);
  const rowspan = positiveInt(node.attrs?.rowspan, 1000);
  return `${colspan && colspan > 1 ? attr("colspan", colspan) : ""}${rowspan && rowspan > 1 ? attr("rowspan", rowspan) : ""}`;
}

function renderImage(node: ContentNode, options: RenderOptions): string {
  const src = safeUrl(node.attrs?.src, WEB_SCHEMES);
  if (!src) return "";
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return `<img${attr("src", src)}${attr("alt", text(node.attrs?.alt))}${attr("title", text(node.attrs?.title))}${attr("width", positiveInt(node.attrs?.width, 100000))}${attr("height", positiveInt(node.attrs?.height, 100000))}${options.lazyImages === false ? "" : ' loading="lazy"'}>`;
}

/**
 * YouTube and Vimeo become an iframe built from the video id alone. A direct video file becomes a
 * `<video>`. Any other address renders nothing: an arbitrary URL is never put in an iframe.
 */
function renderVideo(node: ContentNode): string {
  const src = typeof node.attrs?.src === "string" ? node.attrs.src.trim() : "";
  if (!src) return "";
  const embed = toEmbedUrl(src);
  if (embed) {
    return `<div data-type="video"${attr("data-src", src)}><iframe${attr("src", embed)} title="Video" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }
  const direct = safeUrl(src, WEB_SCHEMES);
  return direct
    ? `<div data-type="video"${attr("data-src", direct)}><video${attr("src", direct)} controls preload="metadata"></video></div>`
    : "";
}

function renderEmoji(node: ContentNode, options: RenderOptions): string {
  const name = node.attrs?.name;
  if (typeof name !== "string" || !/^[\w+-]{1,64}$/.test(name)) return "";
  const glyph = options.emoji?.(name);
  const text = typeof glyph === "string" && glyph ? glyph : `:${name}:`;
  return `<span data-type="emoji"${attr("data-name", name)}>${escapeHtml(text)}</span>`;
}

function renderChildren(node: ContentNode, options: RenderOptions, depth: number): string {
  if (!Array.isArray(node.content)) return "";
  let html = "";
  for (const child of node.content) html += renderNode(child, options, depth + 1);
  return html;
}

function renderNode(node: unknown, options: RenderOptions, depth: number): string {
  if (!isNode(node) || depth > MAX_DEPTH) return "";
  const type = node.type ?? "";

  if (type === "text") {
    let html = escapeHtml(typeof node.text === "string" ? node.text : "");
    const marks = Array.isArray(node.marks) ? node.marks.filter((mark) => isNode(mark)) : [];
    // The first mark is the outermost, like Tiptap's own output.
    for (let i = marks.length - 1; i >= 0; i--) html = renderMark(marks[i], html, options);
    return html;
  }

  const children = renderChildren(node, options, depth);

  const custom = options.nodes?.[type];
  if (custom) return custom(node, children);

  switch (type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p${alignStyle(node)}>${children}</p>`;
    case "heading": {
      const level = positiveInt(node.attrs?.level, 6) ?? 2;
      return `<h${level}${alignStyle(node)}>${children}</h${level}>`;
    }
    case "orderedList": {
      const start = positiveInt(node.attrs?.start, 1_000_000);
      return `<ol${start && start !== 1 ? attr("start", start) : ""}>${children}</ol>`;
    }
    case "taskList":
      return `<ul data-type="taskList">${children}</ul>`;
    case "taskItem": {
      const checked = node.attrs?.checked === true;
      // Read-only: a page shows the state, it does not toggle it.
      return `<li data-checked="${checked}" data-type="taskItem"><label><input type="checkbox"${checked ? " checked" : ""} disabled><span></span></label><div>${children}</div></li>`;
    }
    case "codeBlock": {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      const safe = /^[\w+#.-]{1,30}$/.test(language) ? language : "";
      return `<pre><code${safe ? ` class="language-${safe}"` : ""}>${children}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "hardBreak":
      return "<br>";
    case "image":
      return renderImage(node, options);
    case "table":
      return `<table><tbody>${children}</tbody></table>`;
    case "tableHeader":
      return `<th${cellSpans(node)}>${children}</th>`;
    case "tableCell":
      return `<td${cellSpans(node)}>${children}</td>`;
    case "callout": {
      const variant = node.attrs?.variant;
      const safe = typeof variant === "string" && CALLOUT_VARIANTS.has(variant) ? variant : "info";
      return `<div data-type="callout" data-variant="${safe}">${children}</div>`;
    }
    case "details":
      return `<details${node.attrs?.open === true ? " open" : ""}>${children}</details>`;
    case "detailsContent":
      return `<div data-type="detailsContent">${children}</div>`;
    case "video":
      return renderVideo(node);
    case "emoji":
      return renderEmoji(node, options);
    default: {
      const tag = WRAPPERS[type];
      // An unknown node is not wrapped, but its content still shows.
      return tag ? `<${tag}>${children}</${tag}>` : children;
    }
  }
}

// ---- Public API ------------------------------------------------------------

/** Render a JSON document (`editor.getJSON()`) to HTML. Never throws on bad input: it renders what it can. */
export function renderToHtml(
  doc: ContentNode | null | undefined,
  options: RenderOptions = {},
): string {
  return renderNode(doc, options, 0);
}

/**
 * Render what an editor holds, whichever way it was saved.
 *
 * - JSON document: rendered safely, no options needed.
 * - HTML string: returned through `options.sanitize`. Throws a `TypeError` when there is none.
 * - `null`, `undefined`, an empty string: `''`.
 */
export function renderContent(value: ContentValue, options: RenderOptions = {}): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") {
    if (!options.sanitize) {
      throw new TypeError(
        "renderContent: this content is an HTML string. Pass `sanitize` (e.g. DOMPurify.sanitize) to render it, or save the JSON (editor.getJSON()) instead.",
      );
    }
    return options.sanitize(value);
  }
  return renderToHtml(value, options);
}

// ---- Helpers for `nodes` and `emoji` ---------------------------------------

const toKebab = (value: string) => value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Renders a `createNodeFeature` node the way the editor saves it: `<div data-type="product-card"
 * data-product-id="…">`, with its content inside. Mount your component on `[data-type="product-card"]`.
 * Use `{ inline: true }` for a node created with `inline: true`.
 *
 * ```ts
 * renderContent(doc, { nodes: { productCard: dataNode() } })
 * ```
 */
export function dataNode(options: { inline?: boolean } = {}): NodeRenderer {
  const tag = options.inline ? "span" : "div";
  return (node, children) => {
    const type = node.type ?? "";
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(type)) return "";
    let attributes = "";
    for (const [key, value] of Object.entries(node.attrs ?? {})) {
      // `type` is the data-type; other names must be plain identifiers.
      if (key === "type" || !/^[A-Za-z][A-Za-z0-9]*$/.test(key)) continue;
      if (value === null || value === undefined) continue;
      attributes += attr(
        `data-${toKebab(key)}`,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
    return `<${tag} data-type="${toKebab(type)}"${attributes}>${children}</${tag}>`;
  };
}

/**
 * Build the `emoji` option from an emoji list such as `gitHubEmojis` from `@tiptap/extension-emoji`.
 * Takes any `{ name, emoji? }[]`, so this file needs no Tiptap import.
 */
export function createEmojiResolver(
  items: ReadonlyArray<{ name: string; emoji?: string }>,
): (name: string) => string | undefined {
  const byName = new Map<string, string>();
  for (const item of items) if (item.emoji) byName.set(item.name, item.emoji);
  return (name) => byName.get(name);
}

// ---- Plain text ------------------------------------------------------------

const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

function textOf(node: unknown, depth: number): string {
  if (!isNode(node) || depth > MAX_DEPTH) return "";
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "emoji")
    return typeof node.attrs?.name === "string" ? `:${node.attrs.name}:` : "";
  if (!Array.isArray(node.content)) return "";
  const parts = node.content.map((child) => textOf(child, depth + 1));
  switch (node.type) {
    // Inline content: concatenated.
    case "paragraph":
    case "heading":
    case "codeBlock":
    case "detailsSummary":
      return parts.join("");
    // Rows take a line, cells sit side by side.
    case "tableRow":
      return parts.filter(Boolean).join(" ");
    case "table":
      return parts.filter(Boolean).join("\n");
    default:
      return parts.filter(Boolean).join(node.type && LIST_TYPES.has(node.type) ? "\n" : "\n\n");
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|ul|ol|table|summary)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === "#") {
        const code =
          entity[1].toLowerCase() === "x"
            ? Number.parseInt(entity.slice(2), 16)
            : Number(entity.slice(1));
        return Number.isInteger(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    });
}

/**
 * The text of a content value, without markup. For excerpts, meta descriptions and search indexes.
 * For an HTML string the tags are stripped: that is for previews, it does NOT make HTML safe.
 */
export function toPlainText(value: ContentValue): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? stripHtml(value) : textOf(value, 0);
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
