import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";

import { createSuggestionRenderer } from "../components/SuggestionList";
import { getFeatures } from "../core/registry";
import type { SlashItem } from "../core/types";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = normalize(query.trim());
  if (!q) return items;
  return items.filter((item) =>
    [item.title, item.id, ...(item.keywords ?? [])].some((word) => normalize(word).includes(q)),
  );
}

/** "/" menu listing the slash items registered by all features. */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        // Allow multi-word queries like "/san pham"; the menu closes once nothing matches.
        allowSpaces: true,
        pluginKey: new PluginKey("ceSlashCommand"),
        allow: ({ editor, state, range }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.parent.type.spec.code) return false;
          const query = state.doc.textBetween(range.from, range.to).slice(1);
          return (
            !query.includes(" ") || filterSlashItems(getFeatures(editor).slash, query).length > 0
          );
        },
        items: ({ editor, query }) => filterSlashItems(getFeatures(editor).slash, query),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: createSuggestionRenderer<SlashItem>({
          getKey: (item) => item.id,
          getGroup: (item) => item.group,
          renderItem: (item) => {
            const Icon = item.icon;
            return (
              <>
                <span className="ce-suggestion-icon">{Icon && <Icon size={18} />}</span>
                <span className="ce-suggestion-text">
                  <span className="ce-suggestion-title">{item.title}</span>
                  {item.description && (
                    <span className="ce-suggestion-desc">{item.description}</span>
                  )}
                </span>
              </>
            );
          },
        }),
      }),
    ];
  },
});
