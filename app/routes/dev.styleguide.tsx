import { ArrowRight, ArrowUpRight, BookOpen, Calculator, FileText, Megaphone, Search, Sparkles, UserPlus, Zap } from "lucide-react";
import { useLocale } from "~/i18n";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Field } from "~/components/ui/field";
import { Logo } from "~/components/site/brand";
import { LanguageSwitch } from "~/components/site/header";
import { ThemeToggle } from "~/components/site/theme";
import { CountUp } from "~/components/fx/count-up";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { TiltCard } from "~/components/fx/tilt-card";
import { formatConnects, formatDate, formatNumber, formatTaka } from "~/lib/format";

export const meta = () => [{ title: "Design System — TSC" }, { name: "robots", content: "noindex" }];

const swatches = [
  ["--primary", "primary"],
  ["--primary-2", "primary-2"],
  ["--brand", "brand"],
  ["--brand-2", "brand-2"],
  ["--gold", "gold"],
  ["--violet", "violet"],
  ["--bg", "bg"],
  ["--surface", "surface"],
  ["--text", "text"],
  ["--text-muted", "muted"],
] as const;

function SectionHead({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <Reveal from="blur" className="mb-10 max-w-2xl">
      {eyebrow && <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-lg text-muted">{body}</p>}
    </Reveal>
  );
}

export default function Styleguide() {
  const { t, locale } = useLocale();
  const s = t.styleguide;
  const c = s.cards;

  const explore = [
    { icon: Search, tint: "rose", title: c.findTitle, body: c.findBody },
    { icon: Calculator, tint: "mint", title: c.mathTitle, body: c.mathBody },
    { icon: FileText, tint: "gold", title: c.freeTitle, body: c.freeBody },
    { icon: BookOpen, tint: "violet", title: c.notesTitle, body: c.notesBody },
    { icon: Zap, tint: "rose", title: c.matchTitle, body: c.matchBody },
    { icon: Megaphone, tint: "mint", title: c.postTitle, body: c.postBody },
  ] as const;

  return (
    <div className="pb-28">
      {/* ── Hero showcase ───────────────────────────────────────────── */}
      <section className="container-page pb-16 pt-12 text-center sm:pt-20">
        <div className="rise glass mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold">
          <Sparkles className="size-4 text-primary" aria-hidden />
          {s.heroPill}
        </div>

        <div className="pop glow-frame mx-auto mt-8 max-w-3xl" style={{ "--d": "0.1s" } as React.CSSProperties}>
          <div className="px-5 py-7 sm:px-12 sm:py-10">
            <h1 className="text-[2.5rem] leading-[1.08] sm:text-6xl">
              <span className="block">{s.heroLine1}</span>
              <span className="text-gradient block pb-1">{s.heroLine2}</span>
            </h1>
          </div>
        </div>

        <div className="rise" style={{ "--d": "0.3s" } as React.CSSProperties}>
          <p className="mx-auto mt-7 max-w-xl text-lg text-muted sm:text-xl">{s.heroBody}</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button size="lg">
              <Search aria-hidden />
              {s.heroCtaPrimary}
            </Button>
            <Button size="lg" variant="secondary">
              <UserPlus aria-hidden />
              {s.heroCtaSecondary}
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5">
              <span className="pulse-dot" aria-hidden />
              <b className="text-text">{s.liveLabel}</b>
              <span>
                <span className="whitespace-nowrap font-bold text-text">
                  <CountUp value={69} locale={locale} className="tabular" />+
                </span>{" "}
                {s.liveText}
              </span>
            </span>
            <Badge>{t.common.sample}</Badge>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────── */}
      <div className="mask-fade-x overflow-hidden border-y border-border py-4" aria-hidden>
        <div className="marquee gap-3">
          {[...s.marquee, ...s.marquee].map((label, i) => (
            <span key={i} className="glass mx-1.5 inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold">
              <span className="size-1.5 rounded-full bg-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Explore: tinted tilt cards sliding in from both sides ───── */}
      <section className="container-page py-20 sm:py-28">
        <SectionHead eyebrow={t.meta.pillars} title={s.exploreTitle} body={s.exploreBody} />
        <Stagger alternate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {explore.map(({ icon: Icon, tint, title, body }) => (
            <TiltCard key={title} tint={tint} className="h-full">
              <a href="#" className="flex h-full flex-col p-6" onClick={(e) => e.preventDefault()}>
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--chip)] text-[var(--accent)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <ArrowUpRight className="size-5 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" aria-hidden />
                </div>
                <h3 className="mt-5 text-xl">{title}</h3>
                <p className="mt-2 text-muted">{body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent)]">
                  {c.open}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </span>
              </a>
            </TiltCard>
          ))}
        </Stagger>
      </section>

      {/* ── Stats with count-up ─────────────────────────────────────── */}
      <section className="container-page">
        <Reveal from="scale">
          <div className="glass relative overflow-hidden rounded-[28px] p-6 sm:p-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl">{s.statsTitle}</h2>
              <Badge>{t.common.sample}</Badge>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                [69, s.statTeachers, "text-primary"],
                [131, s.statStudents, "text-brand"],
                [12, s.statDistricts, "text-gold"],
              ].map(([n, label, color]) => (
                <div key={label as string}>
                  <dd className={`tabular text-3xl font-bold sm:text-5xl ${color}`}>
                    <CountUp value={n as number} locale={locale} />
                  </dd>
                  <dt className="mt-1 text-sm text-muted sm:text-base">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </section>

      <div className="container-page">
        {/* ── Buttons & controls ───────────────────────────────────── */}
        <section className="pt-24">
          <SectionHead title={s.buttons} />
          <Reveal from="left" className="flex flex-wrap items-center gap-3">
            <Button>
              <Search aria-hidden />
              {s.primaryAction}
            </Button>
            <Button variant="secondary">
              {s.secondaryAction}
              <ArrowRight aria-hidden />
            </Button>
            <Button variant="brand">{s.brandAction}</Button>
            <Button variant="premium">
              <Sparkles aria-hidden />
              {s.premiumAction}
            </Button>
            <Button variant="ghost">{s.ghostAction}</Button>
            <Button disabled>{s.disabledAction}</Button>
          </Reveal>
          <Reveal from="right" className="mt-6 flex flex-wrap items-center gap-3">
            <LanguageSwitch />
            <ThemeToggle />
            <Button size="sm">{s.primaryAction}</Button>
            <Button size="lg">{s.primaryAction}</Button>
          </Reveal>
        </section>

        {/* ── Badges ───────────────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.badges} />
          <Reveal from="up" className="flex flex-wrap gap-2">
            <Badge tone="verified">{t.common.verified}</Badge>
            <Badge tone="certified">{t.common.certified}</Badge>
            <Badge tone="premium">{t.common.premium}</Badge>
            <Badge>{t.common.tscId}: T1</Badge>
            <Badge tone="warning">{t.common.comingSoon}</Badge>
          </Reveal>
        </section>

        {/* ── Glass cards ──────────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.cards2} />
          <Stagger className="grid gap-4 md:grid-cols-3" step={0.1}>
            <TiltCard tint="rose" className="h-full">
              <CardBody>
                <h3 className="text-xl">{s.cardTitle}</h3>
                <p className="mt-2 text-muted">{s.cardBody}</p>
                <Button className="mt-6" block>
                  {t.common.continue}
                </Button>
              </CardBody>
            </TiltCard>
            <TiltCard tint="mint" className="h-full">
              <CardBody>
                <p className="text-sm text-muted">
                  {s.walletTitle} · {s.balance}
                </p>
                <p className="tabular mt-2 text-4xl font-bold">
                  <CountUp value={125} locale={locale} /> <span className="text-2xl">{t.common.connects}</span>
                </p>
                <p className="tabular mt-1 text-muted">≈ {formatTaka(1250, locale)}</p>
              </CardBody>
            </TiltCard>
            <TiltCard tint="gold" className="h-full">
              <CardBody>
                <Badge tone="premium">{t.common.premium}</Badge>
                <h3 className="mt-3 text-xl">{s.premiumCardTitle}</h3>
                <p className="mt-2 text-muted">{s.premiumCardBody}</p>
                <Button variant="premium" className="mt-6" block>
                  {s.premiumAction}
                </Button>
              </CardBody>
            </TiltCard>
          </Stagger>
        </section>

        {/* ── Forms ────────────────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.forms} />
          <Reveal from="up">
            <Card className="max-w-md">
              <CardBody>
                <form className="grid gap-5" onSubmit={(e) => e.preventDefault()}>
                  <Field label={s.emailLabel} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" hint={s.emailHint} />
                  <Field label={s.passwordLabel} type="password" autoComplete="current-password" />
                  <Field label={s.emailLabel} type="email" defaultValue="mahmud@" error={s.errorSample} />
                  <Button type="submit" block size="lg">
                    {t.common.continue}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </Reveal>
        </section>

        {/* ── Typography ───────────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.typography} />
          <Reveal from="left" className="grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-4xl sm:text-5xl">{s.sampleHeading}</h3>
              <p className="mt-5 max-w-prose text-lg text-muted">{s.sampleBody}</p>
              <p className="mt-4">{s.mixedSample}</p>
            </div>
            <ol className="grid gap-3">
              {(["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-base"] as const).map((cls) => (
                <li key={cls} className="flex min-w-0 items-baseline gap-4 border-b border-border pb-3">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted">{cls.replace("text-", "")}</span>
                  <span className={`${cls} min-w-0 truncate font-bold`}>{locale === "bn" ? "বিশ্বাস Trust" : "Trust বিশ্বাস"}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* ── Colour ───────────────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.colors} />
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" step={0.04} from="scale">
            {swatches.map(([v, name]) => (
              <div key={v} className="glass overflow-hidden rounded-[18px]">
                <div className="h-16" style={{ background: `var(${v})` }} />
                <div className="relative p-3">
                  <p className="text-sm font-bold">{name}</p>
                  <p className="font-mono text-xs text-muted">{v}</p>
                </div>
              </div>
            ))}
          </Stagger>
        </section>

        {/* ── Numbers & dates ──────────────────────────────────────── */}
        <section className="pt-20">
          <SectionHead title={s.numbers} />
          <Reveal from="right">
            <Card className="max-w-md">
              <CardBody>
                <dl className="tabular grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
                  <dt className="text-muted">{t.common.connects}</dt>
                  <dd>{formatConnects(125, locale)}</dd>
                  <dt className="text-muted">৳</dt>
                  <dd>{formatTaka(2000, locale)}</dd>
                  <dt className="text-muted">#</dt>
                  <dd>{formatNumber(1234567, locale)}</dd>
                  <dt className="text-muted">{s.joined}</dt>
                  <dd>{formatDate("2026-10-01T10:00:00+06:00", locale)}</dd>
                </dl>
              </CardBody>
            </Card>
          </Reveal>
        </section>

        <footer className="mt-24 flex flex-col items-center gap-3 text-center text-sm text-muted">
          <Logo size={44} />
          <p>{s.previewNote}</p>
        </footer>
      </div>
    </div>
  );
}
