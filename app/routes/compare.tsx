import { BadgeCheck, Loader2, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/compare";
import { useLocale } from "~/i18n";
import { getPublicTeacher, type TeacherProfile } from "~/lib/api";
import { formatNumber } from "~/lib/format";
import { pageMeta } from "~/lib/seo";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal } from "~/components/fx/reveal";
import { Avatar, TrustRing, rateLabel } from "~/components/teachers/teacher-card";

export const meta: Route.MetaFunction = ({ location }) =>
  pageMeta({
    path: location.pathname,
    noindex: true,
    bn: { title: "Teacher তুলনা — TSC", description: "৩ জন পর্যন্ত verified teacher পাশাপাশি তুলনা করুন।" },
    en: { title: "Compare teachers — TSC", description: "Compare up to 3 verified teachers side by side." },
  });

export default function Compare() {
  const { t, href, locale } = useLocale();
  const x = t.saved;
  const tt = t.teachers;
  const [params, setParams] = useSearchParams();
  const ids = (params.get("t") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^T\d+$/.test(s)).slice(0, 3);
  const [rows, setRows] = useState<TeacherProfile[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return setRows([]);
    Promise.all(key.split(",").map((id) => getPublicTeacher(id).catch(() => null))).then((r) => setRows(r.filter(Boolean) as TeacherProfile[]));
  }, [key]);

  const remove = (id: string) => setParams({ t: ids.filter((i) => i !== id).join(",") }, { replace: true });
  const modeLabel = (p: TeacherProfile) => (p.mode === "both" ? tt.both : p.mode === "online" ? tt.online : p.mode === "offline" ? tt.offline : "—");

  const fields: [string, (p: TeacherProfile) => React.ReactNode][] = [
    [x.rows.university, (p) => [p.institution ?? p.university_name?.trim(), p.department].filter(Boolean).join(" · ") || "—"],
    [x.rows.subjects, (p) => p.subjects.join(", ") || "—"],
    [x.rows.area, (p) => [p.thana, p.district].filter(Boolean).join(", ") || "—"],
    [x.rows.mode, modeLabel],
    [x.rows.rate, (p) => <span className="tabular font-bold">{rateLabel(p, locale, tt)}</span>],
    [x.rows.experience, (p) => (p.experience_years ? `${formatNumber(p.experience_years, locale)} ${t.posts.form.years}` : "—")],
    [
      x.rows.rating,
      (p) =>
        p.total_reviews > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-4 fill-gold text-gold" aria-hidden />
            {formatNumber(Number(p.average_rating), locale)} ({formatNumber(p.total_reviews, locale)})
          </span>
        ) : (
          <span className="text-muted">{x.noReviewsYet}</span>
        ),
    ],
    [x.rows.trust, (p) => (p.total_reviews > 0 ? <TrustRing score={p.trust_score} size={44} label={x.rows.trust} /> : <span className="text-muted">—</span>)],
    [x.rows.students, (p) => (p.total_students_taught ? formatNumber(p.total_students_taught, locale) : "—")],
  ];

  return (
    <div className="container-page grid grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.compareTitle}</h1>
        <p className="mt-2 text-muted">{x.compareHint}</p>
      </Reveal>

      {rows === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : rows.length < 2 ? (
        <Card>
          <CardBody className="grid justify-items-center gap-4 py-10 text-center">
            <p className="text-muted">{x.compareEmpty}</p>
            <Button asChild>
              <Link to={href("/dashboard/saved")}>{x.title}</Link>
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-28 bg-surface/95 p-3" />
                  {rows.map((p) => (
                    <th key={p.tsc_id} className="p-3 text-left align-top font-normal">
                      <div className="grid justify-items-start gap-2">
                        <div className="flex w-full items-start justify-between gap-2">
                          <Avatar name={p.full_name} url={p.photo_url} size={52} />
                          <button type="button" onClick={() => remove(p.tsc_id)} aria-label={x.remove} className="grid size-8 place-items-center rounded-full hover:bg-text/6">
                            <X className="size-4" aria-hidden />
                          </button>
                        </div>
                        <Link to={href(`/teachers/${p.tsc_id}`)} className="text-base font-bold hover:underline">
                          {p.full_name?.trim() || p.tsc_id}
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                          <BadgeCheck className="size-3.5" aria-hidden />
                          {p.tsc_id}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(([label, render]) => (
                  <tr key={label} className="border-t border-border">
                    <th scope="row" className="sticky left-0 z-10 bg-surface/95 p-3 text-left text-xs font-bold uppercase tracking-wider text-muted">
                      {label}
                    </th>
                    {rows.map((p) => (
                      <td key={p.tsc_id} className="p-3 align-top [overflow-wrap:anywhere]">
                        {render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
