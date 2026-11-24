import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const editorSrc = fileURLToPath(new URL("../../packages/editor/src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Point at the editor source for instant HMR instead of the built dist.
    alias: [
      { find: /^cheese-editor\/styles\.css$/, replacement: `${editorSrc}/styles.css` },
      { find: /^cheese-editor\/(.+)$/, replacement: `${editorSrc}/$1.ts` },
      { find: /^cheese-editor$/, replacement: `${editorSrc}/index.ts` },
    ],
  },
});
