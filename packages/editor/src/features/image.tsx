import { Extension, type Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ImagePlus, Trash, Type } from "lucide-react";

import { Popover, UrlForm } from "../components/Popover";
import { ToolbarButton } from "../components/ToolbarButton";
import { defineFeature } from "../core/registry";
import { pickFiles, readAsDataURL } from "../core/utils";

export interface ImageFeatureOptions {
  /** Upload a file and resolve with its public URL. Defaults to embedding as a base64 data URL. */
  upload?: (file: File) => Promise<string>;
  /** Max file size in bytes. Default 5 MB. */
  maxSize?: number;
  onError?: (error: Error) => void;
}

export function image(options: ImageFeatureOptions = {}) {
  const {
    upload = readAsDataURL,
    maxSize = 5 * 1024 * 1024,
    onError = (error) => console.error(error),
  } = options;

  const insertFiles = async (editor: Editor, files: File[], pos?: number) => {
    for (const file of files.filter((f) => f.type.startsWith("image/"))) {
      if (file.size > maxSize) {
        onError(new Error(`Image "${file.name}" exceeds ${Math.round(maxSize / 1024 / 1024)} MB`));
        continue;
      }
      try {
        const src = await upload(file);
        const content = { type: "image", attrs: { src, alt: file.name } };
        if (pos === undefined) editor.chain().focus().insertContent(content).run();
        else editor.chain().focus().insertContentAt(pos, content).run();
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const pickAndInsert = async (editor: Editor) =>
    insertFiles(editor, await pickFiles("image/*", true));

  const ImageDrop = Extension.create({
    name: "imageDrop",
    addProseMirrorPlugins() {
      const editor = this.editor;
      const imagesOf = (data: DataTransfer | null) =>
        Array.from(data?.files ?? []).filter((file) => file.type.startsWith("image/"));
      return [
        new Plugin({
          key: new PluginKey("ceImageDrop"),
          props: {
            handlePaste: (_view, event) => {
              const files = imagesOf(event.clipboardData);
              if (!files.length) return false;
              void insertFiles(editor, files);
              return true;
            },
            handleDrop: (view, event) => {
              const files = imagesOf(event.dataTransfer);
              if (!files.length) return false;
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
              void insertFiles(editor, files, pos);
              return true;
            },
          },
        }),
      ];
    },
  });

  return defineFeature({
    name: "image",
    extensions: [
      Image.configure({
        allowBase64: true,
        resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 60, minHeight: 40 },
      }),
      ImageDrop,
    ],
    toolbar: [
      {
        id: "image",
        group: "insert",
        render: ({ editor }) => (
          <ToolbarButton
            icon={ImagePlus}
            title="Image"
            disabled={!editor.isEditable}
            onClick={() => void pickAndInsert(editor)}
          />
        ),
      },
    ],
    slash: [
      {
        id: "image",
        title: "Image",
        description: "Upload an image",
        icon: ImagePlus,
        group: "Media",
        keywords: ["picture", "photo", "anh", "hinh"],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          void pickAndInsert(editor);
        },
      },
    ],
    bubble: [
      {
        id: "image",
        shouldShow: ({ editor }) => editor.isActive("image"),
        render: ({ editor }) => (
          <>
            <Popover icon={Type} title="Alt text">
              {(close) => (
                <UrlForm
                  initial={editor.getAttributes("image").alt ?? ""}
                  placeholder="Describe the image"
                  submitLabel="Save"
                  onSubmit={(alt) => {
                    editor.chain().focus().updateAttributes("image", { alt }).run();
                    close();
                  }}
                />
              )}
            </Popover>
            <ToolbarButton
              icon={Trash}
              title="Delete image"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            />
          </>
        ),
      },
    ],
  });
}
