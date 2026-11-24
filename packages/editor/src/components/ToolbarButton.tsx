import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import type { IconComponent } from "../core/types";

export interface ToolbarButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon?: IconComponent;
  title: string;
  active?: boolean;
  /** Shown after the title in the native tooltip, e.g. "Mod-B". */
  shortcut?: string;
  children?: ReactNode;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function formatShortcut(shortcut: string) {
  return shortcut
    .replace(/Mod/g, isMac ? "⌘" : "Ctrl")
    .replace(/Shift/g, isMac ? "⇧" : "Shift")
    .replace(/Alt/g, isMac ? "⌥" : "Alt");
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, title, active, shortcut, children, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={["ce-btn", active && "is-active", className].filter(Boolean).join(" ")}
      title={shortcut ? `${title} (${formatShortcut(shortcut)})` : title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      {...rest}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  ),
);
ToolbarButton.displayName = "ToolbarButton";

export function ToolbarSeparator() {
  return <span className="ce-separator" role="separator" />;
}
