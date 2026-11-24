import type { AnyExtension, Editor, Range } from "@tiptap/core";
import type { ComponentType, ReactNode } from "react";

export type IconComponent = ComponentType<{ size?: number | string; className?: string }>;

/** Toolbar groups are rendered in this order, separated by a divider. */
export const TOOLBAR_GROUPS = [
  "history",
  "block",
  "format",
  "color",
  "align",
  "list",
  "insert",
  "io",
] as const;

export type ToolbarGroup = (typeof TOOLBAR_GROUPS)[number] | (string & {});

export interface ToolbarItem {
  id: string;
  group?: ToolbarGroup;
  /** Sort order inside the group (lower first). */
  order?: number;
  render: (ctx: { editor: Editor }) => ReactNode;
}

export interface SlashItem {
  id: string;
  title: string;
  description?: string;
  icon?: IconComponent;
  /** Extra words matched by the slash search. */
  keywords?: string[];
  group?: string;
  command: (ctx: { editor: Editor; range: Range }) => void;
}

export interface BubbleItem {
  id: string;
  /** Return true when this bubble menu should be visible. */
  shouldShow: (ctx: { editor: Editor }) => boolean;
  render: (ctx: { editor: Editor }) => ReactNode;
  /** Placement relative to the selection / selected node. */
  placement?: "top" | "bottom";
  /** Element the bubble is anchored to (defaults to the selection). */
  anchor?: (editor: Editor) => HTMLElement | null;
  /** Fallback bubbles only show when no other bubble wants to (e.g. the text formatting bubble). */
  fallback?: boolean;
}

/**
 * A feature bundles everything needed for one editor capability:
 * the Tiptap extensions plus optional toolbar, slash menu and bubble menu entries.
 */
export interface EditorFeature {
  name: string;
  extensions?: AnyExtension[];
  toolbar?: ToolbarItem[];
  slash?: SlashItem[];
  bubble?: BubbleItem[];
}
