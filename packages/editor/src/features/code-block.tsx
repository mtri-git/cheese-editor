import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { SquareCode } from "lucide-react";

import { ToolbarButton } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";

type Lowlight = ReturnType<typeof createLowlight>;

export interface CodeBlockFeatureOptions {
  /** Custom lowlight instance. Defaults to `createLowlight(common)` (~35 common languages). */
  lowlight?: Lowlight;
  defaultLanguage?: string | null;
}

function CodeBlockView({ node, updateAttributes, extension, editor }: ReactNodeViewProps) {
  const lowlight = extension.options.lowlight as Lowlight;
  const language = (node.attrs.language as string | null) ?? "";
  // Keep aliases such as "ts" selectable even though listLanguages() only returns canonical names.
  const languages = [
    ...new Set([...lowlight.listLanguages(), ...(language ? [language] : [])]),
  ].sort();

  return (
    <NodeViewWrapper className="ce-code-block">
      <select
        className="ce-code-language"
        contentEditable={false}
        disabled={!editor.isEditable}
        value={language}
        onChange={(event) => updateAttributes({ language: event.target.value || null })}
      >
        <option value="">auto</option>
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent<"code">
          as="code"
          className={language ? `language-${language}` : undefined}
        />
      </pre>
    </NodeViewWrapper>
  );
}

export function codeBlock(options: CodeBlockFeatureOptions = {}) {
  const lowlight = options.lowlight ?? createLowlight(common);

  return defineFeature({
    name: "codeBlock",
    extensions: [
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }).configure({ lowlight, defaultLanguage: options.defaultLanguage ?? null }),
    ],
    toolbar: [
      {
        id: "codeBlock",
        group: "insert",
        render: ({ editor }) => (
          <ToolbarButton
            icon={SquareCode}
            title="Code block"
            shortcut="Mod-Alt-C"
            active={editor.isActive("codeBlock")}
            disabled={!editor.isEditable}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
        ),
      },
    ],
    slash: [
      {
        id: "codeBlock",
        title: "Code block",
        description: "Syntax highlighted code",
        icon: SquareCode,
        group: "Insert",
        keywords: ["code", "pre", "```"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
      },
    ],
  });
}
