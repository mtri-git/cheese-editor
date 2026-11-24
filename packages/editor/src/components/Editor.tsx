import type { AnyExtension, Content, Editor as TiptapEditor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, EditorContext, useEditor, type UseEditorOptions } from "@tiptap/react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { FeatureRegistry, resolveFeatures } from "../core/registry";
import type { EditorFeature } from "../core/types";
import { BlockHandle } from "../extensions/BlockHandle";
import { SlashCommand } from "../extensions/SlashCommand";
import { BubbleMenus } from "./BubbleMenus";
import { Toolbar } from "./Toolbar";

export interface EditorProps {
  /** Features to enable. Read once on mount — keep the array stable (module scope or useMemo). */
  features: EditorFeature[];
  /** Extra raw Tiptap extensions. */
  extensions?: AnyExtension[];
  content?: Content;
  contentType?: "html" | "json" | "markdown";
  onChange?: (editor: TiptapEditor) => void;
  onReady?: (editor: TiptapEditor) => void;
  editable?: boolean;
  placeholder?: string;
  toolbar?: boolean;
  /** Group image, table, callout, custom nodes... into one "Insert" dropdown. Default true. */
  insertMenu?: boolean;
  bubbleMenu?: boolean;
  slashCommand?: boolean;
  blockHandle?: boolean;
  className?: string;
  /** Rendered inside the editor context, below the content (status bar, word count...). */
  children?: ReactNode;
  /** Accessible name of the editing area, read by screen readers. Read once on mount. Default "Rich text editor". */
  label?: string;
  /** Accessible name of the toolbar. Default "Formatting". */
  toolbarLabel?: string;
  /** Passed through to Tiptap's `useEditor`. Its `editorProps.attributes` are merged with the editor's own. */
  editorOptions?: Partial<UseEditorOptions>;
}

export function Editor({
  features,
  extensions: extraExtensions = [],
  content,
  contentType = "html",
  onChange,
  onReady,
  editable = true,
  placeholder = "Type '/' for commands…",
  toolbar = true,
  insertMenu = true,
  bubbleMenu = true,
  slashCommand = true,
  blockHandle = true,
  className,
  children,
  label = "Rich text editor",
  toolbarLabel,
  editorOptions,
}: EditorProps) {
  const callbacks = useRef({ onChange, onReady });
  callbacks.current = { onChange, onReady };

  const extensions = useMemo(() => {
    const resolved = resolveFeatures(features);
    return [
      ...resolved.extensions,
      ...extraExtensions,
      FeatureRegistry.configure({ resolved }),
      Markdown,
      Placeholder.configure({ placeholder }),
      ...(slashCommand ? [SlashCommand] : []),
      ...(blockHandle ? [BlockHandle] : []),
    ];
    // Extensions are fixed for the lifetime of the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The editing area gets a name and is announced as multiline. Attributes the caller passes in
  // `editorOptions.editorProps.attributes` (an object or a function) are added to these and win.
  const { editorProps: callerEditorProps, ...callerOptions } = editorOptions ?? {};
  const callerAttributes = callerEditorProps?.attributes;
  const ownAttributes = { "aria-label": label, "aria-multiline": "true" };

  const editor = useEditor(
    {
      extensions,
      content,
      contentType,
      editable,
      onUpdate: ({ editor: updated }) => callbacks.current.onChange?.(updated),
      editorProps: {
        ...callerEditorProps,
        attributes:
          typeof callerAttributes === "function"
            ? (state) => ({ ...ownAttributes, ...callerAttributes(state) })
            : { ...ownAttributes, ...callerAttributes },
      },
      ...callerOptions,
    },
    [],
  );

  // Not `onCreate`: under StrictMode the first instance is destroyed, so report the one that is mounted.
  useEffect(() => {
    if (editor) callbacks.current.onReady?.(editor);
  }, [editor]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  const contextValue = useMemo(() => ({ editor }), [editor]);

  return (
    <EditorContext.Provider value={contextValue}>
      <div className={["ce-editor", className].filter(Boolean).join(" ")}>
        {toolbar && editable && <Toolbar insertMenu={insertMenu} label={toolbarLabel} />}
        <EditorContent editor={editor} className="ce-content" />
        {bubbleMenu && <BubbleMenus />}
        {children}
      </div>
    </EditorContext.Provider>
  );
}
