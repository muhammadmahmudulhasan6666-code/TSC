import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardList, RefreshCcw, Search, Smartphone, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/smart-match";
import { useLocale } from "~/i18n";
import { getPrices } from "~/lib/api";
import { formatNumber, formatTaka } from "~/lib/format";
import { pageMeta } from "~/lib/seo";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Magnetic } from "~/components/fx/magnetic";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { TiltCard } from "~/components/fx/tilt-card";

export async function loader() {
  const prices = await getPrices().catch(() => ({}) as Awaited<ReturnType<typeof getPrices>>);
  return { price: prices.smart_match?.price_bdt ?? 250 };
}

export const meta: Route.MetaFunction = ({ location, loaderData }) =>
  pageMeta({
    path: location.pathname,
    bn: { title: "Smart Match — TSC নিজে বেছে দেবে আপনার Teacher | TSC", description: "চাহিদা জানান, TSC-র team নিজে হাতে বেছে দেবে একজন verified, dedicated teacher। না মিললে ১ বার replacement, কাউকে না পেলে পুরো টাকা ফেরত।" },
    en: { title: "Smart Match — TSC hand-picks your teacher | TSC", description: "Tell us what you need and the TSC team hand-picks one verified, dedicated teacher. One free replacement; full refund if we can't propose anyone." },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "TSC Smart Match",
      provider: { "@type": "EducationalOrganization", name: "TSC — Trust · Success · Care" },
      areaServed: "BD",
      offers: { "@type": "Offer", price: String(loaderData?.price ?? 250), priceCurrency: "BDT" },
    },
  });

const stepIcons = [ClipboardList, Smartphone, BadgeCheck];

export default function SmartMatch({ loaderData }: Route.ComponentProps) {
  const { t, href, locale } = useLocale();
  const x = t.match;

  return (
    <div className="grid grid-cols-1 gap-16 pb-24 pt-10 sm:gap-24 sm:pt-16 [&>*]:min-w-0">
      {/* Hero */}
      <section className="container-page grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <Reveal from="blur">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet/10 px-3 py-1.5 text-sm font-bold text-violet">
              <Zap className="size-4" aria-hidden />
              {x.eyebrow}
            </span>
          </Reveal>
          <Reveal from="up" delay={0.05}>
            <h1 className="mt-5 text-4xl leading-tight sm:text-6xl">{x.title}</h1>
          </Reveal>
          <Reveal from="up" delay={0.1}>
            <p className="mt-5 max-w-xl text-lg text-muted">{x.subtitle}</p>
          </Reveal>
          <Reveal from="up" delay={0.15}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Magnetic>
                <Button asChild size="lg">
                  <Link to={href("/smart-match/new")}>
                    <Sparkles aria-hidden />
                    {x.cta}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild size="lg" variant="secondary">
                <Link to={href("/teachers")}>
                  <Search aria-hidden />
                  {x.findTeachers}
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal from="orbitRight">
          <TiltCard>
            <Card tint="violet">
              <CardBody className="grid gap-5 p-7 sm:p-9">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-muted">{x.price}</p>
                  <p className="tabular mt-1 text-6xl font-bold text-primary">{formatTaka(loaderData.price, locale)}</p>
                </div>
                <p className="font-bold">{x.includesTitle}</p>
                <ul className="grid gap-3">
                  {x.includes.map((item, i) => (
                    <li key={item} className="flex items-start gap-3">
                      {i === 1 ? <RefreshCcw className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </TiltCard>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="container-page">
        <Reveal from="up">
          <h2 className="text-3xl sm:text-4xl">{x.howTitle}</h2>
        </Reveal>
        <Stagger orbit className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {x.how.map((s, i) => {
            const Icon = stepIcons[i];
            return (
              <Card key={s.title} className="h-full">
                <CardBody className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[image:var(--grad-primary)] text-on-primary shadow-[var(--glow-primary)]">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="tabular text-sm font-bold text-muted">{formatNumber(i + 1, locale).padStart(2, locale === "bn" ? "০" : "0")}</span>
                  </div>
                  <h3 className="text-xl">{s.title}</h3>
                  <p className="text-muted">{s.body}</p>
                </CardBody>
              </Card>
            );
          })}
        </Stagger>
      </section>

      {/* FAQ */}
      <section className="container-page max-w-3xl">
        <Reveal from="up">
          <h2 className="text-3xl sm:text-4xl">{x.faqTitle}</h2>
        </Reveal>
        <div className="mt-6 grid gap-3">
          {x.faq.map((f) => (
            <Reveal key={f.q} from="up">
              <details className="glass group rounded-[22px] p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                  {f.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-text/6 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <Reveal from="scale">
          <div className="mt-10 flex justify-center">
            <Magnetic>
              <Button asChild size="lg">
                <Link to={href("/smart-match/new")}>
                  {x.cta}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
