import type { Editor } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit, { type StarterKitOptions } from "@tiptap/starter-kit";
import {
  Baseline,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Underline,
  Undo2,
} from "lucide-react";

import { MenuItem, Popover, UrlForm } from "../components/Popover";
import { ToolbarButton } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";
import type { EditorFeature, IconComponent, SlashItem, ToolbarItem } from "../core/types";
import { markdown, type MarkdownFeatureOptions } from "./markdown";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface BasicKitOptions {
  /** Heading levels, or false to disable headings. Default [1, 2, 3]. */
  heading?: HeadingLevel[] | false;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: boolean;
  blockquote?: boolean;
  horizontalRule?: boolean;
  lists?: boolean;
  taskList?: boolean;
  textAlign?: boolean;
  color?: boolean;
  history?: boolean;
  /** Markdown import / export / paste. Default true. */
  markdown?: boolean | MarkdownFeatureOptions;
  /** Override the default color palette. */
  colors?: string[];
}

const DEFAULT_COLORS = [
  "#000000",
  "#4b5563",
  "#9ca3af",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

const HEADING_ICONS: Partial<Record<HeadingLevel, IconComponent>> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
};

function toggleButton(
  id: string,
  group: string,
  icon: IconComponent,
  title: string,
  run: (editor: Editor) => void,
  isActive: (editor: Editor) => boolean,
  shortcut?: string,
): ToolbarItem {
  return {
    id,
    group,
    render: ({ editor }) => (
      <ToolbarButton
        icon={icon}
        title={title}
        shortcut={shortcut}
        active={isActive(editor)}
        disabled={!editor.isEditable}
        onClick={() => run(editor)}
      />
    ),
  };
}

function LinkPopover({ editor }: { editor: Editor }) {
  return (
    <Popover icon={Link} title="Link" active={editor.isActive("link")}>
      {(close) => (
        <UrlForm
          initial={editor.getAttributes("link").href ?? ""}
          submitLabel="Apply"
          onSubmit={(href) => {
            const chain = editor.chain().focus().extendMarkRange("link");
            if (href) chain.setLink({ href }).run();
            else chain.unsetLink().run();
            close();
          }}
        />
      )}
    </Popover>
  );
}

function ColorPopover({
  editor,
  icon,
  title,
  colors,
  current,
  apply,
  clear,
}: {
  editor: Editor;
  icon: IconComponent;
  title: string;
  colors: string[];
  current?: string;
  apply: (color: string) => void;
  clear: () => void;
}) {
  return (
    <Popover
      icon={icon}
      title={title}
      indicator={current ?? "transparent"}
      disabled={!editor.isEditable}
    >
      {(close) => (
        <div className="ce-colors">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={["ce-color", current === color && "is-active"].filter(Boolean).join(" ")}
              style={{ background: color }}
              title={color}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                apply(color);
                close();
              }}
            />
          ))}
          <button
            type="button"
            className="ce-btn ce-btn-text ce-colors-reset"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              clear();
              close();
            }}
          >
            Reset
          </button>
        </div>
      )}
    </Popover>
  );
}

/**
 * The default set of features: StarterKit-based formatting, lists, links, colors,
 * alignment, history and markdown import/export.
 */
export function basicKit(options: BasicKitOptions = {}): EditorFeature[] {
  const on = (key: keyof BasicKitOptions) => options[key] !== false;
  const levels = options.heading === false ? [] : (options.heading ?? [1, 2, 3]);
  const colors = options.colors ?? DEFAULT_COLORS;
  const features: EditorFeature[] = [];

  const starter: Partial<StarterKitOptions> = {
    codeBlock: false,
    heading: levels.length ? { levels } : false,
    bold: on("bold") ? undefined : false,
    italic: on("italic") ? undefined : false,
    underline: on("underline") ? undefined : false,
    strike: on("strike") ? undefined : false,
    code: on("code") ? undefined : false,
    blockquote: on("blockquote") ? undefined : false,
    horizontalRule: on("horizontalRule") ? undefined : false,
    bulletList: on("lists") ? undefined : false,
    orderedList: on("lists") ? undefined : false,
    undoRedo: on("history") ? undefined : false,
    link: on("link") ? { openOnClick: false, autolink: true, defaultProtocol: "https" } : false,
  };
  features.push(defineFeature({ name: "starterKit", extensions: [StarterKit.configure(starter)] }));

  if (on("history")) {
    features.push(
      defineFeature({
        name: "history",
        toolbar: [
          {
            id: "undo",
            group: "history",
            render: ({ editor }) => (
              <ToolbarButton
                icon={Undo2}
                title="Undo"
                shortcut="Mod-Z"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
              />
            ),
          },
          {
            id: "redo",
            group: "history",
            render: ({ editor }) => (
              <ToolbarButton
                icon={Redo2}
                title="Redo"
                shortcut="Mod-Shift-Z"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
              />
            ),
          },
        ],
      }),
    );
  }

  if (levels.length) {
    const currentLabel = (editor: Editor) => {
      const level = levels.find((l) => editor.isActive("heading", { level: l }));
      return level ? `Heading ${level}` : "Paragraph";
    };
    features.push(
      defineFeature({
        name: "heading",
        toolbar: [
          {
            id: "heading",
            group: "block",
            render: ({ editor }) => (
              <Popover title="Text style" label={currentLabel(editor)} caret>
                {(close) => (
                  <div className="ce-menu">
                    <MenuItem
                      icon={Pilcrow}
                      label="Paragraph"
                      active={editor.isActive("paragraph")}
                      onSelect={() => {
                        editor.chain().focus().setParagraph().run();
                        close();
                      }}
                    />
                    {levels.map((level) => (
                      <MenuItem
                        key={level}
                        icon={HEADING_ICONS[level]}
                        label={`Heading ${level}`}
                        active={editor.isActive("heading", { level })}
                        onSelect={() => {
                          editor.chain().focus().toggleHeading({ level }).run();
                          close();
                        }}
                      />
                    ))}
                  </div>
                )}
              </Popover>
            ),
          },
        ],
        slash: [
          {
            id: "paragraph",
            title: "Text",
            description: "Plain paragraph",
            icon: Pilcrow,
            group: "Basic",
            keywords: ["p", "paragraph"],
            command: ({ editor, range }) =>
              editor.chain().focus().deleteRange(range).setParagraph().run(),
          },
          ...levels.map((level): SlashItem => ({
            id: `heading${level}`,
            title: `Heading ${level}`,
            icon: HEADING_ICONS[level],
            group: "Basic",
            keywords: [`h${level}`, "title", "tieu de"],
            command: ({ editor, range }) =>
              editor.chain().focus().deleteRange(range).setNode("heading", { level }).run(),
          })),
        ],
      }),
    );
  }

  const marks: ToolbarItem[] = [];
  if (on("bold"))
    marks.push(
      toggleButton(
        "bold",
        "format",
        Bold,
        "Bold",
        (e) => e.chain().focus().toggleBold().run(),
        (e) => e.isActive("bold"),
        "Mod-B",
      ),
    );
  if (on("italic"))
    marks.push(
      toggleButton(
        "italic",
        "format",
        Italic,
        "Italic",
        (e) => e.chain().focus().toggleItalic().run(),
        (e) => e.isActive("italic"),
        "Mod-I",
      ),
    );
  if (on("underline"))
    marks.push(
      toggleButton(
        "underline",
        "format",
        Underline,
        "Underline",
        (e) => e.chain().focus().toggleUnderline().run(),
        (e) => e.isActive("underline"),
        "Mod-U",
      ),
    );
  if (on("strike"))
    marks.push(
      toggleButton(
        "strike",
        "format",
        Strikethrough,
        "Strikethrough",
        (e) => e.chain().focus().toggleStrike().run(),
        (e) => e.isActive("strike"),
        "Mod-Shift-S",
      ),
    );
  if (on("code"))
    marks.push(
      toggleButton(
        "code",
        "format",
        Code,
        "Inline code",
        (e) => e.chain().focus().toggleCode().run(),
        (e) => e.isActive("code"),
        "Mod-E",
      ),
    );
  if (on("link"))
    marks.push({
      id: "link",
      group: "format",
      render: ({ editor }) => <LinkPopover editor={editor} />,
    });
  marks.push(
    toggleButton(
      "clearFormat",
      "format",
      RemoveFormatting,
      "Clear formatting",
      (e) => e.chain().focus().unsetAllMarks().clearNodes().run(),
      () => false,
    ),
  );

  features.push(
    defineFeature({
      name: "marks",
      toolbar: marks,
      bubble: [
        {
          id: "text",
          fallback: true,
          shouldShow: ({ editor }) => {
            const { selection } = editor.state;
            return !selection.empty && !("node" in selection) && !editor.isActive("codeBlock");
          },
          render: ({ editor }) => (
            <>
              {marks
                .filter((item) => item.id !== "clearFormat")
                .map((item) => (
                  <span key={item.id}>{item.render({ editor })}</span>
                ))}
            </>
          ),
        },
      ],
    }),
  );

  if (on("color")) {
    features.push(
      defineFeature({
        name: "color",
        extensions: [TextStyle, Color, Highlight.configure({ multicolor: true })],
        toolbar: [
          {
            id: "textColor",
            group: "color",
            render: ({ editor }) => (
              <ColorPopover
                editor={editor}
                icon={Baseline}
                title="Text color"
                colors={colors}
                current={editor.getAttributes("textStyle").color}
                apply={(color) => editor.chain().focus().setColor(color).run()}
                clear={() => editor.chain().focus().unsetColor().run()}
              />
            ),
          },
          {
            id: "highlight",
            group: "color",
            render: ({ editor }) => (
              <ColorPopover
                editor={editor}
                icon={Highlighter}
                title="Highlight"
                colors={colors.map((c) => `${c}40`)}
                current={editor.getAttributes("highlight").color}
                apply={(color) => editor.chain().focus().setHighlight({ color }).run()}
                clear={() => editor.chain().focus().unsetHighlight().run()}
              />
            ),
          },
        ],
      }),
    );
  }

  if (on("textAlign")) {
    const aligns = [
      { value: "left", icon: TextAlignStart, label: "Align left" },
      { value: "center", icon: TextAlignCenter, label: "Align center" },
      { value: "right", icon: TextAlignEnd, label: "Align right" },
      { value: "justify", icon: TextAlignJustify, label: "Justify" },
    ];
    features.push(
      defineFeature({
        name: "textAlign",
        extensions: [TextAlign.configure({ types: ["heading", "paragraph"] })],
        toolbar: [
          {
            id: "textAlign",
            group: "align",
            render: ({ editor }) => {
              const current =
                aligns.find((a) => editor.isActive({ textAlign: a.value })) ?? aligns[0];
              return (
                <Popover icon={current.icon} title="Alignment" caret>
                  {(close) => (
                    <div className="ce-menu">
                      {aligns.map((align) => (
                        <MenuItem
                          key={align.value}
                          icon={align.icon}
                          label={align.label}
                          active={current.value === align.value}
                          onSelect={() => {
                            editor.chain().focus().setTextAlign(align.value).run();
                            close();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </Popover>
              );
            },
          },
        ],
      }),
    );
  }

  if (on("lists")) {
    features.push(
      defineFeature({
        name: "lists",
        toolbar: [
          toggleButton(
            "bulletList",
            "list",
            List,
            "Bullet list",
            (e) => e.chain().focus().toggleBulletList().run(),
            (e) => e.isActive("bulletList"),
            "Mod-Shift-8",
          ),
          toggleButton(
            "orderedList",
            "list",
            ListOrdered,
            "Numbered list",
            (e) => e.chain().focus().toggleOrderedList().run(),
            (e) => e.isActive("orderedList"),
            "Mod-Shift-7",
          ),
        ],
        slash: [
          {
            id: "bulletList",
            title: "Bullet list",
            icon: List,
            group: "Basic",
            keywords: ["ul", "list"],
            command: ({ editor, range }) =>
              editor.chain().focus().deleteRange(range).toggleBulletList().run(),
          },
          {
            id: "orderedList",
            title: "Numbered list",
            icon: ListOrdered,
            group: "Basic",
            keywords: ["ol", "list"],
            command: ({ editor, range }) =>
              editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
          },
        ],
      }),
    );
  }

  if (on("taskList")) {
    features.push(
      defineFeature({
        name: "taskList",
        extensions: [TaskList, TaskItem.configure({ nested: true })],
        toolbar: [
          toggleButton(
            "taskList",
            "list",
            ListTodo,
            "Task list",
            (e) => e.chain().focus().toggleTaskList().run(),
            (e) => e.isActive("taskList"),
            "Mod-Shift-9",
          ),
        ],
        slash: [
          {
            id: "taskList",
            title: "Task list",
            icon: ListTodo,
            group: "Basic",
            keywords: ["todo", "checkbox"],
            command: ({ editor, range }) =>
              editor.chain().focus().deleteRange(range).toggleTaskList().run(),
          },
        ],
      }),
    );
  }

  if (on("blockquote") || on("horizontalRule")) {
    const toolbar: ToolbarItem[] = [];
    const slash: SlashItem[] = [];
    if (on("blockquote")) {
      toolbar.push(
        toggleButton(
          "blockquote",
          "insert",
          Quote,
          "Quote",
          (e) => e.chain().focus().toggleBlockquote().run(),
          (e) => e.isActive("blockquote"),
          "Mod-Shift-B",
        ),
      );
      slash.push({
        id: "blockquote",
        title: "Quote",
        icon: Quote,
        group: "Basic",
        keywords: ["blockquote"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
      });
    }
    if (on("horizontalRule")) {
      toolbar.push(
        toggleButton(
          "horizontalRule",
          "insert",
          Minus,
          "Divider",
          (e) => e.chain().focus().setHorizontalRule().run(),
          () => false,
        ),
      );
      slash.push({
        id: "horizontalRule",
        title: "Divider",
        icon: Minus,
        group: "Basic",
        keywords: ["hr", "line"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
      });
    }
    features.push(defineFeature({ name: "blocks", toolbar, slash }));
  }

  if (options.markdown !== false) {
    features.push(markdown(typeof options.markdown === "object" ? options.markdown : {}));
  }

  return features;
}
