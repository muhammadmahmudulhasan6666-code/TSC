import { CalendarCheck, CheckCircle2, KeyRound, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useLocale } from "~/i18n";
import { getPublicTeacher, type TeacherProfile } from "~/lib/api";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatNumber } from "~/lib/format";
import { myReviewFor, requestTrial, trialErrorKey } from "~/lib/trials";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Chips } from "~/components/ui/chips";
import { FormError } from "~/components/auth/parts";
import { Field, GuardedText } from "~/components/posts/requirement-steps";
import { Avatar } from "~/components/teachers/teacher-card";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "Trial class — TSC" }, { name: "robots", content: "noindex" }];

const TZ = "Asia/Dhaka";
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

/** The next 14 calendar days in Dhaka time, as YYYY-MM-DD. */
function nextDays(n = 14) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() + i * 86_400_000)));
}

export default function NewTrial() {
  const { t, href, locale } = useLocale();
  const x = t.trial;
  const { me } = useRequireAuth();
  const { tscId = "" } = useParams();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [subject, setSubject] = useState<string>();
  const [mode, setMode] = useState<"online" | "offline">();
  const [day, setDay] = useState<string>();
  const [hour, setHour] = useState<string>();
  const [duration, setDuration] = useState("60");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPublicTeacher(tscId).then((p) => {
      setTeacher(p);
      if (p?.mode === "online" || p?.mode === "offline") setMode(p.mode);
      if (p?.subjects.length === 1) setSubject(p.subjects[0]);
    });
  }, [tscId]);
  useEffect(() => {
    if (me) myReviewFor(tscId).then((r) => setEligible(!!r?.eligible)).catch(() => setEligible(false));
  }, [me, tscId]);

  const days = useMemo(() => nextDays(), []);
  const dayLabel = (d: string) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00+06:00`));
  const hourLabel = (h: number) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(`2026-01-01T${String(h).padStart(2, "0")}:00:00+06:00`));
  // Hide start times that are less than 2 hours away (server enforces the same).
  const hours = HOURS.filter((h) => !day || new Date(`${day}T${String(h).padStart(2, "0")}:00:00+06:00`).getTime() > Date.now() + 2 * 3_600_000);
  const hit = findContact(topic) ?? findContact(note);

  async function submit() {
    if (!subject || !mode || !day || !hour) return setError(locale === "bn" ? "Subject, ধরন, দিন আর সময় বাছুন।" : "Pick a subject, mode, day and time.");
    setBusy(true);
    setError(null);
    try {
      await requestTrial(tscId, {
        subject,
        mode,
        scheduled_at: `${day}T${hour.padStart(2, "0")}:00:00+06:00`,
        duration_min: Number(duration),
        topic: topic.trim() || undefined,
        note: note.trim() || undefined,
      });
      setDone(true);
    } catch (e) {
      const k = trialErrorKey(e as { code?: string });
      setError(k && k in x ? (x[k as keyof typeof x] as string) : t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (!teacher || eligible === null) {
    return (
      <div className="grid min-h-[60svh] place-items-center text-primary">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  const name = teacher.full_name?.trim() || teacher.tsc_id;
  const header = (
    <div className="flex items-center gap-4">
      <Avatar name={teacher.full_name} url={teacher.photo_url} size={56} />
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{name}</p>
        <p className="truncate text-sm text-muted">{[teacher.tsc_id, teacher.institution ?? teacher.university_name].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="container-page grid max-w-xl place-items-center py-16">
        <Card tint="mint" className="w-full">
          <CardBody className="grid justify-items-center gap-4 py-10 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-[var(--chip)] text-brand">
              <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h1 className="text-3xl">{x.sent}</h1>
            <p className="text-muted">{x.sentBody}</p>
            <Button asChild>
              <Link to={href("/dashboard/trials")}>{x.myTitle}</Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page grid max-w-2xl grid-cols-1 gap-5 pb-28 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="flex items-center gap-3 text-3xl sm:text-4xl">
          <CalendarCheck className="size-8 text-primary" aria-hidden />
          {x.title}
        </h1>
        <p className="mt-2 text-muted">{x.subtitle}</p>
      </Reveal>

      <Card>
        <CardBody className="grid gap-7">
          {header}
          {!eligible ? (
            <div className="grid gap-4">
              <p className="rounded-2xl bg-gold-soft p-4 text-gold">{x.needConnection}</p>
              <Button asChild className="justify-self-start">
                <Link to={href(`/teachers/${teacher.tsc_id}`)}>
                  <KeyRound aria-hidden />
                  {t.unlock.cta}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Field label={x.subject}>
                <Chips options={teacher.subjects.map((s) => ({ code: s, label: s }))} value={subject} onChange={setSubject} />
              </Field>
              <Field label={x.mode}>
                <Chips
                  options={[
                    ...(teacher.mode !== "offline" ? [{ code: "online", label: x.online }] : []),
                    ...(teacher.mode !== "online" ? [{ code: "offline", label: x.offline }] : []),
                  ]}
                  value={mode}
                  onChange={setMode}
                />
              </Field>
              <Field label={x.day}>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  <Chips options={days.map((d) => ({ code: d, label: dayLabel(d) }))} value={day} onChange={(v) => (setDay(v), setHour(undefined))} columns="flex-nowrap [&>button]:shrink-0" />
                </div>
              </Field>
              {day && (
                <Field label={x.time}>
                  <Chips options={hours.map((h) => ({ code: String(h), label: hourLabel(h) }))} value={hour} onChange={setHour} />
                </Field>
              )}
              <Field label={x.duration}>
                <Chips options={["30", "45", "60", "90"].map((m) => ({ code: m, label: `${formatNumber(Number(m), locale)} ${x.minutes}` }))} value={duration} onChange={(v) => setDuration(v ?? "60")} />
              </Field>
              <GuardedText label={x.topic} value={topic} onChange={setTopic} placeholder={x.topicPh} max={100} rows={1} />
              <GuardedText label={x.note} value={note} onChange={setNote} placeholder={x.notePh} />
              <FormError>{error}</FormError>
              <Button size="lg" onClick={submit} disabled={busy || !!hit}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                {busy ? x.sending : x.submit}
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
