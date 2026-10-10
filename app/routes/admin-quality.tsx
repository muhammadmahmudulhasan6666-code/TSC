import { Check, Loader2, ShieldAlert, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { isAdminRole, useRequireAuth } from "~/lib/auth";
import { formatDate } from "~/lib/format";
import type { PersonCard } from "~/lib/money";
import {
  adminListOutcomes,
  adminListReviews,
  adminListTrials,
  adminResolveOutcome,
  adminResolveTrial,
  adminReviewReview,
  type AdminOutcome,
  type AdminReview,
  type AdminTrial,
} from "~/lib/trials";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "Reviews & trials — TSC Admin" }, { name: "robots", content: "noindex" }];

type Tab = "reviews" | "trials" | "outcomes";
const who = (p: PersonCard) => `${p.full_name?.trim() || p.tsc_id} (${p.tsc_id})`;

export default function AdminQuality() {
  const { t, locale } = useLocale();
  const x = t.quality;
  const { me, ready } = useRequireAuth();
  const isAdmin = isAdminRole(me);
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [trials, setTrials] = useState<AdminTrial[] | null>(null);
  const [outcomes, setOutcomes] = useState<AdminOutcome[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (tab === "reviews") adminListReviews("pending").then((r) => setReviews(r ?? [])).catch(() => setReviews([]));
    if (tab === "trials") adminListTrials("disputed").then((r) => setTrials(r ?? [])).catch(() => setTrials([]));
    if (tab === "outcomes") adminListOutcomes("disputed").then((r) => setOutcomes(r ?? [])).catch(() => setOutcomes([]));
  }, [tab]);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
      toast.success(t.adminPay.done);
      load();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }
  const reason = () => window.prompt(x.reason)?.trim() || undefined;

  if (ready && me && !isAdmin) {
    return (
      <div className="container-page grid min-h-[50svh] place-items-center text-center text-muted">
        <ShieldAlert className="size-10" aria-hidden />
      </div>
    );
  }

  const list = tab === "reviews" ? reviews : tab === "trials" ? trials : outcomes;
  const answerLabel = (a: string | null) =>
    a == null ? "—" : ({ happened: t.trial.happened, no_show: t.trial.noShow, problem: t.trial.problem, matched: t.outcome.matched, talking: t.outcome.talking, not_matched: t.outcome.notMatched } as Record<string, string>)[a] ?? a;

  return (
    <div className="container-page grid grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.title}</h1>
      </Reveal>
      <div className="-mx-4 overflow-x-auto px-4" role="tablist">
        <div className="flex w-max gap-2">
          {(Object.keys(x.tabs) as Tab[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("h-10 rounded-full px-4 text-sm font-bold", tab === k ? "bg-[image:var(--grad-primary)] text-white shadow-[var(--glow-primary)]" : "glass text-muted hover:text-text")}
            >
              {x.tabs[k]}
            </button>
          ))}
        </div>
      </div>

      {list === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-muted">{x.empty}</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {tab === "reviews" &&
            reviews!.map((r) => (
              <Card key={r.id} className="min-w-0">
                <CardBody className="grid gap-3">
                  <p className="text-sm text-muted">
                    {who(r.reviewer)} → <b className="text-text">{who(r.teacher)}</b>
                  </p>
                  <p className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={cn("size-5", n <= r.rating ? "fill-gold text-gold" : "text-border-strong")} aria-hidden />
                    ))}
                    {r.trial_status === "completed" && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{t.review.afterTrial}</span>}
                  </p>
                  {r.tags.length > 0 && <p className="text-sm">{r.tags.map((c) => t.review.tags.find((g) => g.code === c)?.[locale] ?? c).join(" · ")}</p>}
                  {r.comment && <p className="rounded-2xl bg-surface/70 p-3 [overflow-wrap:anywhere]">“{r.comment}”</p>}
                  <p className="text-xs text-muted">{formatDate(r.created_at, locale, { dateStyle: "medium", timeStyle: "short" })}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={busy === r.id} onClick={() => act(r.id, () => adminReviewReview(r.id, true))}>
                      <Check aria-hidden />
                      {x.approve}
                    </Button>
                    <Button variant="secondary" disabled={busy === r.id} onClick={() => act(r.id, () => adminReviewReview(r.id, false, reason()))}>
                      <X aria-hidden />
                      {x.reject}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}

          {tab === "trials" &&
            trials!.map((b) => (
              <Card key={b.id} className="min-w-0">
                <CardBody className="grid gap-3">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-muted">
                      {who(b.student)} ↔ <b className="text-text">{who(b.teacher)}</b>
                    </p>
                    <span className="tabular shrink-0 rounded-full bg-text/6 px-2.5 py-1 text-xs font-bold">{b.code}</span>
                  </div>
                  <p className="text-sm">
                    {b.subject} · {formatDate(b.scheduled_at, locale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="rounded-xl bg-surface/70 p-2.5">
                      <span className="block text-xs text-muted">{x.studentSays}</span>
                      {answerLabel(b.student_says)}
                    </p>
                    <p className="rounded-xl bg-surface/70 p-2.5">
                      <span className="block text-xs text-muted">{x.teacherSays}</span>
                      {answerLabel(b.teacher_says)}
                    </p>
                  </div>
                  {b.problem_note && <p className="rounded-2xl bg-gold-soft p-3 text-sm text-gold [overflow-wrap:anywhere]">“{b.problem_note}”</p>}
                  <div className="grid grid-cols-3 gap-2">
                    {(["completed", "no_show", "cancelled"] as const).map((s) => (
                      <Button key={s} size="sm" variant={s === "completed" ? "primary" : "secondary"} disabled={busy === b.id} onClick={() => act(b.id, () => adminResolveTrial(b.id, s, reason()))}>
                        {s === "completed" ? x.markCompleted : s === "no_show" ? x.markNoShow : x.markCancelled}
                      </Button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}

          {tab === "outcomes" &&
            outcomes!.map((o) => (
              <Card key={o.id} className="min-w-0">
                <CardBody className="grid gap-3">
                  <p className="text-sm text-muted">
                    {who(o.student)} ↔ <b className="text-text">{who(o.teacher)}</b>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="rounded-xl bg-surface/70 p-2.5">
                      <span className="block text-xs text-muted">{x.studentSays}</span>
                      {answerLabel(o.student_answer)}
                    </p>
                    <p className="rounded-xl bg-surface/70 p-2.5">
                      <span className="block text-xs text-muted">{x.teacherSays}</span>
                      {answerLabel(o.teacher_answer)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" disabled={busy === o.id} onClick={() => act(o.id, () => adminResolveOutcome(o.id, "matched", reason()))}>
                      {x.matched}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => act(o.id, () => adminResolveOutcome(o.id, "not_matched", reason()))}>
                      {x.notMatched}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
