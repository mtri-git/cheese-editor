import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      callout: "src/callout.ts",
      "code-block": "src/code-block.ts",
      details: "src/details.ts",
      emoji: "src/emoji.ts",
      image: "src/image.ts",
      table: "src/table.ts",
      video: "src/video.ts",
      // No React, no Tiptap: pages that only display content import this.
      render: "src/render.ts",
    },
    platform: "browser",
    copy: [
      { from: "src/styles.css", to: "dist" },
      { from: "src/prose.css", to: "dist" },
    ],
    dts: {
      generator: "tsgo",
    },
  },
  test: {
    environment: "happy-dom",
  },
});
