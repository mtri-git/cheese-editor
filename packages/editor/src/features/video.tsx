import { Trash, Video } from "lucide-react";

import { UrlForm } from "../components/Popover";
import { ToolbarButton } from "../components/ToolbarButton";
import { createNodeFeature } from "../core/createNodeFeature";
import { toEmbedUrl } from "../core/embed";

export { toEmbedUrl };

/** Video embed (YouTube, Vimeo or a direct .mp4/.webm URL). Inserted empty, then asks for the URL inline. */
export const video = () =>
  createNodeFeature({
    name: "video",
    attrs: { src: "" },
    component: ({ attrs, updateAttrs, editable, selected }) => {
      if (!attrs.src) {
        return editable ? (
          <div className="ce-embed-empty" contentEditable={false}>
            <Video size={18} />
            <UrlForm
              placeholder="Paste a YouTube, Vimeo or .mp4 URL"
              submitLabel="Embed"
              onSubmit={(src) => src && updateAttrs({ src })}
            />
          </div>
        ) : null;
      }
      const embed = toEmbedUrl(attrs.src);
      return (
        <div
          className={["ce-video", selected && "is-selected"].filter(Boolean).join(" ")}
          contentEditable={false}
        >
          {embed ? (
            <iframe
              src={embed}
              title="Video"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            <video src={attrs.src} controls />
          )}
        </div>
      );
    },
    toolbar: { icon: Video, title: "Video" },
    slash: {
      title: "Video",
      description: "YouTube, Vimeo or mp4",
      icon: Video,
      keywords: ["youtube", "vimeo", "embed"],
    },
    bubble: ({ deleteNode }) => (
      <ToolbarButton icon={Trash} title="Delete video" onClick={deleteNode} />
    ),
  });
