import { Loader2, Megaphone, PlusCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/tuition-posts";
import { useLocale } from "~/i18n";
import { CURRICULA, SUBJECTS } from "~/data/education";
import { DISTRICTS } from "~/data/geo";
import { useAuth } from "~/lib/auth";
import { formatNumber } from "~/lib/format";
import { listTuitionPosts, type TuitionPost } from "~/lib/posts";
import { pageMeta } from "~/lib/seo";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { PostCard } from "~/components/posts/post-card";

export const meta: Route.MetaFunction = ({ location }) =>
  pageMeta({
    path: location.pathname,
    bn: { title: "Tuition Post — অভিভাবকেরা যেমন Teacher খুঁজছেন | TSC", description: "চট্টগ্রাম, ঢাকা সহ সারা দেশের tuition চাহিদা — class, subject, এলাকা আর বাজেট সহ। Verified teacher হিসেবে আগ্রহ জানান, কোনো commission নেই।" },
    en: { title: "Tuition posts — what guardians are looking for | TSC", description: "Live tuition needs across Bangladesh with class, subject, area and budget. Raise your hand as a verified teacher — zero commission." },
  });

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full min-w-0 rounded-[12px] border border-border-strong bg-surface/80 px-3 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12">
        {children}
      </select>
    </label>
  );
}

export default function TuitionPosts() {
  const { t, href, locale } = useLocale();
  const x = t.posts;
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<TuitionPost[] | null>(null);
  const [total, setTotal] = useState(0);
  const filters = useMemo(() => ({ district: params.get("district") ?? "", subject: params.get("subject") ?? "", curriculum: params.get("curriculum") ?? "" }), [params]);
  const isTeacher = !!me?.roles.includes("teacher");

  useEffect(() => {
    setItems(null);
    listTuitionPosts(filters)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => setItems([]));
  }, [filters, me]);

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="container-page grid grid-cols-1 gap-6 pb-24 pt-8 sm:pt-14 [&>*]:min-w-0">
      <Reveal from="blur" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-3 text-4xl sm:text-5xl">
            <Megaphone className="size-9 text-primary" aria-hidden />
            {x.boardTitle}
          </h1>
          <p className="mt-3 text-lg text-muted">{x.boardSubtitle}</p>
        </div>
        {!isTeacher && (
          <Button asChild size="lg">
            <Link to={href("/tuition-posts/new")}>
              <PlusCircle aria-hidden />
              {x.newCta}
            </Link>
          </Button>
        )}
      </Reveal>

      <Reveal from="up">
        <div className="glass grid grid-cols-1 gap-3 rounded-[24px] p-4 sm:grid-cols-3">
          <Select label={x.filters.district} value={filters.district} onChange={(v) => set("district", v)}>
            <option value="">{x.filters.any}</option>
            {DISTRICTS.map((d) => (
              <option key={d.en} value={d.en}>
                {locale === "bn" ? d.bn : d.en}
              </option>
            ))}
          </Select>
          <Select label={x.filters.subject} value={filters.subject} onChange={(v) => set("subject", v)}>
            <option value="">{x.filters.any}</option>
            {SUBJECTS.filter((s) => s.code !== "All subjects").map((s) => (
              <option key={s.code} value={s.code}>
                {s[locale]}
              </option>
            ))}
          </Select>
          <Select label={x.filters.curriculum} value={filters.curriculum} onChange={(v) => set("curriculum", v)}>
            <option value="">{x.filters.any}</option>
            {CURRICULA.map((c) => (
              <option key={c.code} value={c.code}>
                {c[locale]}
              </option>
            ))}
          </Select>
        </div>
      </Reveal>

      {items === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="grid justify-items-center gap-4 py-12 text-center">
            <p className="text-muted">{x.empty}</p>
            {!isTeacher && (
              <Button asChild>
                <Link to={href("/tuition-posts/new")}>
                  <PlusCircle aria-hidden />
                  {x.newCta}
                </Link>
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <p className="text-muted">
            <b className="tabular text-text">{formatNumber(total, locale)}</b> {x.boardTitle}
          </p>
          <Stagger step={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <PostCard key={p.id} post={p} canAct={!me || isTeacher} />
            ))}
          </Stagger>
        </>
      )}
    </div>
  );
}
