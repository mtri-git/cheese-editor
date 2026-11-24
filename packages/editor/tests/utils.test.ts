import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { pickFiles } from "../src";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pickFiles", () => {
  test("resolves with the chosen files", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      Object.defineProperty(this, "files", { value: [file] });
      this.dispatchEvent(new Event("change"));
    });
    await expect(pickFiles("image/*")).resolves.toEqual([file]);
  });

  test("resolves with no files when the dialog is cancelled", async () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      this.dispatchEvent(new Event("cancel"));
    });
    await expect(pickFiles("image/*")).resolves.toEqual([]);
  });

  test("asks for the given file types and multiple files", async () => {
    let seen: { accept: string; multiple: boolean } | undefined;
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      seen = { accept: this.accept, multiple: this.multiple };
      this.dispatchEvent(new Event("cancel"));
    });
    await pickFiles(".md,.txt", true);
    expect(seen).toEqual({ accept: ".md,.txt", multiple: true });
  });
});
