import {
  mergeAttributes,
  Node,
  type Editor,
  type JSONContent,
  type NodeConfig,
} from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import type { ComponentType, ReactNode } from "react";

import { ToolbarButton } from "../components/ToolbarButton";
import type { EditorFeature, IconComponent, ToolbarGroup } from "./types";
import { deleteNodeOfType } from "./utils";

type Attrs = Record<string, unknown>;

export interface NodeComponentProps<A extends Attrs> {
  attrs: A;
  updateAttrs: (attrs: Partial<A>) => void;
  deleteNode: () => void;
  selected: boolean;
  editable: boolean;
  editor: Editor;
}

export interface NodeBubbleProps<A extends Attrs> {
  editor: Editor;
  attrs: A;
  updateAttrs: (attrs: Partial<A>) => void;
  deleteNode: () => void;
}

/** Attrs used when inserting: a fixed object, or a function (return null to cancel). */
type InsertAttrs<A extends Attrs> = Partial<A> | ((editor: Editor) => Partial<A> | null);

export interface CreateNodeFeatureOptions<A extends Attrs> {
  /** Node name (camelCase). Also used as `data-type` in HTML. */
  name: string;
  /** Attributes with their default values. */
  attrs: A;
  /** React component rendering the node. Render `<NodeContent />` where editable content goes. */
  component: ComponentType<NodeComponentProps<A>>;
  /**
   * Editable content inside the node. `true` means `block+`; a string is a ProseMirror content expression.
   * Omit for atom nodes (the component owns the whole UI).
   */
  content?: boolean | string;
  inline?: boolean;
  group?: string;
  draggable?: boolean;
  /** Custom markdown serializer. Atom nodes default to raw HTML, which round-trips on markdown import. */
  markdown?: (attrs: A, children: string) => string;
  toolbar?: {
    icon: IconComponent;
    title: string;
    group?: ToolbarGroup;
    order?: number;
    attrs?: InsertAttrs<A>;
  };
  slash?: {
    title: string;
    description?: string;
    icon?: IconComponent;
    keywords?: string[];
    attrs?: InsertAttrs<A>;
  };
  /** Bubble menu shown when the node is selected. */
  bubble?: (props: NodeBubbleProps<A>) => ReactNode;
  /** Escape hatch to extend the generated Tiptap node config. */
  extend?: Partial<NodeConfig>;
}

export type NodeFeature<A extends Attrs> = EditorFeature & {
  node: Node;
  /** Insert this node at the current selection. */
  insert: (editor: Editor, attrs?: Partial<A>) => boolean;
};

export const NodeContent = NodeViewContent;

const toKebab = (value: string) => value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function serializeAttr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseAttr(raw: string | null, fallback: unknown): unknown {
  if (raw === null) return fallback;
  if (typeof fallback === "string" || fallback === null) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function createNodeFeature<A extends Attrs>(
  options: CreateNodeFeatureOptions<A>,
): NodeFeature<A> {
  const { name, attrs, component: Component, inline = false } = options;
  if ("type" in attrs) {
    throw new Error(
      `createNodeFeature("${name}"): attribute "type" is reserved (it maps to data-type). Use another name, e.g. "variant".`,
    );
  }
  const dataType = toKebab(name);
  const tag = inline ? "span" : "div";
  const isAtom = !options.content;
  const contentExpression = options.content === true ? "block+" : options.content || undefined;

  const getAttrs = (node: { attrs: Record<string, unknown> }) => node.attrs as A;

  const View = (props: ReactNodeViewProps) => (
    <NodeViewWrapper as={tag} className={`ce-node ce-node-${dataType}`} data-type={dataType}>
      <Component
        attrs={getAttrs(props.node)}
        updateAttrs={(next) => props.updateAttributes(next)}
        deleteNode={props.deleteNode}
        selected={props.selected}
        editable={props.editor.isEditable}
        editor={props.editor}
      />
    </NodeViewWrapper>
  );

  const node = Node.create({
    name,
    group: options.group ?? (inline ? "inline" : "block"),
    inline,
    atom: isAtom,
    content: contentExpression,
    draggable: options.draggable ?? true,
    selectable: true,
    defining: !isAtom,

    addAttributes() {
      return Object.fromEntries(
        Object.entries(attrs).map(([key, fallback]) => [
          key,
          {
            default: fallback,
            parseHTML: (el: HTMLElement) =>
              parseAttr(el.getAttribute(`data-${toKebab(key)}`), fallback),
            renderHTML: (values: Record<string, unknown>) => {
              const value = serializeAttr(values[key]);
              return value === null ? {} : { [`data-${toKebab(key)}`]: value };
            },
          },
        ]),
      );
    },

    parseHTML() {
      return [{ tag: `${tag}[data-type="${dataType}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      const attributes = mergeAttributes({ "data-type": dataType }, HTMLAttributes);
      return isAtom ? [tag, attributes] : [tag, attributes, 0];
    },

    addNodeView() {
      return ReactNodeViewRenderer(View);
    },

    renderMarkdown(json: JSONContent, helpers) {
      const nodeAttrs = { ...attrs, ...json.attrs } as A;
      const children = json.content ? helpers.renderChildren(json.content, "\n\n") : "";
      if (options.markdown) return options.markdown(nodeAttrs, children);
      if (!isAtom) return children;
      const htmlAttrs = Object.entries(nodeAttrs)
        .map(([key, value]) => [key, serializeAttr(value)] as const)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => ` data-${toKebab(key)}="${escapeHtml(value!)}"`)
        .join("");
      return `<${tag} data-type="${dataType}"${htmlAttrs}></${tag}>`;
    },

    ...options.extend,
  });

  const insert = (editor: Editor, insertAttrs?: Partial<A>) =>
    editor
      .chain()
      .focus()
      .insertContent({
        type: name,
        attrs: { ...attrs, ...insertAttrs },
        content: isAtom ? undefined : [{ type: "paragraph" }],
      })
      .run();

  const resolveAttrs = (editor: Editor, value?: InsertAttrs<A>) =>
    typeof value === "function" ? value(editor) : (value ?? {});

  const feature: NodeFeature<A> = {
    name,
    node,
    insert,
    extensions: [node],
  };

  if (options.toolbar) {
    const { icon, title, group = "insert", order, attrs: toolbarAttrs } = options.toolbar;
    feature.toolbar = [
      {
        id: name,
        group,
        order,
        render: ({ editor }) => (
          <ToolbarButton
            icon={icon}
            title={title}
            onClick={() => {
              const next = resolveAttrs(editor, toolbarAttrs);
              if (next) insert(editor, next);
            }}
          />
        ),
      },
    ];
  }

  if (options.slash) {
    const { attrs: slashAttrs, ...slash } = options.slash;
    feature.slash = [
      {
        id: name,
        group: "insert",
        ...slash,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          const next = resolveAttrs(editor, slashAttrs);
          if (next) insert(editor, next);
        },
      },
    ];
  }

  if (options.bubble) {
    const renderBubble = options.bubble;
    feature.bubble = [
      {
        id: name,
        shouldShow: ({ editor }) => editor.isActive(name),
        render: ({ editor }) => {
          const current = editor.getAttributes(name) as A;
          return renderBubble({
            editor,
            attrs: { ...attrs, ...current },
            updateAttrs: (next) => editor.chain().focus().updateAttributes(name, next).run(),
            deleteNode: () => deleteNodeOfType(editor, name),
          });
        },
      },
    ];
  }

  return feature;
}
