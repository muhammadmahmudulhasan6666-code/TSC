import { Check } from "lucide-react";
import { useRef } from "react";
import { cn } from "~/lib/cn";

type Option = { code: string; label: string; hint?: string };

/** Tap-friendly option chips (≥44px). Single or multi select; `max` caps multi-select. */
export function Chips({
  options,
  value,
  onChange,
  multi,
  max,
  columns,
  label,
}: {
  options: Option[];
  value: string | string[] | undefined;
  onChange: (v: any) => void;
  multi?: boolean;
  max?: number;
  columns?: string;
  label?: string;
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  // Latest selection, so two quick taps before the parent re-renders don't overwrite each other.
  const latest = useRef(selected);
  latest.current = selected;
  function toggle(code: string) {
    if (!multi) return onChange(selected.has(code) ? undefined : code);
    const next = new Set(latest.current);
    if (next.has(code)) next.delete(code);
    else if (!max || next.size < max) next.add(code);
    latest.current = next;
    onChange([...next]);
  }
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={label} className={cn("flex flex-wrap gap-2", columns)}>
      {options.map((o) => {
        const on = selected.has(o.code);
        return (
          <button
            key={o.code}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => toggle(o.code)}
            className={cn(
              "relative inline-flex min-h-11 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-left text-[0.95rem] transition-all duration-200 active:scale-[0.97]",
              on
                ? "border-primary bg-primary/8 font-bold text-text shadow-[0_6px_18px_-10px_rgb(208_16_58/0.6)]"
                : "border-border-strong bg-surface/70 text-text hover:border-primary/40",
            )}
          >
            {on && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
            <span>
              {o.label}
              {o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
