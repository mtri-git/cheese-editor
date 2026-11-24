import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const GRIP_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>';

/** Position of the top-level block under the given viewport coordinates. */
function blockPosAt(view: EditorView, x: number, y: number): number | null {
  const rect = view.dom.getBoundingClientRect();
  const left = Math.min(Math.max(x, rect.left + 48), rect.right - 4);
  const hit = view.posAtCoords({ left, top: y });
  if (!hit) return null;
  if (hit.inside >= 0) {
    const $inside = view.state.doc.resolve(hit.inside);
    return $inside.depth === 0 ? hit.inside : $inside.before(1);
  }
  const $pos = view.state.doc.resolve(hit.pos);
  return $pos.depth === 0 ? null : $pos.before(1);
}

/**
 * Lightweight drag handle for top-level blocks.
 * (Tiptap's official drag handle depends on the collaboration / Yjs packages.)
 */
export const BlockHandle = Extension.create({
  name: "blockHandle",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("ceBlockHandle"),
        view(view) {
          const handle = document.createElement("div");
          handle.className = "ce-block-handle";
          handle.draggable = true;
          handle.innerHTML = GRIP_SVG;
          handle.title = "Drag to move, click to select";
          handle.style.display = "none";

          let currentPos: number | null = null;

          const hide = () => {
            handle.style.display = "none";
            currentPos = null;
          };

          // The view DOM is moved into <EditorContent> after creation, so resolve the wrapper lazily.
          const getWrapper = () => {
            const wrapper = view.dom.parentElement;
            if (wrapper && handle.parentElement !== wrapper) wrapper.appendChild(handle);
            return wrapper;
          };

          const onMouseMove = (event: MouseEvent) => {
            const wrapper = getWrapper();
            if (!editor.isEditable || !wrapper) return;
            const pos = blockPosAt(view, event.clientX, event.clientY);
            const dom = pos === null ? null : view.nodeDOM(pos);
            if (pos === null || !(dom instanceof HTMLElement)) return hide();

            currentPos = pos;
            const wrapperRect = wrapper.getBoundingClientRect();
            const domRect = dom.getBoundingClientRect();
            const lineHeight = parseFloat(getComputedStyle(dom).lineHeight) || 24;
            handle.style.display = "flex";
            handle.style.top = `${domRect.top - wrapperRect.top + Math.min(lineHeight, domRect.height) / 2 - 11}px`;
            handle.style.left = `${domRect.left - wrapperRect.left - 26}px`;
          };

          const onMouseLeave = (event: MouseEvent) => {
            const next = event.relatedTarget as Node | null;
            if (next && (handle.contains(next) || view.dom.contains(next))) return;
            hide();
          };

          const selectBlock = () => {
            if (currentPos === null) return false;
            view.dispatch(
              view.state.tr.setSelection(NodeSelection.create(view.state.doc, currentPos)),
            );
            return true;
          };

          const onDragStart = (event: DragEvent) => {
            const pos = currentPos;
            if (pos === null || !selectBlock() || !event.dataTransfer) return;
            const slice = view.state.selection.content();
            const { dom, text } = view.serializeForClipboard(slice);
            event.dataTransfer.clearData();
            event.dataTransfer.setData("text/html", dom.innerHTML);
            event.dataTransfer.setData("text/plain", text);
            event.dataTransfer.effectAllowed = "copyMove";
            const blockDom = view.nodeDOM(pos);
            if (blockDom instanceof HTMLElement) event.dataTransfer.setDragImage(blockDom, 0, 0);
            view.dragging = { slice, move: true };
          };

          const onClick = () => {
            if (selectBlock()) view.focus();
          };

          view.dom.addEventListener("mousemove", onMouseMove);
          view.dom.addEventListener("mouseleave", onMouseLeave);
          handle.addEventListener("mouseleave", onMouseLeave);
          handle.addEventListener("dragstart", onDragStart);
          handle.addEventListener("dragend", hide);
          handle.addEventListener("click", onClick);

          return {
            destroy() {
              view.dom.removeEventListener("mousemove", onMouseMove);
              view.dom.removeEventListener("mouseleave", onMouseLeave);
              handle.remove();
            },
          };
        },
      }),
    ];
  },
});
