import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { cn } from "~/lib/cn";

/** The logo is used as-is (dark artwork) inside a rounded tile, per Mahmud's decision. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/tsc-logo.webp"
      width={size}
      height={size}
      alt=""
      className={cn("rounded-[22%] bg-[#0b0b0b] ring-1 ring-black/10", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLink() {
  const { t, href } = useLocale();
  return (
    <Link to={href("/")} className="flex items-center gap-2.5 rounded-lg" aria-label={`${t.meta.siteName} — ${t.meta.pillars}`}>
      <Logo size={36} />
      <span className="leading-none">
        <span className="block text-xl font-bold tracking-tight">TSC</span>
        <span className="hidden text-[0.7rem] text-muted sm:block">{t.meta.pillars}</span>
      </span>
    </Link>
  );
}
