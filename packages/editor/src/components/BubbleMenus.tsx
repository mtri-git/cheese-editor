import type { Editor } from "@tiptap/core";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { getFeatures } from "../core/registry";
import type { BubbleItem } from "../core/types";

function BubbleContent({ editor, item }: { editor: Editor; item: BubbleItem }) {
  useEditorState({ editor, selector: (ctx) => ctx.transactionNumber });
  return <div className="ce-bubble">{item.render({ editor })}</div>;
}

/** Mounts one Tiptap BubbleMenu per registered bubble item. */
export function BubbleMenus() {
  const { editor } = useCurrentEditor();
  if (!editor) return null;

  const items = getFeatures(editor).bubble;
  const primary = items.filter((item) => !item.fallback);

  return (
    <>
      {items.map((item) => (
        <BubbleMenu
          key={item.id}
          editor={editor}
          pluginKey={`ce-bubble-${item.id}`}
          options={{ placement: item.placement ?? "top", offset: 8, flip: true }}
          getReferencedVirtualElement={
            item.anchor
              ? () => {
                  const element = item.anchor?.(editor);
                  return element
                    ? {
                        getBoundingClientRect: () => element.getBoundingClientRect(),
                        getClientRects: () => element.getClientRects(),
                      }
                    : null;
                }
              : undefined
          }
          shouldShow={({ editor: current }) => {
            if (!current.isEditable || !item.shouldShow({ editor: current })) return false;
            return (
              !item.fallback || !primary.some((other) => other.shouldShow({ editor: current }))
            );
          }}
        >
          <BubbleContent editor={editor} item={item} />
        </BubbleMenu>
      ))}
    </>
  );
}
