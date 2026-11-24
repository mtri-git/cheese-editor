import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { IconComponent } from "../core/types";
import { ToolbarButton } from "./ToolbarButton";

export interface PopoverProps {
  icon?: IconComponent;
  title: string;
  active?: boolean;
  disabled?: boolean;
  /** Content of the trigger button besides the icon. */
  label?: ReactNode;
  /** Show a dropdown chevron after the label. */
  caret?: boolean;
  /** Color bar under the icon (e.g. the current text color). */
  indicator?: string;
  /** Panel alignment relative to the trigger. Default "start". */
  align?: "start" | "end";
  children: (close: () => void) => ReactNode;
}

/** A toolbar button that opens a panel below it. Closes on outside click or Escape. */
export function Popover({
  icon,
  title,
  active,
  disabled,
  label,
  caret,
  indicator,
  align = "start",
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="ce-popover" ref={rootRef}>
      <ToolbarButton
        icon={icon}
        title={title}
        active={active || open}
        disabled={disabled}
        aria-expanded={open}
        className={[label && "ce-btn-labeled", indicator !== undefined && "ce-btn-indicator"]
          .filter(Boolean)
          .join(" ")}
        style={indicator ? ({ "--ce-indicator": indicator } as CSSProperties) : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label && <span className="ce-btn-label">{label}</span>}
        {caret && <ChevronDown size={14} className="ce-caret" />}
      </ToolbarButton>
      {open && (
        <div className={`ce-popover-panel ce-align-${align}`}>{children(() => setOpen(false))}</div>
      )}
    </div>
  );
}

export interface MenuItemProps {
  icon?: IconComponent;
  label: ReactNode;
  description?: ReactNode;
  active?: boolean;
  onSelect: () => void;
}

export function MenuItem({ icon: Icon, label, description, active, onSelect }: MenuItemProps) {
  return (
    <button
      type="button"
      className={["ce-menu-item", active && "is-active"].filter(Boolean).join(" ")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      {Icon && (
        <span className="ce-menu-icon">
          <Icon size={16} />
        </span>
      )}
      <span className="ce-menu-text">
        <span>{label}</span>
        {description && <span className="ce-menu-desc">{description}</span>}
      </span>
      {active && <Check size={14} className="ce-menu-check" />}
    </button>
  );
}

/** Small inline form used to ask for a URL (links, video embeds...). */
export function UrlForm({
  initial = "",
  placeholder = "https://",
  submitLabel = "OK",
  onSubmit,
}: {
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (url: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="ce-url-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <input
        autoFocus
        className="ce-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="ce-btn ce-btn-text">
        {submitLabel}
      </button>
    </form>
  );
}
