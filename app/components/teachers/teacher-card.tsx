import { ArrowUpRight, BadgeCheck, GraduationCap, MapPin, MonitorSmartphone, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router";
import type { TeacherCard as T } from "~/lib/api";
import { useLocale } from "~/i18n";
import { formatNumber, formatTaka } from "~/lib/format";
import { cn } from "~/lib/cn";
import { TiltCard } from "~/components/fx/tilt-card";

/** Initials on a brand gradient when a teacher has no photo (never a broken image). */
export function Avatar({ name, url, size = 64, className }: { name: string | null; url: string | null; size?: number; className?: string }) {
  const initials = (name ?? "T").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return url ? (
    <img src={url} alt="" width={size} height={size} loading="lazy" decoding="async" className={cn("shrink-0 rounded-[22px] object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-[22px] bg-[image:var(--grad-primary)] font-bold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}

/** Small circular gauge for the 0–100 trust score. */
export function TrustRing({ score, size = 46, label }: { score: number; size?: number; label: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "var(--brand)" : score >= 60 ? "var(--gold)" : "var(--primary)";
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} title={`${label} ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="tabular absolute text-xs font-bold">{score}</span>
    </span>
  );
}

export function rateLabel(t: T, locale: "bn" | "en", tr: { perMonth: string; perHour: string; negotiable: string }) {
  if (t.monthly_rate_inperson) return `${formatTaka(Number(t.monthly_rate_inperson), locale)}${tr.perMonth}`;
  if (t.hourly_rate_online) return `${formatTaka(Number(t.hourly_rate_online), locale)}${tr.perHour}`;
  return tr.negotiable;
}

export function TeacherCard({ teacher: t, compact }: { teacher: T; compact?: boolean }) {
  const { t: tr, href, locale } = useLocale();
  const x = tr.teachers;
  const modeLabel = t.mode === "both" ? x.both : t.mode === "online" ? x.online : t.mode === "offline" ? x.offline : null;
  const tint = t.is_featured || t.is_tsc_certified ? "gold" : "rose";

  return (
    <TiltCard tint={tint} intensity={6} className="h-full">
      <Link to={href(`/teachers/${t.tsc_id}`)} className="flex h-full flex-col p-5">
        <div className="flex items-start gap-4">
          <Avatar name={t.full_name} url={t.photo_url} size={compact ? 56 : 64} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg leading-tight">{t.full_name?.trim() || t.tsc_id}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <GraduationCap className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{[t.institution ?? t.university_name?.trim(), t.department].filter(Boolean).join(" · ")}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                <BadgeCheck className="size-3.5" aria-hidden />
                {tr.common.verified}
              </span>
              {t.is_tsc_certified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-bold text-gold ring-1 ring-gold/40">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {tr.common.certified}
                </span>
              )}
              <span className="rounded-full bg-text/6 px-2 py-0.5 text-xs font-bold text-muted">{t.tsc_id}</span>
            </div>
          </div>
          {/* Until a first review exists the score only reflects verification, so show "new" instead of a low number. */}
          {t.total_reviews > 0 ? (
            <TrustRing score={t.trust_score} label={x.trust} />
          ) : (
            <span className="shrink-0 rounded-full bg-violet/10 px-2.5 py-1 text-xs font-bold text-violet" title={x.newTeacherHint}>
              {x.newTeacher}
            </span>
          )}
        </div>

        {!compact && t.subjects.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {t.subjects.slice(0, 4).map((s) => (
              <li key={s} className="rounded-full border border-border-strong bg-surface/70 px-2.5 py-1 text-xs">
                {s}
              </li>
            ))}
            {t.subjects.length > 4 && <li className="rounded-full px-1.5 py-1 text-xs text-muted">+{formatNumber(t.subjects.length - 4, locale)}</li>}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-sm">
          <div className="grid min-w-0 gap-1 text-muted">
            {(t.district || t.thana) && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {[t.thana, t.district].filter(Boolean).join(", ")}
              </span>
            )}
            {modeLabel && (
              <span className="flex items-center gap-1.5">
                <MonitorSmartphone className="size-4 shrink-0" aria-hidden />
                {modeLabel}
              </span>
            )}
          </div>
          <div className="shrink-0 text-right">
            {t.total_reviews > 0 && (
              <span className="mb-0.5 flex items-center justify-end gap-1 text-xs text-muted">
                <Star className="size-3.5 fill-gold text-gold" aria-hidden />
                {formatNumber(Number(t.average_rating), locale)} ({formatNumber(t.total_reviews, locale)})
              </span>
            )}
            <span className="tabular font-bold">{rateLabel(t, locale, x)}</span>
          </div>
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]">
          {x.viewProfile}
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </TiltCard>
  );
}
