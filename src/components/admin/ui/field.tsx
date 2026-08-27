import type { ReactNode } from "react";

/**
 * A labelled input for the panel's inline edit forms.
 *
 * Admin forms are dense and there are a lot of them, so the label is the small
 * mono column-head treatment rather than the user app's sentence labels — and
 * it is a real `<label>` wrapping its control, so clicking it focuses the
 * field and screen readers get the association without an id to keep unique
 * across a table of thirty rows.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
  type = "text",
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: "text" | "number";
  /** Keeps the label for screen readers where the column head already says it. */
  hideLabel?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span
        className={
          hideLabel ? "sr-only" : "text-12 uppercase tracking-wide text-text-muted"
        }
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text placeholder:text-text-muted"
      />
    </label>
  );
}

/** The same treatment for a `<select>`. */
export function SelectField({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-12 uppercase tracking-wide text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-hairline bg-base px-3 py-1.5 text-14 text-text"
      >
        {children}
      </select>
    </label>
  );
}

/** The panel's one button treatment: bordered, quiet, never a neon fill. */
export function AdminButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded border border-hairline px-3 py-1.5 text-14 text-text hover:border-text-muted disabled:opacity-50"
    >
      {children}
    </button>
  );
}
