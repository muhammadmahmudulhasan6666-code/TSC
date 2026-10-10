import { CalendarCheck, Clock, CreditCard, Loader2, MessageCircle, Phone, RefreshCcw, Sparkles, ThumbsUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { GOALS, LEARNING_STYLES, SUBJECTS, TIME_SLOTS, label, levelLabel } from "~/data/education";
import { districtLabel } from "~/data/geo";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatDate, formatTaka } from "~/lib/format";
import { completeMatch, myMatches, renewMatchPayment, requestReplacement, teacherMatches, type MatchStatus, type MyMatch, type TeacherMatch } from "~/lib/match";
import { whatsappLink } from "~/lib/money";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { Avatar } from "~/components/teachers/teacher-card";

export const meta = () => [{ title: "Smart Match — TSC" }, { name: "robots", content: "noindex" }];

export const matchTone: Record<MatchStatus, string> = {
  awaiting_payment: "bg-gold-soft text-gold",
  payment_review: "bg-violet/10 text-violet",
  searching: "bg-violet/10 text-violet",
  replacement_requested: "bg-violet/10 text-violet",
  proposed: "bg-brand-soft text-brand",
  completed: "bg-brand-soft text-brand",
  unfulfilled: "bg-text/6 text-muted",
  cancelled: "bg-text/6 text-muted",
};

function PhoneRow({ phone }: { phone: string }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="tabular text-xl font-bold">{phone}</span>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="brand">
          <a href={`tel:${phone}`}>
            <Phone aria-hidden />
            {t.unlock.call}
          </a>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a href={whatsappLink(phone)} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
            {t.unlock.whatsapp}
          </a>
        </Button>
      </div>
    </div>
  );
}

function GuardianMatch({ m, reload }: { m: MyMatch; reload: () => void }) {
  const { t, href, locale } = useLocale();
  const x = t.match;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const reasonHit = findContact(reason);

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

  async function pay() {
    setBusy(true);
    try {
      const id = m.payment_status === "pending" && m.payment_request_id ? m.payment_request_id : await renewMatchPayment(m.id);
      navigate(href(`/pay/${id}`));
    } catch {
      toast.error(t.auth.genericError);
      setBusy(false);
    }
  }

  return (
    <Card tint={m.status === "proposed" ? "mint" : undefined}>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 font-bold">
            {levelLabel(m.level, locale)} · {m.subjects.map((s) => label(SUBJECTS, s, locale)).join(", ")}
          </p>
          <span className="tabular rounded-full bg-text/6 px-2.5 py-1 text-xs font-bold">{m.code}</span>
        </div>
        <span className={cn("justify-self-start rounded-full px-2.5 py-1 text-xs font-bold", matchTone[m.status])}>{x.status[m.status]}</span>

        {(m.status === "searching" || m.status === "replacement_requested" || m.status === "payment_review") && (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {x.searchingBody}
          </p>
        )}

        {m.teacher && (m.status === "proposed" || m.status === "completed") && (
          <div className="grid gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{x.yourTeacher}</p>
            <div className="flex items-center gap-4">
              <Avatar name={m.teacher.full_name ?? null} url={m.teacher.photo_url ?? null} size={56} />
              <div className="min-w-0 flex-1">
                <Link to={href(`/teachers/${m.teacher.tsc_id}`)} className="block truncate text-lg font-bold hover:underline">
                  {m.teacher.full_name?.trim() || m.teacher.tsc_id}
                </Link>
                <p className="truncate text-sm text-muted">{[m.teacher.tsc_id, m.teacher.line].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {m.teacher_phone && <PhoneRow phone={m.teacher_phone} />}
            <Button asChild size="sm" variant="secondary" className="justify-self-start">
              <Link to={href(`/trial/${m.teacher.tsc_id}`)}>
                <CalendarCheck aria-hidden />
                {t.trial.cta}
              </Link>
            </Button>
          </div>
        )}

        {m.status === "proposed" && !asking && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="brand" onClick={() => run(() => completeMatch(m.id))} disabled={busy}>
              <ThumbsUp aria-hidden />
              {x.markDone}
            </Button>
            {m.replacement_used ? (
              <p className="self-center text-sm text-muted">{x.replacementUsed}</p>
            ) : (
              <Button variant="secondary" onClick={() => setAsking(true)} disabled={busy}>
                <RefreshCcw aria-hidden />
                {x.askReplacement}
              </Button>
            )}
          </div>
        )}

        {asking && (
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-bold">
              {x.replacementReason}
              <textarea
                value={reason}
                maxLength={200}
                rows={2}
                onChange={(e) => setReason(e.target.value)}
                className={cn("w-full rounded-[14px] border bg-surface/80 p-3 text-base font-normal focus:outline-none focus:ring-4", reasonHit ? "border-danger focus:ring-danger/15" : "border-border-strong focus:border-primary focus:ring-primary/12")}
              />
            </label>
            {reasonHit && <p className="text-xs font-bold text-danger">{t.posts.form.noteBlocked}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setAsking(false)}>
                {t.posts.form.back}
              </Button>
              <Button className="flex-1" disabled={busy || !!reasonHit} onClick={() => run(() => requestReplacement(m.id, reason.trim()).then(() => setAsking(false)))}>
                {busy && <Loader2 className="animate-spin" aria-hidden />}
                {x.confirmReplacement}
              </Button>
            </div>
          </div>
        )}

        {m.status === "awaiting_payment" && (
          <Button onClick={pay} disabled={busy} className="w-full sm:w-auto sm:justify-self-start">
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
            {x.payNow}
          </Button>
        )}

        <p className="text-xs text-muted">{formatDate(m.created_at, locale, { dateStyle: "medium" })}</p>
      </CardBody>
    </Card>
  );
}

function MatchedStudent({ m }: { m: TeacherMatch }) {
  const { t, locale } = useLocale();
  const x = t.match;
  const budget = m.budget_min || m.budget_max ? [m.budget_min, m.budget_max].filter(Boolean).map((n) => formatTaka(n!, locale)).join(" – ") : null;
  const facts = [
    levelLabel(m.level, locale),
    m.subjects.map((s) => label(SUBJECTS, s, locale)).join(", "),
    m.mode === "online" ? t.posts.form.modeOnline : [m.thana, m.district && districtLabel(m.district, locale)].filter(Boolean).join(", "),
    m.time_slot && label(TIME_SLOTS, m.time_slot, locale),
    budget,
  ].filter(Boolean);
  return (
    <Card tint="violet">
      <CardBody className="grid gap-3">
        <div className="flex items-center gap-4">
          <Avatar name={m.student.full_name ?? null} url={m.student.photo_url ?? null} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{m.student.full_name?.trim() || m.student.tsc_id}</p>
            <p className="truncate text-sm text-muted">{m.student.tsc_id}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", matchTone[m.status])}>{x.status[m.status]}</span>
        </div>
        <p className="text-sm">{facts.join(" · ")}</p>
        {m.goals.length > 0 && (
          <p className="text-sm text-muted">
            <b className="text-text">{x.goalsShort}:</b> {m.goals.map((g) => label(GOALS, g, locale)).join(", ")}
            {m.learning_styles.length > 0 && ` · ${m.learning_styles.map((g) => label(LEARNING_STYLES, g, locale)).join(", ")}`}
          </p>
        )}
        {m.trial_topic && <p className="text-sm">Trial: {m.trial_topic}</p>}
        {m.note && <p className="rounded-2xl bg-surface/70 p-3 text-sm">“{m.note}”</p>}
        {m.phone && <PhoneRow phone={m.phone} />}
      </CardBody>
    </Card>
  );
}

export default function MyMatches() {
  const { t, href } = useLocale();
  const x = t.match;
  const { me } = useRequireAuth();
  const isTeacher = !!me?.roles.includes("teacher");
  const [mine, setMine] = useState<MyMatch[] | null>(null);
  const [assigned, setAssigned] = useState<TeacherMatch[]>([]);

  const load = useCallback(() => {
    myMatches().then(setMine).catch(() => setMine([]));
    if (isTeacher) teacherMatches().then(setAssigned).catch(() => {});
  }, [isTeacher]);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  return (
    <div className="container-page grid max-w-3xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      {assigned.length > 0 && (
        <>
          <Reveal from="blur">
            <h1 className="text-3xl sm:text-4xl">{x.teacherTitle}</h1>
          </Reveal>
          <Stagger step={0.06} className="grid grid-cols-1 gap-4">
            {assigned.map((m) => (
              <MatchedStudent key={m.id} m={m} />
            ))}
          </Stagger>
        </>
      )}

      {(!isTeacher || (mine && mine.length > 0)) && (
        <Reveal from="blur">
          <h1 className={cn("text-3xl sm:text-4xl", assigned.length > 0 && "mt-6")}>{x.myTitle}</h1>
        </Reveal>
      )}

      {mine === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : mine.length === 0 ? (
        !isTeacher && (
          <Card>
            <CardBody className="grid justify-items-center gap-4 py-10 text-center">
              <p className="text-muted">{x.myEmpty}</p>
              <Button asChild>
                <Link to={href("/smart-match")}>
                  <Sparkles aria-hidden />
                  {x.cta}
                </Link>
              </Button>
            </CardBody>
          </Card>
        )
      ) : (
        <Stagger step={0.06} className="grid grid-cols-1 gap-4">
          {mine.map((m) => (
            <GuardianMatch key={m.id} m={m} reload={load} />
          ))}
        </Stagger>
      )}
    </div>
  );
}
