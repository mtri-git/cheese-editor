import { Code2, Trash } from "lucide-react";

import { ToolbarButton } from "../components/ToolbarButton";
import { createNodeFeature } from "../core/createNodeFeature";

/**
 * A block of raw HTML, kept as written: an embed widget, a styled table, a form from another service...
 * The editor shows its source and a preview in a sandboxed frame where no script runs. Saved HTML
 * (`getHTML()`) holds it as `<div data-type="html-block" data-html="...">`, so nothing of it runs in
 * the editor. On a page, `cheese-editor/render` outputs it only when you allow it (`rawHtml`).
 *
 * HTML that is opened in the editor keeps a block written as `<div data-type="html-block">RAW</div>`,
 * which is how an import can bring in HTML the editor has no node for.
 */
export const htmlBlock = () =>
  createNodeFeature({
    name: "htmlBlock",
    attrs: { html: "" },
    component: ({ attrs, updateAttrs, editable, selected }) => (
      <div
        className={["ce-html-block", selected && "is-selected"].filter(Boolean).join(" ")}
        contentEditable={false}
      >
        <textarea
          className="ce-input ce-html-source"
          aria-label="HTML"
          spellCheck={false}
          readOnly={!editable}
          placeholder="<div>…</div>"
          value={attrs.html}
          onChange={(event) => updateAttrs({ html: event.target.value })}
        />
        {attrs.html.trim() ? (
          // No `allow-scripts`, no `allow-same-origin`: the preview cannot run code or reach the page.
          <iframe className="ce-html-preview" title="HTML preview" sandbox="" srcDoc={attrs.html} />
        ) : null}
      </div>
    ),
    toolbar: { icon: Code2, title: "HTML" },
    slash: {
      title: "HTML",
      description: "Raw HTML block",
      icon: Code2,
      keywords: ["html", "embed", "raw", "code"],
    },
    bubble: ({ deleteNode }) => (
      <ToolbarButton icon={Trash} title="Delete HTML block" onClick={deleteNode} />
    ),
    extend: {
      addAttributes() {
        return {
          html: {
            default: "",
            // `data-html` as the editor writes it, else the content of the block (an import).
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("data-html") ?? element.innerHTML,
            renderHTML: (attributes: Record<string, unknown>) => ({
              "data-html": typeof attributes.html === "string" ? attributes.html : "",
            }),
          },
        };
      },
    },
  });
