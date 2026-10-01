import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { cn } from "~/lib/cn";

/** The logo artwork as-is (dark tile), served sharp at 1×/2×/4× from the 1024px master. */
export function Logo({ size = 40, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <img
      src="/brand/tsc-logo-96.webp"
      srcSet="/brand/tsc-logo-96.webp 96w, /brand/tsc-logo-192.webp 192w, /brand/tsc-logo-384.webp 384w"
      sizes={`${size}px`}
      width={size}
      height={size}
      alt=""
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={cn("rounded-[24%] bg-[#120c0d] shadow-[0_6px_18px_-6px_rgb(120_10_30/0.55),inset_0_0_0_1px_rgb(255_255_255/0.06)]", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLink() {
  const { t, href } = useLocale();
  return (
    <Link to={href("/")} className="group flex items-center gap-2.5 rounded-full" aria-label={`${t.meta.siteName} — ${t.meta.pillars}`}>
      <Logo size={38} priority className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 group-hover:scale-105" />
      <span className="leading-none">
        <span className="block text-xl font-bold tracking-tight">TSC</span>
        <span className="hidden text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted sm:block">{t.meta.pillars}</span>
      </span>
    </Link>
  );
}
