import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatNumber } from "~/lib/format";
import { moneyErrorKey } from "~/lib/money";
import { createTuitionPost, type NewPost } from "~/lib/posts";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { GuardedText, RequirementStep, cleanRequirement, useRequirementValidator } from "~/components/posts/requirement-steps";
import { FormError } from "~/components/auth/parts";

export const meta = () => [{ title: "Post a tuition need — TSC" }, { name: "robots", content: "noindex" }];

const DRAFT_KEY = "tsc-post-draft";
const empty: NewPost = { curriculum: "bangla_version", level: "", subjects: [], mode: "offline", days: [], negotiable: true, teacher_gender: "any", preferred_institutions: [] };

export default function NewTuitionPost() {
  const { t, href, locale } = useLocale();
  const f = t.posts.form;
  const { me } = useRequireAuth();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<NewPost>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ code: string; status: string } | null>(null);

  // Restore / persist the draft so nothing is lost on reload, rotation or back.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setP({ ...empty, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, [p]);

  const noteHit = findContact(p.note ?? "");
  const validateReq = useRequirementValidator();
  const isTeacherOnly = !!me && me.roles.includes("teacher") && !me.roles.includes("student");

  function validate(s: number): string | null {
    if (s === 4) return noteHit ? f.noteBlocked : null;
    return validateReq(s, p);
  }

  function go(delta: number) {
    if (delta > 0) {
      const err = validate(step);
      if (err) return setError(err);
    }
    setError(null);
    setDir(delta);
    setStep((s) => Math.min(4, Math.max(0, s + delta)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validate(4) ?? validate(0) ?? validate(1) ?? validate(2);
    if (err) return setError(err);
    setBusy(true);
    setError(null);
    try {
      const body: NewPost = { ...cleanRequirement(p), note: p.note?.trim() || undefined };
      const r = await createTuitionPost(body);
      setResult(r);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      const k = moneyErrorKey(e as { code?: string });
      setError(k === "teachersCannot" ? f.teachersCannot : k === "limit" ? f.tooMany : t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const review = result.status === "pending_review";
    return (
      <div className="container-page grid max-w-xl place-items-center py-16">
        <Card tint={review ? "gold" : "mint"} className="w-full">
          <CardBody className="grid justify-items-center gap-4 py-10 text-center">
            <span className={cn("grid size-16 place-items-center rounded-3xl bg-[var(--chip)]", review ? "text-gold" : "text-brand")}>
              {review ? <Clock className="size-8" aria-hidden /> : <CheckCircle2 className="size-8" aria-hidden />}
            </span>
            <h1 className="text-3xl">{review ? f.review : f.done}</h1>
            <p className="text-muted">{review ? f.reviewBody : f.doneBody}</p>
            <p className="tabular rounded-full bg-text/6 px-3 py-1 text-sm font-bold">{result.code}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link to={href("/dashboard/posts")}>{t.posts.myPosts}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to={href("/teachers")}>{t.nav.findTeachers}</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page grid max-w-2xl grid-cols-1 gap-6 pb-28 pt-8 sm:pt-12 [&>*]:min-w-0">
      <div>
        <h1 className="text-3xl sm:text-4xl">{f.title}</h1>
        <p className="mt-2 text-muted">{f.subtitle}</p>
      </div>

      {isTeacherOnly && <FormError>{f.teachersCannot}</FormError>}

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs font-bold text-muted">
          <span>{f.steps[step]}</span>
          <span className="tabular">
            {formatNumber(step + 1, locale)}/{formatNumber(5, locale)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-text/8">
          <motion.div className="h-full rounded-full bg-[image:var(--grad-primary)]" animate={{ width: `${((step + 1) / 5) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      <Card>
        <CardBody className="overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="grid gap-7"
            >
              {step < 4 ? (
                <RequirementStep step={step as 0 | 1 | 2 | 3} p={p} setP={setP} />
              ) : (
                <GuardedText label={f.note} value={p.note ?? ""} onChange={(v) => setP((c) => ({ ...c, note: v }))} placeholder={f.notePh} />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6">
            <FormError>{error}</FormError>
          </div>
          <div className="mt-4 flex gap-3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => go(-1)}>
                <ArrowLeft aria-hidden />
                {f.back}
              </Button>
            )}
            {step < 4 ? (
              <Button type="button" className="flex-1" onClick={() => go(1)}>
                {f.next}
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button type="button" className="flex-1" onClick={submit} disabled={busy || !!noteHit || isTeacherOnly}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                {busy ? f.submitting : f.submit}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
