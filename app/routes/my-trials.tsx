import { CalendarClock, Check, Loader2, MonitorSmartphone, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatDate, formatNumber } from "~/lib/format";
import { cancelTrial, confirmTrial, myTrials, respondTrial, type Trial, type TrialAnswer, type TrialStatus } from "~/lib/trials";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { Avatar } from "~/components/teachers/teacher-card";

export const meta = () => [{ title: "Trial classes — TSC" }, { name: "robots", content: "noindex" }];

export const trialTone: Record<TrialStatus, string> = {
  requested: "bg-violet/10 text-violet",
  accepted: "bg-brand-soft text-brand",
  awaiting_confirmation: "bg-gold-soft text-gold",
  completed: "bg-brand-soft text-brand",
  disputed: "bg-gold-soft text-gold",
  rejected: "bg-text/6 text-muted",
  cancelled: "bg-text/6 text-muted",
  expired: "bg-text/6 text-muted",
  no_show: "bg-text/6 text-muted",
};

function TrialCard({ b, reload }: { b: Trial; reload: () => void }) {
  const { t, href, locale } = useLocale();
  const x = t.trial;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const upcoming = new Date(b.scheduled_at).getTime() > Date.now();

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      reload();
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }
  const answer = (a: TrialAnswer, note?: string) => run(() => confirmTrial(b.id, a, note));

  return (
    <Card tint={b.status === "accepted" ? "mint" : b.status === "awaiting_confirmation" && !b.my_answer ? "gold" : undefined}>
      <CardBody className="grid gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={b.person.full_name ?? null} url={b.person.photo_url ?? null} size={52} />
          <div className="min-w-0 flex-1">
            {b.person.kind === "teacher" ? (
              <Link to={href(`/teachers/${b.person.tsc_id}`)} className="block truncate text-lg font-bold hover:underline">
                {b.person.full_name?.trim() || b.person.tsc_id}
              </Link>
            ) : (
              <p className="truncate text-lg font-bold">{b.person.full_name?.trim() || b.person.tsc_id}</p>
            )}
            <p className="truncate text-sm text-muted">
              {b.my_role === "student" ? x.withTeacher : x.withStudent} · {b.person.tsc_id}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", trialTone[b.status])}>{x.status[b.status]}</span>
        </div>

        <div className="grid gap-1.5 rounded-2xl bg-surface/70 p-3 text-sm">
          <p className="flex items-center gap-2 font-bold">
            <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
            {formatDate(b.scheduled_at, locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {formatNumber(b.duration_min, locale)} {x.minutes}
          </p>
          <p className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 shrink-0 text-muted" aria-hidden />
            {b.subject} · {b.mode === "online" ? x.online : x.offline}
            {b.topic && ` · ${b.topic}`}
          </p>
          {b.note && <p className="text-muted">“{b.note}”</p>}
          {b.reject_reason && <p className="text-muted">{b.reject_reason}</p>}
        </div>

        {b.my_role === "teacher" && b.status === "requested" && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="brand" disabled={busy} onClick={() => run(() => respondTrial(b.id, true))}>
              <Check aria-hidden />
              {x.accept}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const r = window.prompt(x.rejectReason);
                if (r !== null) run(() => respondTrial(b.id, false, r.trim()));
              }}
            >
              <X aria-hidden />
              {x.reject}
            </Button>
          </div>
        )}

        {upcoming && (b.status === "accepted" || (b.status === "requested" && b.my_role === "student")) && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            disabled={busy}
            onClick={() => {
              const r = window.prompt(x.rejectReason);
              if (r !== null) run(() => cancelTrial(b.id, r.trim()));
            }}
          >
            {x.cancel}
          </Button>
        )}

        {b.status === "awaiting_confirmation" &&
          (b.my_answer ? (
            <p className="text-sm text-muted">{x.answered}</p>
          ) : problem === null ? (
            <div className="grid gap-2">
              <p className="font-bold">{x.askHappened}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="brand" disabled={busy} onClick={() => answer("happened")}>
                  {x.happened}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => answer("no_show")}>
                  {x.noShow}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setProblem("")}>
                  {x.problem}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder={x.problemPh}
                className={cn("w-full rounded-[14px] border bg-surface/80 p-3 text-base focus:outline-none focus:ring-4", findContact(problem) ? "border-danger" : "border-border-strong focus:border-primary focus:ring-primary/12")}
              />
              {findContact(problem) && <p className="text-xs font-bold text-danger">{t.posts.form.noteBlocked}</p>}
              <Button disabled={busy || !problem.trim() || !!findContact(problem)} onClick={() => answer("problem", problem.trim())}>
                {x.problem}
              </Button>
            </div>
          ))}

        {b.status === "completed" && b.my_role === "student" && b.person.tsc_id && (
          <Button asChild variant={b.reviewed ? "secondary" : "primary"} className="justify-self-start">
            <Link to={href(`/review/${b.person.tsc_id}`)}>
              <Star aria-hidden />
              {b.reviewed ? x.reviewed : x.writeReview}
            </Link>
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

export default function MyTrials() {
  const { t } = useLocale();
  const x = t.trial;
  const { me } = useRequireAuth();
  const [items, setItems] = useState<Trial[] | null>(null);
  const load = useCallback(() => myTrials().then(setItems).catch(() => setItems([])), []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  return (
    <div className="container-page grid max-w-3xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.myTitle}</h1>
        <p className="mt-2 text-muted">{x.subtitle}</p>
      </Reveal>
      {items === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-muted">{x.empty}</CardBody>
        </Card>
      ) : (
        <Stagger step={0.06} className="grid grid-cols-1 gap-4">
          {items.map((b) => (
            <TrialCard key={b.id} b={b} reload={load} />
          ))}
        </Stagger>
      )}
    </div>
  );
}
