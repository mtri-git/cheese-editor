import type { MarkdownToken } from "@tiptap/core";
import {
  CircleCheck,
  Info,
  Lightbulb,
  MessageSquareWarning,
  OctagonAlert,
  Trash,
  TriangleAlert,
} from "lucide-react";

import { ToolbarButton, ToolbarSeparator } from "../components/ToolbarButton";
import { createNodeFeature, NodeContent } from "../core/createNodeFeature";
import type { IconComponent } from "../core/types";

export type CalloutType = "info" | "tip" | "success" | "warning" | "danger";

const TYPES: Record<CalloutType, { icon: IconComponent; label: string; github: string }> = {
  info: { icon: Info, label: "Info", github: "NOTE" },
  tip: { icon: Lightbulb, label: "Tip", github: "TIP" },
  success: { icon: CircleCheck, label: "Success", github: "IMPORTANT" },
  warning: { icon: TriangleAlert, label: "Warning", github: "WARNING" },
  danger: { icon: OctagonAlert, label: "Danger", github: "CAUTION" },
};

/** `> [!TIP]` header line followed by the remaining `>` lines of the quote. */
const ALERT_PATTERN =
  /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/i;

function variantFromGithub(name: string): CalloutType {
  const upper = name.toUpperCase();
  const entry = Object.entries(TYPES).find(([, value]) => value.github === upper);
  return (entry?.[0] as CalloutType | undefined) ?? "info";
}

/**
 * Colored note block with editable content.
 * Markdown: imports and exports GitHub alert syntax (`> [!NOTE]`, `> [!TIP]`, ...).
 */
export const callout = () =>
  createNodeFeature({
    name: "callout",
    attrs: { variant: "info" as CalloutType },
    content: true,
    component: ({ attrs }) => {
      const Icon = (TYPES[attrs.variant] ?? TYPES.info).icon;
      return (
        <div className={`ce-callout ce-callout-${attrs.variant}`}>
          <span className="ce-callout-icon" contentEditable={false}>
            <Icon size={18} />
          </span>
          <NodeContent className="ce-callout-content" />
        </div>
      );
    },
    markdown: (attrs, children) => {
      const body = children
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
      return `> [!${(TYPES[attrs.variant] ?? TYPES.info).github}]\n${body}`;
    },
    extend: {
      // Block tokenizer for `> [!TYPE]` alerts; it runs before marked's blockquote rule.
      markdownTokenizer: {
        name: "callout",
        level: "block",
        start: (src: string) => src.search(/^ {0,3}> ?\[!/m),
        tokenize: (src, _tokens, lexer) => {
          const match = ALERT_PATTERN.exec(src);
          if (!match) return undefined;
          const body = match[2]
            .split("\n")
            .map((line) => line.replace(/^ {0,3}> ?/, ""))
            .join("\n");
          return {
            type: "callout",
            raw: match[0],
            variant: match[1],
            tokens: lexer.blockTokens(body),
          };
        },
      },
      parseMarkdown: (token: MarkdownToken, helpers) => {
        const content = helpers.parseChildren(token.tokens ?? []);
        return helpers.createNode(
          "callout",
          { variant: variantFromGithub(String(token.variant)) },
          content.length ? content : [{ type: "paragraph" }],
        );
      },
    },
    toolbar: { icon: MessageSquareWarning, title: "Callout" },
    slash: {
      title: "Callout",
      description: "Highlighted note",
      icon: MessageSquareWarning,
      keywords: ["note", "alert", "info", "warning", "ghi chu"],
    },
    bubble: ({ attrs, updateAttrs, deleteNode }) => (
      <>
        {(Object.keys(TYPES) as CalloutType[]).map((type) => (
          <ToolbarButton
            key={type}
            icon={TYPES[type].icon}
            title={TYPES[type].label}
            active={attrs.variant === type}
            onClick={() => updateAttrs({ variant: type })}
          />
        ))}
        <ToolbarSeparator />
        <ToolbarButton icon={Trash} title="Delete callout" onClick={deleteNode} />
      </>
    ),
  });
