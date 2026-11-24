import type { Editor } from "@tiptap/core";
import { Emoji, gitHubEmojis, type EmojiItem } from "@tiptap/extension-emoji";
import { FaceSlightlySmiling } from "lucide-react";
import { useMemo, useState } from "react";

import { Popover } from "../components/Popover";
import { createSuggestionRenderer } from "../components/SuggestionList";
import { defineFeature } from "../core/registry";

export interface EmojiFeatureOptions {
  /** Emoji set. Default: GitHub emojis (includes `:shortcode:` support). */
  emojis?: EmojiItem[];
  /** Max items shown in the `:` suggestion list. */
  suggestionLimit?: number;
}

function searchEmojis(emojis: EmojiItem[], query: string, limit: number) {
  const q = query.toLowerCase().trim();
  const withGlyph = emojis.filter((item) => item.emoji);
  if (!q) return withGlyph.slice(0, limit);
  return withGlyph
    .filter(
      (item) =>
        item.shortcodes.some((code) => code.startsWith(q)) ||
        item.tags.some((tag) => tag.startsWith(q)),
    )
    .slice(0, limit);
}

function EmojiPicker({
  editor,
  emojis,
  onPick,
}: {
  editor: Editor;
  emojis: EmojiItem[];
  onPick: () => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchEmojis(emojis, query, 120), [emojis, query]);
  return (
    <div className="ce-emoji-picker">
      <input
        autoFocus
        className="ce-input"
        placeholder="Search emoji"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="ce-emoji-grid">
        {results.map((item) => (
          <button
            key={item.name}
            type="button"
            title={`:${item.shortcodes[0]}:`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              editor.chain().focus().setEmoji(item.name).run();
              onPick();
            }}
          >
            {item.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Emoji node with `:shortcode` suggestions and a toolbar picker. */
export function emoji(options: EmojiFeatureOptions = {}) {
  const { emojis = gitHubEmojis, suggestionLimit = 8 } = options;

  return defineFeature({
    name: "emoji",
    extensions: [
      Emoji.configure({
        emojis,
        enableEmoticons: true,
        suggestion: {
          items: ({ query }) => searchEmojis(emojis, query, suggestionLimit),
          render: createSuggestionRenderer<EmojiItem>({
            getKey: (item) => item.name,
            renderItem: (item) => (
              <>
                <span className="ce-suggestion-icon">{item.emoji}</span>
                <span className="ce-suggestion-title">:{item.shortcodes[0]}:</span>
              </>
            ),
          }),
        },
      }),
    ],
    toolbar: [
      {
        id: "emoji",
        group: "insert",
        render: ({ editor }) => (
          <Popover icon={FaceSlightlySmiling} title="Emoji" disabled={!editor.isEditable}>
            {(close) => <EmojiPicker editor={editor} emojis={emojis} onPick={close} />}
          </Popover>
        ),
      },
    ],
  });
}
