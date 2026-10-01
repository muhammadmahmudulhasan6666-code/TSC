import { ArrowLeft, BadgeCheck, CalendarDays, GraduationCap, Layers, MapPin, MonitorSmartphone, Phone, Share2, ShieldCheck, Star, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types/teacher-profile";
import { useLocale } from "~/i18n";
import { getPublicTeacher, type TeacherProfile } from "~/lib/api";
import { formatDate, formatNumber } from "~/lib/format";
import { pageMeta, SITE_URL } from "~/lib/seo";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { ErrorState } from "~/components/site/error-state";
import { Magnetic } from "~/components/fx/magnetic";
import { Reveal } from "~/components/fx/reveal";
import { Avatar, TrustRing, rateLabel } from "~/components/teachers/teacher-card";

export async function loader({ params }: Route.LoaderArgs) {
  return { teacher: await getPublicTeacher(params.tscId) };
}

export const meta: Route.MetaFunction = ({ loaderData, location }) => {
  const p = loaderData?.teacher;
  if (!p) return [{ title: "Teacher — TSC" }, { name: "robots", content: "noindex" }];
  const name = p.full_name?.trim() || p.tsc_id;
  const where = [p.institution ?? p.university_name?.trim(), p.department].filter(Boolean).join(" · ");
  const subjects = p.subjects.slice(0, 4).join(", ");
  return pageMeta({
    path: location.pathname,
    image: p.photo_url ?? undefined,
    bn: { title: `${name} — Verified Teacher (${where}) | TSC`, description: `${name}, ${where}। ${subjects} পড়ান${p.district ? ` — ${p.district}` : ""}। NID ও University ID-তে যাচাই করা TSC teacher (${p.tsc_id})।` },
    en: { title: `${name} — Verified teacher (${where}) | TSC`, description: `${name}, ${where}. Teaches ${subjects}${p.district ? ` in ${p.district}` : ""}. NID- and university-ID-verified TSC teacher (${p.tsc_id}).` },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name,
      identifier: p.tsc_id,
      jobTitle: "Tutor",
      image: p.photo_url ?? undefined,
      url: `${SITE_URL}/teachers/${p.tsc_id}`,
      alumniOf: p.university_name?.trim() || undefined,
      knowsAbout: p.subjects,
      address: p.district ? { "@type": "PostalAddress", addressLocality: p.thana ?? undefined, addressRegion: p.district, addressCountry: "BD" } : undefined,
    },
  });
};

function Fact({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-text/6 text-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

export default function TeacherProfilePage({ loaderData }: Route.ComponentProps) {
  const { t, href, locale } = useLocale();
  const x = t.profile;
  const tt = t.teachers;
  const { tscId = "" } = useParams();
  const [p, setP] = useState<TeacherProfile | null>(loaderData.teacher);

  useEffect(() => {
    getPublicTeacher(tscId).then(setP).catch(() => {});
  }, [tscId]);

  if (!p) return <ErrorState code="404" title={x.notFoundTitle} body={x.notFoundBody} action={x.back} homeHref={href("/teachers")} />;

  const name = p.full_name?.trim() || p.tsc_id;
  const modeLabel = p.mode === "both" ? tt.both : p.mode === "online" ? tt.online : p.mode === "offline" ? tt.offline : null;

  async function share() {
    const url = `${window.location.origin}${href(`/teachers/${p!.tsc_id}`)}`;
    if (navigator.share) {
      await navigator.share({ title: `${name} — TSC`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(x.copied);
    }
  }

  return (
    <div className="container-page grid grid-cols-1 gap-5 pb-28 pt-6 sm:pt-10 [&>*]:min-w-0">
      <Reveal from="left">
        <Link to={href("/teachers")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:bg-text/5 hover:text-text">
          <ArrowLeft className="size-4" aria-hidden />
          {x.back}
        </Link>
      </Reveal>

      {/* Identity */}
      <Reveal from="blur">
        <Card tint={p.is_tsc_certified ? "gold" : "rose"}>
          <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="logo-ring w-fit self-center sm:self-auto">
              <Avatar name={p.full_name} url={p.photo_url} size={120} className="rounded-[26px]" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="break-words text-3xl sm:text-4xl">{name}</h1>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-muted sm:justify-start">
                <GraduationCap className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{[p.university_name?.trim(), p.department, p.academic_year].filter(Boolean).join(" · ")}</span>
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-sm font-bold text-brand">
                  <BadgeCheck className="size-4" aria-hidden />
                  {t.common.verified}
                </span>
                {p.is_tsc_certified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
                    <ShieldCheck className="size-4" aria-hidden />
                    {t.common.certified}
                  </span>
                )}
                <span className="rounded-full bg-text/6 px-2.5 py-1 text-sm font-bold text-muted">
                  {t.common.tscId}: {p.tsc_id}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 sm:items-end">
              {p.total_reviews > 0 ? (
                <>
                  <TrustRing score={p.trust_score} size={76} label={x.trustScore} />
                  <span className="text-xs font-bold text-muted">{x.trustScore}</span>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-violet/10 px-3 py-1.5 text-sm font-bold text-violet">{tt.newTeacher}</span>
                  <span className="max-w-[12rem] text-center text-xs text-muted sm:text-right">{tt.newTeacherHint}</span>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <div className="grid gap-5 [&>*]:min-w-0">
          <Reveal from="orbitLeft">
            <Card>
              <CardBody>
                <h2 className="text-xl">{x.about}</h2>
                <p className="mt-3 whitespace-pre-line text-muted">{p.bio_summary?.trim() || x.noBio}</p>
              </CardBody>
            </Card>
          </Reveal>
          {p.subjects.length > 0 && (
            <Reveal from="orbitLeft" delay={0.08}>
              <Card>
                <CardBody>
                  <h2 className="text-xl">{x.subjects}</h2>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {p.subjects.map((s) => (
                      <li key={s} className="rounded-full border border-border-strong bg-surface/70 px-3.5 py-1.5">
                        {s}
                      </li>
                    ))}
                  </ul>
                  {p.teaching_level && (
                    <>
                      <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-muted">{x.levels}</h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {p.teaching_level.split(",").map((l) => (
                          <li key={l} className="rounded-full bg-text/6 px-3 py-1 text-sm">
                            {l.trim()}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardBody>
              </Card>
            </Reveal>
          )}
        </div>

        <div className="grid content-start gap-5 [&>*]:min-w-0">
          <Reveal from="orbitRight">
            <Card>
              <CardBody>
                <dl className="grid gap-5">
                  {(p.district || p.thana) && (
                    <Fact icon={MapPin} label={x.location}>
                      {[p.thana, p.district].filter(Boolean).join(", ")}
                    </Fact>
                  )}
                  {modeLabel && (
                    <Fact icon={MonitorSmartphone} label={tt.mode}>
                      {modeLabel}
                    </Fact>
                  )}
                  <Fact icon={Wallet} label={x.rate}>
                    <span className="tabular font-bold">{rateLabel(p, locale, tt)}</span>
                  </Fact>
                  {p.experience_years != null && p.experience_years > 0 && (
                    <Fact icon={Layers} label={tt.years}>
                      {formatNumber(p.experience_years, locale)}
                    </Fact>
                  )}
                  {p.total_reviews > 0 && (
                    <Fact icon={Star} label="Rating">
                      {formatNumber(Number(p.average_rating), locale)} ({formatNumber(p.total_reviews, locale)})
                    </Fact>
                  )}
                  <Fact icon={CalendarDays} label={x.memberSince}>
                    {formatDate(p.created_at, locale, { year: "numeric", month: "long" })}
                  </Fact>
                </dl>
                <p className="mt-5 text-xs text-muted">{x.trustHint}</p>
              </CardBody>
            </Card>
          </Reveal>

          <Reveal from="up" delay={0.1}>
            <div className="grid gap-3">
              <Magnetic className="block">
                <Button size="lg" block onClick={() => toast(t.common.comingSoon)}>
                  <Phone aria-hidden />
                  {x.unlock}
                </Button>
              </Magnetic>
              <Button asChild size="lg" variant="secondary" block>
                <Link to={href("/smart-match")}>
                  <Zap aria-hidden />
                  {x.smartMatch}
                </Link>
              </Button>
              <Button variant="ghost" block onClick={share}>
                <Share2 aria-hidden />
                {x.share}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
