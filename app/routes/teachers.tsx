import { Loader2, Search, SlidersHorizontal, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/teachers";
import { useLocale } from "~/i18n";
import { getTeacherFilters, searchTeachers, type TeacherCard as TCard, type TeacherFilters, type TeacherQuery } from "~/lib/api";
import { formatNumber } from "~/lib/format";
import { pageMeta } from "~/lib/seo";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { TeacherCard } from "~/components/teachers/teacher-card";

const PAGE = 18;

export async function loader() {
  const [filters, first] = await Promise.all([getTeacherFilters(), searchTeachers({ limit: PAGE })]);
  return { filters, first };
}

export const meta: Route.MetaFunction = ({ location }) =>
  pageMeta({
    path: location.pathname,
    bn: { title: "Verified Teacher খুঁজুন — CUET, BUET, DU | TSC", description: "NID ও University ID-তে যাচাই করা teacher খুঁজুন — Physics, Math, Chemistry, English সহ সব subject। এলাকা, budget আর Trust Score মিলিয়ে নিন।" },
    en: { title: "Find verified teachers — CUET, BUET, DU | TSC", description: "Search teachers verified with national and university ID — Physics, Maths, Chemistry, English and more. Match on area, budget and Trust Score." },
  });

const KEYS = ["q", "subject", "district", "institution", "mode", "gender", "sort"] as const;

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-[12px] border border-border-strong bg-surface/80 px-3 text-base text-text focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
      >
        {children}
      </select>
    </label>
  );
}

export default function Teachers({ loaderData }: Route.ComponentProps) {
  const { t, href, locale } = useLocale();
  const x = t.teachers;
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<TeacherFilters>(loaderData.filters);
  const [items, setItems] = useState<TCard[]>(loaderData.first.items);
  const [total, setTotal] = useState(loaderData.first.total);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const reqId = useRef(0);

  const query = useMemo<TeacherQuery>(
    () => ({
      q: params.get("q") ?? undefined,
      subject: params.get("subject") ?? undefined,
      district: params.get("district") ?? undefined,
      institution: params.get("institution") ?? undefined,
      mode: params.get("mode") ?? undefined,
      gender: params.get("gender") ?? undefined,
      sort: (params.get("sort") as TeacherQuery["sort"]) ?? "recommended",
    }),
    [params],
  );
  const activeCount = KEYS.filter((k) => k !== "sort" && k !== "q" && params.get(k)).length;

  useEffect(() => {
    getTeacherFilters().then(setFilters).catch(() => {});
  }, []);

  // Re-query whenever the URL filters change; ignore out-of-order responses.
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    searchTeachers({ ...query, limit: PAGE })
      .then((r) => {
        if (id !== reqId.current) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .finally(() => id === reqId.current && setLoading(false));
  }, [query]);

  // Debounced free-text search.
  useEffect(() => {
    const h = setTimeout(() => {
      if ((params.get("q") ?? "") !== q.trim()) update("q", q.trim());
    }, 350);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function update(key: (typeof KEYS)[number], value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function clearAll() {
    setQ("");
    setParams(new URLSearchParams(), { replace: true, preventScrollReset: true });
  }

  async function loadMore() {
    setLoading(true);
    const r = await searchTeachers({ ...query, limit: PAGE, offset: items.length }).finally(() => setLoading(false));
    setItems((cur) => [...cur, ...r.items]);
  }

  const instName = (code: string) => {
    const i = filters.institutions.find((v) => v.code === code);
    return i ? `${code} — ${locale === "bn" ? i.name_bn : i.name_en}` : code;
  };

  return (
    <div className="container-page pb-24 pt-8 sm:pt-14">
      <Reveal from="blur" className="max-w-3xl">
        <h1 className="text-4xl sm:text-5xl">{x.title}</h1>
        <p className="mt-3 text-lg text-muted">{x.subtitle}</p>
      </Reveal>

      {/* Search + filters */}
      <Reveal from="up" delay={0.05}>
        <div className="glass glass-strong sticky top-[84px] z-30 mt-8 rounded-[24px] p-3 shadow-[var(--shadow-lift)] sm:p-4">
          <div className="relative flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={x.searchPlaceholder}
                aria-label={x.searchPlaceholder}
                className="h-12 w-full rounded-full border border-border-strong bg-surface/80 pl-12 pr-4 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
              />
            </div>
            <Button type="button" variant="secondary" className="h-12 shrink-0 px-4 lg:hidden" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal aria-hidden />
              <span className="hidden sm:inline">{x.filters}</span>
              {activeCount > 0 && <span className="tabular grid size-5 place-items-center rounded-full bg-primary text-xs text-white">{formatNumber(activeCount, locale)}</span>}
            </Button>
          </div>

          <div className={cn("mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-4 lg:grid lg:grid-cols-6", showFilters ? "grid" : "hidden lg:grid")}>
            <Select label={x.subject} value={params.get("subject") ?? ""} onChange={(v) => update("subject", v)}>
              <option value="">{x.any}</option>
              {filters.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label={x.district} value={params.get("district") ?? ""} onChange={(v) => update("district", v)}>
              <option value="">{x.any}</option>
              {filters.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select label={x.institution} value={params.get("institution") ?? ""} onChange={(v) => update("institution", v)}>
              <option value="">{x.any}</option>
              {filters.institutions.map((i) => (
                <option key={i.code} value={i.code}>
                  {instName(i.code)}
                </option>
              ))}
            </Select>
            <Select label={x.mode} value={params.get("mode") ?? ""} onChange={(v) => update("mode", v)}>
              <option value="">{x.any}</option>
              <option value="online">{x.modeOnline}</option>
              <option value="offline">{x.modeOffline}</option>
            </Select>
            <Select label={x.gender} value={params.get("gender") ?? ""} onChange={(v) => update("gender", v)}>
              <option value="">{x.any}</option>
              <option value="male">{x.male}</option>
              <option value="female">{x.female}</option>
            </Select>
            <Select label={x.sort} value={params.get("sort") ?? "recommended"} onChange={(v) => update("sort", v === "recommended" ? "" : v)}>
              <option value="recommended">{x.sortRecommended}</option>
              <option value="rating">{x.sortRating}</option>
              <option value="price">{x.sortPrice}</option>
              <option value="newest">{x.sortNewest}</option>
            </Select>
          </div>
        </div>
      </Reveal>

      {/* Result bar */}
      <div className="mt-6 flex min-h-9 items-center justify-between gap-3" aria-live="polite">
        <p className="text-muted">
          <b className="tabular text-text">{formatNumber(total, locale)}</b> {x.results}
          {loading && <Loader2 className="ml-2 inline size-4 animate-spin text-primary" aria-hidden />}
        </p>
        {(activeCount > 0 || params.get("q")) && (
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/8">
            <X className="size-4" aria-hidden />
            {x.clear}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <>
          <Stagger step={0.05} from="up" className={cn("mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity", loading && "opacity-60")}>
            {items.map((teacher) => (
              <TeacherCard key={teacher.tsc_id} teacher={teacher} />
            ))}
          </Stagger>
          {items.length < total && (
            <div className="mt-10 flex justify-center">
              <Button variant="secondary" size="lg" onClick={loadMore} disabled={loading}>
                {loading && <Loader2 className="animate-spin" aria-hidden />}
                {x.loadMore}
              </Button>
            </div>
          )}
        </>
      ) : (
        !loading && (
          <div className="glass mx-auto mt-10 max-w-lg rounded-[28px] p-8 text-center">
            <h2 className="text-2xl">{x.emptyTitle}</h2>
            <p className="mt-2 text-muted">{x.emptyBody}</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="secondary" onClick={clearAll}>
                {x.clear}
              </Button>
              <Button asChild>
                <Link to={href("/smart-match")}>
                  <Zap aria-hidden />
                  {t.profile.smartMatch}
                </Link>
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
