import { ArrowRight, BookOpen, Calculator, FileText, Megaphone, Search, Sparkles, UserPlus, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { useLocale } from "~/i18n";
import { getHomeStats, searchTeachers, type HomeStats, type TeacherCard as TCard } from "~/lib/api";
import { Hero } from "~/components/home/hero";
import { Button } from "~/components/ui/button";
import { CountUp } from "~/components/fx/count-up";
import { Magnetic } from "~/components/fx/magnetic";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { ScrollText } from "~/components/fx/scroll-text";
import { TiltCard } from "~/components/fx/tilt-card";
import { TeacherCard } from "~/components/teachers/teacher-card";
import { organizationLd, pageMeta } from "~/lib/seo";

// Pre-rendered with real numbers at build time (SEO), then refreshed live in the browser.
export async function loader() {
  const [stats, teachers] = await Promise.all([getHomeStats(), searchTeachers({ limit: 9 })]);
  return { stats, teachers: teachers.items };
}

export const meta: Route.MetaFunction = ({ location }) =>
  pageMeta({
    path: location.pathname,
    bn: { title: "TSC — Verified Teacher খুঁজুন | Trust · Success · Care", description: "NID ও University ID-তে যাচাই করা teacher, প্রথম trial-এ ৫০% ছাড়, teacher-দের জন্য zero commission। বাংলাদেশের verified tutor platform।" },
    en: { title: "TSC — Find verified teachers in Bangladesh | Trust · Success · Care", description: "Teachers verified with national and university ID, 50% off your first trial and zero commission for teachers." },
    jsonLd: organizationLd,
  });

function useLive<T>(initial: T, load: () => Promise<T>) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    load().then(setValue).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { t, href, locale } = useLocale();
  const h = t.home;
  const stats = useLive<HomeStats>(loaderData.stats, getHomeStats);
  const teachers = useLive<TCard[]>(loaderData.teachers, () => searchTeachers({ limit: 9 }).then((r) => r.items));

  const statItems = [
    [stats.verified_teachers, h.statTeachers, "text-primary"],
    [stats.students, h.statStudents, "text-brand"],
    [stats.institutions, h.statInstitutions, "text-gold"],
    [stats.subjects, h.statSubjects, "text-violet"],
  ] as const;

  const c = t.styleguide.cards;
  const explore = [
    { icon: Search, tint: "rose", title: c.findTitle, body: c.findBody, to: "/teachers" },
    { icon: Zap, tint: "violet", title: c.matchTitle, body: c.matchBody, to: "/smart-match" },
    { icon: Megaphone, tint: "mint", title: c.postTitle, body: c.postBody, to: "/teacher-needed" },
    { icon: Calculator, tint: "gold", title: c.mathTitle, body: c.mathBody, to: "/mathsprint" },
    { icon: BookOpen, tint: "violet", title: c.notesTitle, body: c.notesBody, to: "/mynotes" },
    { icon: FileText, tint: "mint", title: c.freeTitle, body: c.freeBody, to: "/free-materials" },
  ] as const;

  return (
    <>
      <Hero />

      {/* ── Live numbers ─────────────────────────────────────────────── */}
      <section className="container-page">
        <Reveal from="scale">
          <div className="glass relative overflow-hidden rounded-[28px] p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl">{h.statsTitle}</h2>
            <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 text-center sm:grid-cols-4">
              {statItems.map(([n, label, color]) => (
                <div key={label} className="min-w-0">
                  <dd className={`tabular text-4xl font-bold sm:text-5xl ${color}`}>
                    <CountUp value={n} locale={locale} />
                  </dd>
                  <dt className="mt-1 text-sm text-muted sm:text-base">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-7 text-center text-xs text-muted">{h.statsNote}</p>
          </div>
        </Reveal>

        {stats.top_institutions.length > 0 && (
          <Reveal from="up" className="mt-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted">{h.campusTitle}</p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2.5">
              {stats.top_institutions.map((i) => (
                <li key={i.code} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold">
                  {i.code}
                  <span className="tabular rounded-full bg-primary/10 px-2 text-sm text-primary">{formatCount(i.n, locale)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </section>

      {/* ── Verified teachers ────────────────────────────────────────── */}
      {teachers.length > 0 && (
        <section className="container-page py-20 sm:py-28">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <Reveal from="blur" className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl">{h.teachersTitle}</h2>
              <p className="mt-3 text-lg text-muted">{h.teachersBody}</p>
            </Reveal>
            <Reveal from="right">
              <Button asChild variant="secondary">
                <Link to={href("/teachers")}>
                  {h.seeAllTeachers}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Reveal>
          </div>
          <Stagger orbit step={0.08} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.slice(0, 6).map((teacher) => (
              <TeacherCard key={teacher.tsc_id} teacher={teacher} />
            ))}
          </Stagger>
        </section>
      )}

      {/* ── Manifesto ────────────────────────────────────────────────── */}
      <section className="container-page py-16 sm:py-28">
        <ScrollText text={t.styleguide.manifesto} className="mx-auto max-w-4xl text-3xl font-bold leading-[1.35] sm:text-5xl" />
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="container-page py-16 sm:py-24">
        <Reveal from="blur" className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl">{h.stepsTitle}</h2>
        </Reveal>
        <ol className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          <span aria-hidden className="absolute left-[16%] right-[16%] top-11 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
          {h.steps.map((s, i) => (
            <Reveal as="li" key={s.title} from={i === 0 ? "orbitLeft" : i === 2 ? "orbitRight" : "up"} delay={i * 0.12}>
              <TiltCard tint={(["rose", "violet", "mint"] as const)[i]} className="h-full">
                <div className="p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[image:var(--grad-primary)] text-xl font-bold text-white shadow-[var(--glow-primary)]">
                    {formatCount(i + 1, locale)}
                  </span>
                  <h3 className="mt-5 text-xl">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── Ecosystem ────────────────────────────────────────────────── */}
      <section className="container-page py-16 sm:py-24">
        <Reveal from="blur" className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">{t.meta.pillars}</p>
          <h2 className="text-3xl sm:text-4xl">{h.exploreTitle}</h2>
          <p className="mt-3 text-lg text-muted">{h.exploreBody}</p>
        </Reveal>
        <Stagger orbit step={0.1} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {explore.map(({ icon: Icon, tint, title, body, to }) => (
            <TiltCard key={title} tint={tint} className="h-full">
              <Link to={href(to)} className="flex h-full flex-col p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-[var(--chip)] text-[var(--accent)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl">{title}</h3>
                <p className="mt-2 text-muted">{body}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-[var(--accent)]">
                  {c.open}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </TiltCard>
          ))}
        </Stagger>
      </section>

      {/* ── For teachers ─────────────────────────────────────────────── */}
      <section className="container-page py-12">
        <Reveal from="scale">
          <div className="glass tint-gold relative overflow-hidden rounded-[32px] p-7 sm:p-12">
            <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--gold-2)_45%,transparent),transparent_65%)] blur-2xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-3 py-1 text-sm font-bold text-gold">
                  <Wallet className="size-4" aria-hidden />
                  0% Commission
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl">{h.teacherBandTitle}</h2>
                <p className="mt-3 max-w-xl text-lg text-muted">{h.teacherBandBody}</p>
              </div>
              <div className="md:justify-self-end">
                <Magnetic className="block">
                  <Button asChild size="lg" variant="premium" block>
                    <Link to={href("/register?role=teacher")}>
                      <UserPlus aria-hidden />
                      {h.teacherBandCta}
                    </Link>
                  </Button>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="container-page py-24 text-center sm:py-32">
        <Reveal from="blur">
          <Sparkles className="mx-auto size-8 text-primary" aria-hidden />
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl sm:text-5xl">{h.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{h.finalBody}</p>
          <div className="mt-9 flex justify-center">
            <Magnetic>
              <Button asChild size="lg">
                <Link to={href("/register")}>
                  <UserPlus aria-hidden />
                  {h.finalCta}
                </Link>
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </>
  );
}

const formatCount = (n: number, locale: "bn" | "en") => new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-GB").format(n);
