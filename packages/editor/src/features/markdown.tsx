import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { FileDown, FileUp } from "lucide-react";

import { ToolbarButton } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";
import { downloadFile, pickFiles } from "../core/utils";

export interface MarkdownFeatureOptions {
  /** Convert pasted plain text that looks like markdown. Default true. */
  paste?: boolean;
  /** Show the "Import .md" toolbar button. Default true. */
  importButton?: boolean;
  /** Show the "Export .md" toolbar button. Default true. */
  exportButton?: boolean;
  /** File name used when exporting. Default "document.md". */
  exportFileName?: string;
}

const MARKDOWN_HINTS = [
  /^#{1,6}\s+\S/m, // heading
  /^\s*[-*+]\s+\S/m, // bullet list
  /^\s*\d+\.\s+\S/m, // ordered list
  /^\s*>\s+\S/m, // blockquote
  /^```/m, // fenced code
  /^\s*\|.+\|\s*$/m, // table row
  /\*\*[^*\n]+\*\*/, // bold
  /\[[^\]\n]+\]\([^)\n]+\)/, // link
  /^\s*- \[[ xX]\]\s/m, // task
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINTS.some((pattern) => pattern.test(text));
}

/**
 * Load markdown into the editor.
 * - `replace`: replace the whole document
 * - `insert`: insert at the current selection
 * - `auto` (default): replace when the editor is empty, otherwise insert
 */
export function importMarkdown(
  editor: Editor,
  markdown: string,
  mode: "auto" | "replace" | "insert" = "auto",
) {
  const replace = mode === "replace" || (mode === "auto" && editor.isEmpty);
  if (replace) {
    return editor
      .chain()
      .focus()
      .setContent(markdown, { contentType: "markdown", emitUpdate: true })
      .run();
  }
  return editor.chain().focus().insertContent(markdown, { contentType: "markdown" }).run();
}

export async function importMarkdownFile(
  editor: Editor,
  mode: "auto" | "replace" | "insert" = "auto",
) {
  const [file] = await pickFiles(".md,.markdown,.txt,text/markdown");
  if (!file) return false;
  return importMarkdown(editor, await file.text(), mode);
}

const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey("ceMarkdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            const html = event.clipboardData?.getData("text/html");
            if (!text || html || view.state.selection.$from.parent.type.spec.code) return false;
            if (!looksLikeMarkdown(text)) return false;
            return editor.commands.insertContent(text, { contentType: "markdown" });
          },
        },
      }),
    ];
  },
});

/** Markdown import (file / paste) and export. Markdown parsing itself is always enabled in `<Editor>`. */
export function markdown(options: MarkdownFeatureOptions = {}) {
  const {
    paste = true,
    importButton = true,
    exportButton = true,
    exportFileName = "document.md",
  } = options;

  return defineFeature({
    name: "markdown",
    extensions: paste ? [MarkdownPaste] : [],
    toolbar: [
      ...(importButton
        ? [
            {
              id: "importMarkdown",
              group: "io",
              render: ({ editor }: { editor: Editor }) => (
                <ToolbarButton
                  icon={FileUp}
                  title="Import Markdown (.md)"
                  disabled={!editor.isEditable}
                  onClick={() => void importMarkdownFile(editor)}
                />
              ),
            },
          ]
        : []),
      ...(exportButton
        ? [
            {
              id: "exportMarkdown",
              group: "io",
              render: ({ editor }: { editor: Editor }) => (
                <ToolbarButton
                  icon={FileDown}
                  title="Export Markdown (.md)"
                  onClick={() =>
                    downloadFile(exportFileName, editor.getMarkdown(), "text/markdown")
                  }
                />
              ),
            },
          ]
        : []),
    ],
  });
}
