import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { ChevronsDownUp } from "lucide-react";

import { ToolbarButton } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";

/** Collapsible block (`<details>` / `<summary>`). */
export function details() {
  return defineFeature({
    name: "details",
    extensions: [
      Details.configure({ persist: true, HTMLAttributes: { class: "ce-details" } }),
      DetailsSummary,
      DetailsContent,
    ],
    toolbar: [
      {
        id: "details",
        group: "insert",
        render: ({ editor }) => (
          <ToolbarButton
            icon={ChevronsDownUp}
            title="Toggle block"
            active={editor.isActive("details")}
            disabled={!editor.isEditable}
            onClick={() =>
              editor.isActive("details")
                ? editor.chain().focus().unsetDetails().run()
                : editor.chain().focus().setDetails().run()
            }
          />
        ),
      },
    ],
    slash: [
      {
        id: "details",
        title: "Toggle block",
        description: "Collapsible section",
        icon: ChevronsDownUp,
        group: "Insert",
        keywords: ["details", "collapse", "accordion", "thu gon"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setDetails().run(),
      },
    ],
  });
}
