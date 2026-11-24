import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

/** Delete the selected node of `type`, or the closest ancestor of that type. */
export function deleteNodeOfType(editor: Editor, type: string): boolean {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.type.name === type) {
    return editor.chain().focus().deleteSelection().run();
  }
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === type) {
      return editor
        .chain()
        .focus()
        .deleteRange({ from: $from.before(depth), to: $from.after(depth) })
        .run();
    }
  }
  return false;
}

/** Open the native file picker and resolve with the chosen files. */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener("change", () => resolve(Array.from(input.files ?? [])));
    input.click();
  });
}

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Closest DOM element matching `selector` around the current selection. */
export function closestSelectionElement(editor: Editor, selector: string): HTMLElement | null {
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest<HTMLElement>(selector) ?? null;
}
