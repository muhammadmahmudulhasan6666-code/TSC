import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { passwordStrength } from "~/lib/auth";
import { cn } from "~/lib/cn";
import { Logo } from "~/components/site/brand";

/** Centered glass card on the aurora backdrop, with a soft crimson glow behind it. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { href } = useLocale();
  return (
    <section className="container-page grid min-h-[calc(100svh-88px)] place-items-center py-10">
      <div className="rise relative w-full max-w-[440px]">
        <div aria-hidden className="absolute -inset-10 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary-2)_22%,transparent),transparent)] blur-2xl" />
        <div className="glass glass-strong rounded-[28px] p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <div className="relative">
            <Link to={href("/")} className="mx-auto mb-5 block w-fit" aria-label="TSC">
              <span className="logo-ring">
                <Logo size={52} className="shadow-none" />
              </span>
            </Link>
            <h1 className="text-center text-3xl">{title}</h1>
            {subtitle && <p className="mx-auto mt-2 max-w-sm text-center text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
        {footer && <div className="mt-6 text-center text-muted">{footer}</div>}
      </div>
    </section>
  );
}

const inputCls =
  "h-12 w-full rounded-[14px] border border-border-strong bg-surface/80 px-4 text-base text-text placeholder:text-muted/60 transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12";

export function TextField({ label, error, className, ...props }: React.ComponentProps<"input"> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input id={id} aria-invalid={error ? true : undefined} className={cn(inputCls, error && "border-danger", className)} {...props} />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function PasswordField({ label, showMeter, hint, ...props }: React.ComponentProps<"input"> & { label: string; showMeter?: boolean; hint?: string }) {
  const { t } = useLocale();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const value = String(props.value ?? "");
  const score = passwordStrength(value);
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-brand", "bg-brand"];
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={cn(inputCls, "pr-12")} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full text-muted hover:bg-text/5 hover:text-text"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
      {showMeter && (
        <div aria-live="polite">
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-colors duration-300", value && score >= i ? colors[score] : "bg-text/10")} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">{value ? t.auth.strength[score] : hint}</p>
        </div>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
      {children}
    </p>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
      <span className="h-px flex-1 bg-border-strong" />
      {label}
      <span className="h-px flex-1 bg-border-strong" />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Mask an email for display: ma•••••@gmail.com */
export const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, (_, a, b) => `${a}•••••${b}`);
