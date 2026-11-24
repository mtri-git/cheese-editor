import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import { basicKit, Editor, type EditorProps } from "../src";
import { callout } from "../src/callout";

afterEach(cleanup);

async function mount(props: Partial<EditorProps> = {}) {
  const view = render(
    <Editor features={[...basicKit(), callout()]} content="<p>hi</p>" {...props} />,
  );
  const area = await waitFor(() => {
    const element = view.container.querySelector<HTMLElement>(".ProseMirror");
    expect(element).not.toBeNull();
    return element as HTMLElement;
  });
  return { view, area };
}

describe("editing area", () => {
  test("is a multiline textbox with an accessible name", async () => {
    const { area } = await mount();
    expect(area.getAttribute("role")).toBe("textbox");
    expect(area.getAttribute("aria-multiline")).toBe("true");
    expect(area.getAttribute("aria-label")).toBe("Rich text editor");
  });

  test("takes its name from the `label` prop", async () => {
    const { area } = await mount({ label: "Nội dung bài viết" });
    expect(area.getAttribute("aria-label")).toBe("Nội dung bài viết");
  });

  test("keeps attributes passed through editorOptions", async () => {
    const { area } = await mount({
      editorOptions: { editorProps: { attributes: { class: "mine", "data-x": "1" } } },
    });
    expect(area.getAttribute("aria-label")).toBe("Rich text editor");
    expect(area.getAttribute("data-x")).toBe("1");
    expect(area.classList.contains("mine")).toBe(true);
  });

  test("keeps attributes passed through editorOptions as a function", async () => {
    const { area } = await mount({
      editorOptions: { editorProps: { attributes: () => ({ "data-y": "2" }) } },
    });
    expect(area.getAttribute("aria-label")).toBe("Rich text editor");
    expect(area.getAttribute("data-y")).toBe("2");
  });

  test("lets editorOptions override the label", async () => {
    const { area } = await mount({
      editorOptions: { editorProps: { attributes: { "aria-label": "Mine" } } },
    });
    expect(area.getAttribute("aria-label")).toBe("Mine");
  });
});

describe("toolbar", () => {
  test("has a name", async () => {
    const { view } = await mount();
    expect(view.container.querySelector('[role="toolbar"]')?.getAttribute("aria-label")).toBe(
      "Formatting",
    );
  });

  test("takes its name from `toolbarLabel`", async () => {
    const { view } = await mount({ toolbarLabel: "Định dạng" });
    expect(view.container.querySelector('[role="toolbar"]')?.getAttribute("aria-label")).toBe(
      "Định dạng",
    );
  });

  test("every button has an accessible name", async () => {
    const { view } = await mount();
    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThan(5);
    for (const button of buttons) {
      expect(button.getAttribute("aria-label") || button.textContent?.trim()).toBeTruthy();
    }
  });
});

describe("popover triggers", () => {
  test("announce a popup and point at it only while it is open", async () => {
    const { view } = await mount();
    const triggers = Array.from(view.container.querySelectorAll<HTMLElement>("[aria-expanded]"));
    expect(triggers.length).toBeGreaterThan(2);

    for (const trigger of triggers) {
      expect(trigger.getAttribute("aria-haspopup")).toBe("true");
      // Closed: no reference to a panel that is not in the page.
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.hasAttribute("aria-controls")).toBe(false);
    }

    const trigger = triggers[0];
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(view.container.ownerDocument.getElementById(controls as string)).not.toBeNull();
  });

  test("give each open panel its own id", async () => {
    const { view } = await mount();
    const [first, second] = Array.from(
      view.container.querySelectorAll<HTMLElement>("[aria-expanded]"),
    );
    fireEvent.click(first);
    const firstId = first.getAttribute("aria-controls");
    fireEvent.click(second);
    const secondId = second.getAttribute("aria-controls");
    expect(firstId).not.toBe(secondId);
  });
});
