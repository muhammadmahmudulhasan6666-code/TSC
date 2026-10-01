import { ArrowRight, Search } from "lucide-react";
import { useLocale } from "~/i18n";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Field } from "~/components/ui/field";
import { Logo } from "~/components/site/brand";
import { formatConnects, formatDate, formatNumber, formatTaka } from "~/lib/format";

export const meta = () => [{ title: "Design system — TSC" }, { name: "robots", content: "noindex" }];

const swatches = [
  ["--bg", "bg"],
  ["--surface", "surface"],
  ["--surface-2", "surface-2"],
  ["--text", "text"],
  ["--text-muted", "muted"],
  ["--primary", "primary · crimson"],
  ["--brand", "brand · green"],
  ["--gold", "gold · premium only"],
  ["--success", "success"],
  ["--warning", "warning"],
  ["--danger", "danger"],
] as const;

const scale = [
  ["text-5xl", "3.75"],
  ["text-4xl", "2.75"],
  ["text-3xl", "2"],
  ["text-2xl", "1.5"],
  ["text-xl", "1.25"],
  ["text-lg", "1.125"],
  ["text-base", "1"],
  ["text-sm", "0.875"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12 sm:py-16">
      <h2 className="mb-8 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export default function Styleguide() {
  const { t, locale } = useLocale();
  const s = t.styleguide;
  const sampleDate = new Date("2026-10-01T10:00:00+06:00");

  return (
    <div className="container-page pb-24">
      <header className="flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:py-20">
        <Logo size={72} />
        <div>
          <p className="text-sm font-bold tracking-wide text-brand">{t.meta.pillars}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{s.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">{s.intro}</p>
        </div>
      </header>

      <Section title={s.colors}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map(([v, name]) => (
            <li key={v} className="overflow-hidden rounded-[14px] border border-border bg-surface">
              <div className="h-16 border-b border-border" style={{ background: `var(${v})` }} />
              <div className="p-3">
                <p className="text-sm font-bold">{name}</p>
                <p className="font-mono text-xs text-muted">{v}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={s.typography}>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h3 className="text-4xl sm:text-5xl">{s.sampleHeading}</h3>
            <p className="mt-5 max-w-prose text-lg text-muted">{s.sampleBody}</p>
            <p className="mt-4">{s.mixedSample}</p>
          </div>
          <ol className="grid gap-3">
            {scale.map(([cls, rem]) => (
              <li key={cls} className="flex items-baseline gap-4 border-b border-border pb-3">
                <span className="tabular w-16 shrink-0 font-mono text-xs text-muted">{rem}rem</span>
                <span className={`${cls} truncate font-bold`}>{locale === "bn" ? "বিশ্বাস Trust" : "Trust বিশ্বাস"}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section title={s.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Search aria-hidden />
            {s.primaryAction}
          </Button>
          <Button variant="secondary">
            {s.secondaryAction}
            <ArrowRight aria-hidden />
          </Button>
          <Button variant="brand">{t.common.continue}</Button>
          <Button variant="ghost">{s.ghostAction}</Button>
          <Button variant="premium">{s.premiumAction}</Button>
          <Button disabled>{s.disabledAction}</Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="sm">{s.primaryAction}</Button>
          <Button size="lg">{s.primaryAction}</Button>
        </div>
        <div className="mt-6 max-w-sm">
          <Button block size="lg">
            {s.primaryAction}
          </Button>
        </div>
      </Section>

      <Section title={s.badges}>
        <div className="flex flex-wrap gap-2">
          <Badge tone="verified">{t.common.verified}</Badge>
          <Badge tone="certified">{t.common.certified}</Badge>
          <Badge tone="premium">{t.common.premium}</Badge>
          <Badge>
            {t.common.tscId}: T1
          </Badge>
          <Badge tone="warning">{t.common.comingSoon}</Badge>
        </div>
      </Section>

      <Section title={s.cards}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardBody>
              <h3 className="text-xl">{s.cardTitle}</h3>
              <p className="mt-2 text-muted">{s.cardBody}</p>
              <Button className="mt-5" block>
                {t.common.continue}
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-muted">{s.balance}</p>
              <p className="tabular mt-1 text-4xl font-bold">{formatConnects(125, locale)}</p>
              <p className="tabular mt-1 text-muted">{formatTaka(1000, locale)}</p>
            </CardBody>
          </Card>
          <Card className="border-gold/50">
            <CardBody>
              <Badge tone="premium">{t.common.premium}</Badge>
              <h3 className="mt-3 text-xl">{s.premiumAction}</h3>
              <p className="mt-2 text-muted">{s.cardBody}</p>
              <Button variant="premium" className="mt-5" block>
                {s.premiumAction}
              </Button>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title={s.forms}>
        <form className="grid max-w-md gap-5" onSubmit={(e) => e.preventDefault()}>
          <Field label={s.emailLabel} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" hint={s.emailHint} />
          <Field label={s.passwordLabel} type="password" autoComplete="current-password" />
          <Field label={s.emailLabel} type="email" defaultValue="mahmud@" error={s.errorSample} />
          <Button type="submit" block size="lg">
            {t.common.continue}
          </Button>
        </form>
      </Section>

      <Section title={s.numbers}>
        <dl className="tabular grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3">
          <dt className="text-muted">{t.common.connects}</dt>
          <dd>{formatNumber(1234567, locale)}</dd>
          <dt className="text-muted">৳</dt>
          <dd>{formatTaka(2000, locale)}</dd>
          <dt className="text-muted">{s.joined}</dt>
          <dd>{formatDate(sampleDate, locale)}</dd>
        </dl>
      </Section>
    </div>
  );
}
