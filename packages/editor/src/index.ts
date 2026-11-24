export { Editor, type EditorProps } from "./components/Editor";
export { Toolbar, type ToolbarProps } from "./components/Toolbar";
export { BubbleMenus } from "./components/BubbleMenus";
export {
  ToolbarButton,
  ToolbarSeparator,
  type ToolbarButtonProps,
} from "./components/ToolbarButton";
export {
  Popover,
  MenuItem,
  UrlForm,
  type PopoverProps,
  type MenuItemProps,
} from "./components/Popover";
export { SuggestionList, createSuggestionRenderer } from "./components/SuggestionList";

export {
  defineFeature,
  resolveFeatures,
  getFeatures,
  FeatureRegistry,
  type ResolvedFeatures,
} from "./core/registry";
export {
  createNodeFeature,
  NodeContent,
  type CreateNodeFeatureOptions,
  type NodeComponentProps,
  type NodeBubbleProps,
  type NodeFeature,
} from "./core/createNodeFeature";
export {
  TOOLBAR_GROUPS,
  type EditorFeature,
  type ToolbarItem,
  type ToolbarGroup,
  type SlashItem,
  type BubbleItem,
  type IconComponent,
} from "./core/types";
export {
  deleteNodeOfType,
  pickFiles,
  readAsDataURL,
  downloadFile,
  closestSelectionElement,
} from "./core/utils";

export { SlashCommand, filterSlashItems } from "./extensions/SlashCommand";
export { BlockHandle } from "./extensions/BlockHandle";

export { basicKit, type BasicKitOptions } from "./features/basic";
export {
  markdown,
  importMarkdown,
  importMarkdownFile,
  looksLikeMarkdown,
  type MarkdownFeatureOptions,
} from "./features/markdown";

export { useCurrentEditor, useEditorState } from "@tiptap/react";
export type { Editor as TiptapEditor, JSONContent, Content } from "@tiptap/core";
