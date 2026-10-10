import { motion } from "motion/react";
import { CheckCircle2, Loader2, Send, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useLocale } from "~/i18n";
import { getPublicTeacher, type TeacherProfile } from "~/lib/api";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { myReviewFor, submitReview, type NewReview } from "~/lib/trials";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Chips } from "~/components/ui/chips";
import { FormError } from "~/components/auth/parts";
import { Field, GuardedText, useOptions } from "~/components/posts/requirement-steps";
import { Avatar } from "~/components/teachers/teacher-card";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "Review — TSC" }, { name: "robots", content: "noindex" }];

export function StarInput({ value, onChange, size = 36, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= (hover || value);
        return (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}`}
            whileTap={{ scale: 0.8 }}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="grid min-h-11 min-w-11 place-items-center rounded-xl"
          >
            <Star style={{ width: size, height: size }} className={cn("transition-colors", on ? "fill-gold text-gold" : "text-border-strong")} aria-hidden />
          </motion.button>
        );
      })}
    </div>
  );
}

export default function NewReviewPage() {
  const { t, href } = useLocale();
  const x = t.review;
  const { me } = useRequireAuth();
  const L = useOptions();
  const { tscId = "" } = useParams();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [r, setR] = useState<NewReview>({ rating: 0, tags: [] });
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getPublicTeacher(tscId).then(setTeacher);
  }, [tscId]);
  useEffect(() => {
    if (!me) return;
    myReviewFor(tscId)
      .then((res) => {
        setEligible(!!res?.eligible);
        if (res?.review) {
          const { status: st, ...rest } = res.review;
          setR({ ...rest, tags: rest.tags ?? [] });
          setStatus(st);
        }
      })
      .catch(() => setEligible(false));
  }, [me, tscId]);

  const set = <K extends keyof NewReview>(k: K, v: NewReview[K]) => setR((c) => ({ ...c, [k]: v }));
  const hit = findContact(r.comment ?? "");

  async function submit() {
    if (!r.rating) return setError(x.overall);
    setBusy(true);
    setError(null);
    try {
      await submitReview(tscId, { ...r, comment: r.comment?.trim() || undefined });
      setDone(true);
    } catch (e) {
      setError((e as { code?: string }).code === "TS403" ? x.notEligible : t.auth.genericError);
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

  if (done) {
    return (
      <div className="container-page grid max-w-xl place-items-center py-16">
        <Card tint="gold" className="w-full">
          <CardBody className="grid justify-items-center gap-4 py-10 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-[var(--chip)] text-gold">
              <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h1 className="text-3xl">{x.done}</h1>
            <p className="text-muted">{x.doneBody}</p>
            <Button asChild variant="secondary">
              <Link to={href(`/teachers/${tscId}`)}>{teacher.full_name?.trim() || tscId}</Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page grid max-w-2xl grid-cols-1 gap-5 pb-28 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{status ? x.edit : x.title}</h1>
        <p className="mt-2 text-muted">{x.subtitle}</p>
      </Reveal>
      <Card>
        <CardBody className="grid gap-7">
          <div className="flex items-center gap-4">
            <Avatar name={teacher.full_name} url={teacher.photo_url} size={56} />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{teacher.full_name?.trim() || teacher.tsc_id}</p>
              <p className="truncate text-sm text-muted">{teacher.tsc_id}</p>
            </div>
          </div>
          {status === "pending" && <p className="rounded-2xl bg-violet/10 p-3 text-sm text-violet">{x.pending}</p>}
          {!eligible ? (
            <p className="rounded-2xl bg-gold-soft p-4 text-gold">{x.notEligible}</p>
          ) : (
            <>
              <Field label={x.overall}>
                <StarInput value={r.rating} onChange={(n) => set("rating", n)} label={x.overall} />
              </Field>
              <div className="grid gap-4">
                {(["teaching", "communication", "punctuality"] as const).map((k) => (
                  <Field key={k} label={x[k]}>
                    <StarInput value={r[k] ?? 0} onChange={(n) => set(k, n)} size={22} label={x[k]} />
                  </Field>
                ))}
              </div>
              <Field label={x.tagsLabel}>
                <Chips multi max={4} options={L(x.tags)} value={r.tags} onChange={(v) => set("tags", v)} />
              </Field>
              <GuardedText label={x.comment} value={r.comment ?? ""} onChange={(v) => set("comment", v)} placeholder={x.commentPh} max={300} />
              <FormError>{error}</FormError>
              <Button size="lg" onClick={submit} disabled={busy || !r.rating || !!hit}>
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
