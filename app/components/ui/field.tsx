import { useId } from "react";
import { cn } from "~/lib/cn";

type FieldProps = React.ComponentProps<"input"> & { label: string; hint?: string; error?: string };

/** Labelled input with hint/error wired to aria-describedby. 16px text so iOS doesn't zoom on focus. */
export function Field({ label, hint, error, className, id, ...props }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const descId = `${inputId}-desc`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? descId : undefined}
        className={cn(
          "h-12 w-full rounded-[10px] border border-border-strong bg-surface px-3.5 text-base text-text placeholder:text-muted/70",
          "transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <p id={descId} className={cn("text-sm", error ? "text-danger" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
