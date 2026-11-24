import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface SuggestionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SuggestionListProps<T> {
  items: T[];
  command: (item: T) => void;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  getGroup?: (item: T) => string | undefined;
  emptyText?: string;
}

function SuggestionListInner<T>(
  {
    items,
    command,
    renderItem,
    getKey,
    getGroup,
    emptyText = "No results",
  }: SuggestionListProps<T>,
  ref: React.ForwardedRef<SuggestionListHandle>,
) {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelected(0), [items]);

  useEffect(() => {
    listRef.current?.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setSelected((index) => (index + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((index) => (index - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return <div className="ce-suggestion ce-suggestion-empty">{emptyText}</div>;

  return (
    <div className="ce-suggestion" ref={listRef} role="listbox">
      {items.map((item, index) => {
        const group = getGroup?.(item);
        const showGroup = group && (index === 0 || getGroup?.(items[index - 1]) !== group);
        return (
          <div key={getKey(item)}>
            {showGroup && <div className="ce-suggestion-group">{group}</div>}
            <button
              type="button"
              role="option"
              aria-selected={index === selected}
              className={["ce-suggestion-item", index === selected && "is-selected"]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSelected(index)}
              onClick={() => command(item)}
            >
              {renderItem(item)}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export const SuggestionList = forwardRef(SuggestionListInner) as <T>(
  props: SuggestionListProps<T> & { ref?: React.Ref<SuggestionListHandle> },
) => ReactNode;

/**
 * Builds the `render` option of a Tiptap suggestion: mounts `SuggestionList`
 * in a floating element positioned at the cursor.
 */
export function createSuggestionRenderer<T>(
  listProps: Omit<SuggestionListProps<T>, "items" | "command">,
): SuggestionOptions<T>["render"] {
  return () => {
    let renderer: ReactRenderer<SuggestionListHandle> | null = null;
    let container: HTMLDivElement | null = null;

    const position = (props: SuggestionProps<T>) => {
      const rect = props.clientRect?.();
      if (!rect || !container) return;
      const reference = { getBoundingClientRect: () => rect };
      void computePosition(reference, container, {
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (container) Object.assign(container.style, { left: `${x}px`, top: `${y}px` });
      });
    };

    const toProps = (props: SuggestionProps<T>) => ({
      ...listProps,
      items: props.items,
      command: (item: T) => props.command(item),
    });

    return {
      onStart: (props) => {
        container = document.createElement("div");
        container.className = "ce-floating";
        document.body.appendChild(container);
        renderer = new ReactRenderer(SuggestionList as never, {
          props: toProps(props),
          editor: props.editor,
        });
        container.appendChild(renderer.element);
        position(props);
      },
      onUpdate: (props) => {
        renderer?.updateProps(toProps(props));
        position(props);
      },
      onKeyDown: ({ event }) => {
        if (event.key === "Escape") {
          container?.remove();
          return true;
        }
        return renderer?.ref?.onKeyDown(event) ?? false;
      },
      onExit: () => {
        renderer?.destroy();
        container?.remove();
        renderer = null;
        container = null;
      },
    };
  };
}
