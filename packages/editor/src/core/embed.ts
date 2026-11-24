/**
 * Video embed URLs. No React and no DOM: the editor and `cheese-editor/render` share it, so what the
 * editor shows and what a page renders come from the same allowlist.
 */

/**
 * Turn a YouTube or Vimeo page URL into its embeddable URL. Returns null for anything else (such as a
 * direct video file). The result is built from the captured video id only, never from the input URL.
 */
export function toEmbedUrl(url: string): string | null {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
