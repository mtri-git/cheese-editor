import type { Editor } from "@tiptap/core";
import { useCurrentEditor, useEditorState } from "@tiptap/react";
import { Plus } from "lucide-react";

import { getFeatures } from "../core/registry";
import type { SlashItem, ToolbarItem } from "../core/types";
import { MenuItem, Popover } from "./Popover";

export interface ToolbarProps {
  className?: string;
  /**
   * Collapse block insertions (image, table, callout, custom nodes...) into one "Insert" dropdown.
   * Built from slash items outside the "Basic" group; toolbar buttons with the same id are hidden.
   * Default true.
   */
  insertMenu?: boolean;
  /** Accessible name of the toolbar. Default "Formatting". */
  label?: string;
}

function InsertMenu({ editor, items }: { editor: Editor; items: SlashItem[] }) {
  return (
    <Popover icon={Plus} title="Insert" label="Insert" caret disabled={!editor.isEditable}>
      {(close) => (
        <div className="ce-menu ce-insert-menu">
          {items.map((item) => (
            <MenuItem
              key={item.id}
              icon={item.icon}
              label={item.title}
              description={item.description}
              onSelect={() => {
                close();
                const { from } = editor.state.selection;
                item.command({ editor, range: { from, to: from } });
              }}
            />
          ))}
        </div>
      )}
    </Popover>
  );
}

/** Renders every toolbar item registered by the editor's features, grouped and separated. */
export function Toolbar({ className, insertMenu = true, label = "Formatting" }: ToolbarProps) {
  const { editor } = useCurrentEditor();
  // Re-render on every transaction so active / disabled states stay current.
  useEditorState({ editor, selector: (ctx) => ctx.transactionNumber });

  if (!editor) return null;
  const features = getFeatures(editor);

  const insertItems = insertMenu ? features.slash.filter((item) => item.group !== "Basic") : [];
  const collapsed = new Set(insertItems.map((item) => item.id));
  const items = features.toolbar.filter((item) => !collapsed.has(item.id));

  const groups: { name: string; items: ToolbarItem[] }[] = [];
  for (const item of items) {
    const name = item.group ?? "insert";
    const last = groups[groups.length - 1];
    if (last?.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  if (insertItems.length && !groups.some((group) => group.name === "insert")) {
    const ioIndex = groups.findIndex((group) => group.name === "io");
    groups.splice(ioIndex === -1 ? groups.length : ioIndex, 0, { name: "insert", items: [] });
  }

  return (
    <div
      className={["ce-toolbar", className].filter(Boolean).join(" ")}
      role="toolbar"
      aria-label={label}
    >
      {groups.map((group) => (
        <div key={group.name} className="ce-toolbar-group" data-group={group.name}>
          {group.items.map((item) => (
            <span key={item.id} className="ce-toolbar-item">
              {item.render({ editor })}
            </span>
          ))}
          {group.name === "insert" && insertItems.length > 0 && (
            <InsertMenu editor={editor} items={insertItems} />
          )}
        </div>
      ))}
    </div>
  );
}
