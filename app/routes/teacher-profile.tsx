import { ArrowLeft, BadgeCheck, CalendarCheck, CalendarDays, GraduationCap, Layers, MapPin, MonitorSmartphone, Phone, Share2, ShieldCheck, Star, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
import { useAuth } from "~/lib/auth";
import { moneyErrorKey, requestContactUnlock } from "~/lib/money";
import { getTeacherReviews, type PublicReview } from "~/lib/trials";
import { SaveButton } from "~/components/teachers/save-button";
import { cn } from "~/lib/cn";

export async function loader({ params }: Route.LoaderArgs) {
  const [teacher, reviews] = await Promise.all([getPublicTeacher(params.tscId), getTeacherReviews(params.tscId).catch(() => [])]);
  return { teacher, reviews };
}

// Teachers verified after the last build have no pre-rendered data file: fetch live in the browser instead.
export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  try {
    return await serverLoader();
  } catch {
    const [teacher, reviews] = await Promise.all([getPublicTeacher(params.tscId), getTeacherReviews(params.tscId).catch(() => [])]);
    return { teacher, reviews };
  }
}
clientLoader.hydrate = true as const;

export const meta: Route.MetaFunction = ({ loaderData, location }) => {
  const p = loaderData?.teacher;
  if (!p) return [{ title: "Teacher — TSC" }, { name: "robots", content: "noindex" }];
  const name = p.full_name?.trim() || p.tsc_id;
  const where = [p.institution ?? p.university_name?.trim(), p.department].filter(Boolean).join(" · ");
  const subjects = p.subjects.slice(0, 4).join(", ");
  return pageMeta({
    path: location.pathname,
    image: p.photo_url ?? undefined,
    bn: { title: `${name} — Verified Teacher${where ? ` (${where})` : ""} | TSC`, description: `${name}${where ? `, ${where}` : ""}। ${subjects} পড়ান${p.district ? ` — ${p.district}` : ""}। NID ও University ID-তে যাচাই করা TSC teacher (${p.tsc_id})।` },
    en: { title: `${name} — Verified teacher${where ? ` (${where})` : ""} | TSC`, description: `${name}${where ? `, ${where}` : ""}. Teaches ${subjects}${p.district ? ` in ${p.district}` : ""}. NID- and university-ID-verified TSC teacher (${p.tsc_id}).` },
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
      aggregateRating: p.total_reviews > 0 ? { "@type": "AggregateRating", ratingValue: Number(p.average_rating), reviewCount: p.total_reviews, bestRating: 5 } : undefined,
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
  const { me } = useAuth();
  const navigate = useNavigate();
  const [unlocking, setUnlocking] = useState(false);
  const [reviews, setReviews] = useState<PublicReview[]>(loaderData.reviews ?? []);

  // Unlock: logged-out → log in and come back; otherwise create/reuse the unlock and go to payment or the list.
  async function unlock() {
    if (!me) {
      navigate(`${href("/login")}?next=${encodeURIComponent(href(`/teachers/${tscId}`))}`);
      return;
    }
    setUnlocking(true);
    try {
      const r = await requestContactUnlock(tscId);
      navigate(href(r.status === "awaiting_payment" ? `/pay/${r.payment_request_id}` : "/dashboard/unlocks"));
    } catch (e) {
      const k = moneyErrorKey(e as { code?: string });
      toast.error(k && k in t.unlock ? (t.unlock[k as keyof typeof t.unlock] as string) : t.auth.genericError);
    } finally {
      setUnlocking(false);
    }
  }

  useEffect(() => {
    getPublicTeacher(tscId).then(setP).catch(() => {});
    getTeacherReviews(tscId).then(setReviews).catch(() => {});
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
            {p.total_reviews > 0 && (
              <div className="flex flex-col items-center gap-1 sm:items-end">
                <TrustRing score={p.trust_score} size={76} label={x.trustScore} />
                <span className="text-xs font-bold text-muted">{x.trustScore}</span>
              </div>
            )}
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
          <Reveal from="orbitLeft" delay={0.12}>
            <Card>
              <CardBody>
                <h2 className="flex items-center gap-2 text-xl">
                  {t.review.sectionTitle}
                  {p.total_reviews > 0 && (
                    <span className="inline-flex items-center gap-1 text-base text-muted">
                      <Star className="size-4 fill-gold text-gold" aria-hidden />
                      {formatNumber(Number(p.average_rating), locale)} · {formatNumber(p.total_reviews, locale)}
                    </span>
                  )}
                </h2>
                {reviews.length === 0 ? (
                  <p className="mt-3 text-muted">{t.review.none}</p>
                ) : (
                  <ul className="mt-4 grid gap-4">
                    {reviews.map((r) => (
                      <li key={r.id} className="rounded-2xl bg-surface/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-0.5" aria-label={`${r.rating}/5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={cn("size-4", n <= r.rating ? "fill-gold text-gold" : "text-border-strong")} aria-hidden />
                            ))}
                          </span>
                          {r.after_trial && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{t.review.afterTrial}</span>}
                        </div>
                        {r.tags.length > 0 && (
                          <p className="mt-2 text-sm">{r.tags.map((c) => t.review.tags.find((g) => g.code === c)?.[locale] ?? c).join(" · ")}</p>
                        )}
                        {r.comment && <p className="mt-2 [overflow-wrap:anywhere]">“{r.comment}”</p>}
                        <p className="mt-2 text-xs text-muted">
                          {[r.reviewer_name, r.reviewer_class].filter(Boolean).join(" · ")} · {formatDate(r.created_at, locale, { year: "numeric", month: "short" })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </Reveal>
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
                {p.total_reviews > 0 && <p className="mt-5 text-xs text-muted">{x.trustHint}</p>}
              </CardBody>
            </Card>
          </Reveal>

          <Reveal from="up" delay={0.1}>
            <div className="grid gap-3">
              <Magnetic className="block">
                <Button size="lg" block onClick={unlock} disabled={unlocking}>
                  <Phone aria-hidden />
                  {t.unlock.cta}
                </Button>
              </Magnetic>
              {!(me?.roles.includes("teacher") && !me.roles.includes("student")) && (
              <Button asChild size="lg" variant="secondary" block>
                <Link to={me ? href(`/trial/${p.tsc_id}`) : `${href("/login")}?next=${encodeURIComponent(href(`/trial/${p.tsc_id}`))}`}>
                  <CalendarCheck aria-hidden />
                  {t.trial.cta}
                </Link>
              </Button>
              )}
              <Button asChild size="lg" variant="secondary" block>
                <Link to={href("/smart-match")}>
                  <Zap aria-hidden />
                  {x.smartMatch}
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <SaveButton tscId={p.tsc_id} />
                <Button variant="ghost" onClick={share}>
                  <Share2 aria-hidden />
                  {x.share}
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
