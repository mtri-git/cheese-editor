import { Extension, type AnyExtension, type Editor } from "@tiptap/core";

import {
  TOOLBAR_GROUPS,
  type BubbleItem,
  type EditorFeature,
  type SlashItem,
  type ToolbarItem,
} from "./types";

export function defineFeature(feature: EditorFeature): EditorFeature {
  return feature;
}

export interface ResolvedFeatures {
  extensions: AnyExtension[];
  toolbar: ToolbarItem[];
  slash: SlashItem[];
  bubble: BubbleItem[];
}

/** Flatten a feature list. Later features with the same name replace earlier ones. */
export function resolveFeatures(features: EditorFeature[]): ResolvedFeatures {
  const byName = new Map<string, EditorFeature>();
  for (const feature of features) byName.set(feature.name, feature);

  const list = [...byName.values()];
  const groupIndex = (group?: string) => {
    const index = TOOLBAR_GROUPS.indexOf((group ?? "insert") as (typeof TOOLBAR_GROUPS)[number]);
    return index === -1 ? TOOLBAR_GROUPS.length : index;
  };

  return {
    extensions: list.flatMap((f) => f.extensions ?? []),
    toolbar: list
      .flatMap((f) => f.toolbar ?? [])
      .map((item, index) => ({ item: { ...item, group: item.group ?? "insert" }, index }))
      .sort(
        (a, b) =>
          groupIndex(a.item.group) - groupIndex(b.item.group) ||
          (a.item.order ?? 0) - (b.item.order ?? 0) ||
          a.index - b.index,
      )
      .map(({ item }) => item),
    slash: list.flatMap((f) => f.slash ?? []),
    bubble: list.flatMap((f) => f.bubble ?? []),
  };
}

declare module "@tiptap/core" {
  interface Storage {
    featureRegistry: ResolvedFeatures;
  }
}

/** Exposes the resolved features on `editor.storage.featureRegistry`. */
export const FeatureRegistry = Extension.create<{ resolved: ResolvedFeatures }>({
  name: "featureRegistry",

  addOptions() {
    return { resolved: { extensions: [], toolbar: [], slash: [], bubble: [] } };
  },

  addStorage() {
    return this.options.resolved;
  },
});

export function getFeatures(editor: Editor): ResolvedFeatures {
  return editor.storage.featureRegistry;
}
