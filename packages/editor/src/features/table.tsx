import type { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import {
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpFromLine,
  Columns3,
  PanelTop,
  Rows3,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  Trash,
} from "lucide-react";

import { ToolbarButton, ToolbarSeparator } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";
import type { IconComponent } from "../core/types";
import { closestSelectionElement } from "../core/utils";

export interface TableFeatureOptions {
  /** Allow resizing columns by dragging. Default true. */
  resizable?: boolean;
  /** Rows / columns of a newly inserted table. Default 3x3 with a header row. */
  rows?: number;
  cols?: number;
}

type TableAction = {
  icon: IconComponent;
  title: string;
  run: (editor: Editor) => boolean;
  can: (editor: Editor) => boolean;
};

const actions: (TableAction | "|")[] = [
  {
    icon: ArrowUpFromLine,
    title: "Insert row above",
    run: (e) => e.chain().focus().addRowBefore().run(),
    can: (e) => e.can().addRowBefore(),
  },
  {
    icon: ArrowDownFromLine,
    title: "Insert row below",
    run: (e) => e.chain().focus().addRowAfter().run(),
    can: (e) => e.can().addRowAfter(),
  },
  {
    icon: Rows3,
    title: "Delete row",
    run: (e) => e.chain().focus().deleteRow().run(),
    can: (e) => e.can().deleteRow(),
  },
  "|",
  {
    icon: ArrowLeftFromLine,
    title: "Insert column left",
    run: (e) => e.chain().focus().addColumnBefore().run(),
    can: (e) => e.can().addColumnBefore(),
  },
  {
    icon: ArrowRightFromLine,
    title: "Insert column right",
    run: (e) => e.chain().focus().addColumnAfter().run(),
    can: (e) => e.can().addColumnAfter(),
  },
  {
    icon: Columns3,
    title: "Delete column",
    run: (e) => e.chain().focus().deleteColumn().run(),
    can: (e) => e.can().deleteColumn(),
  },
  "|",
  {
    icon: TableCellsMerge,
    title: "Merge cells",
    run: (e) => e.chain().focus().mergeCells().run(),
    can: (e) => e.can().mergeCells(),
  },
  {
    icon: TableCellsSplit,
    title: "Split cell",
    run: (e) => e.chain().focus().splitCell().run(),
    can: (e) => e.can().splitCell(),
  },
  {
    icon: PanelTop,
    title: "Toggle header row",
    run: (e) => e.chain().focus().toggleHeaderRow().run(),
    can: (e) => e.can().toggleHeaderRow(),
  },
  "|",
  {
    icon: Trash,
    title: "Delete table",
    run: (e) => e.chain().focus().deleteTable().run(),
    can: (e) => e.can().deleteTable(),
  },
];

export function table(options: TableFeatureOptions = {}) {
  const { resizable = true, rows = 3, cols = 3 } = options;
  const insert = (editor: Editor) =>
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();

  return defineFeature({
    name: "table",
    extensions: [
      TableKit.configure({ table: { resizable, HTMLAttributes: { class: "ce-table" } } }),
    ],
    toolbar: [
      {
        id: "table",
        group: "insert",
        render: ({ editor }) => (
          <ToolbarButton
            icon={Table}
            title="Table"
            disabled={!editor.isEditable || editor.isActive("table")}
            onClick={() => insert(editor)}
          />
        ),
      },
    ],
    slash: [
      {
        id: "table",
        title: "Table",
        description: `${rows}×${cols} table`,
        icon: Table,
        group: "Insert",
        keywords: ["grid", "bang"],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          insert(editor);
        },
      },
    ],
    bubble: [
      {
        id: "table",
        placement: "top",
        anchor: (editor) => closestSelectionElement(editor, ".tableWrapper, table"),
        shouldShow: ({ editor }) => editor.isActive("table"),
        render: ({ editor }) => (
          <>
            {actions.map((action, index) =>
              action === "|" ? (
                <ToolbarSeparator key={index} />
              ) : (
                <ToolbarButton
                  key={action.title}
                  icon={action.icon}
                  title={action.title}
                  disabled={!action.can(editor)}
                  onClick={() => action.run(editor)}
                />
              ),
            )}
          </>
        ),
      },
    ],
  });
}
