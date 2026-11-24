import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const editorSrc = fileURLToPath(new URL("../../packages/editor/src", import.meta.url));

export default defineConfig({
  // GitHub Pages serves the site under /<repository>/: the Pages workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    // Point at the editor source for instant HMR instead of the built dist.
    alias: [
      { find: /^cheese-editor\/styles\.css$/, replacement: `${editorSrc}/styles.css` },
      { find: /^cheese-editor\/prose\.css$/, replacement: `${editorSrc}/prose.css` },
      { find: /^cheese-editor\/(.+)$/, replacement: `${editorSrc}/$1.ts` },
      { find: /^cheese-editor$/, replacement: `${editorSrc}/index.ts` },
    ],
  },
});
