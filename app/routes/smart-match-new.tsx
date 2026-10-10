import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLocale } from "~/i18n";
import { GOALS, LEARNING_STYLES, SUBJECTS, TEACHER_QUALITIES, label, levelLabel } from "~/data/education";
import { districtLabel } from "~/data/geo";
import { getPrices } from "~/lib/api";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatNumber, formatTaka } from "~/lib/format";
import { createSmartMatch, myVoucher, type NewMatch } from "~/lib/match";
import { moneyErrorKey } from "~/lib/money";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Chips } from "~/components/ui/chips";
import { FormError } from "~/components/auth/parts";
import { Field, GuardedText, RequirementStep, cleanRequirement, useOptions, useRequirementValidator } from "~/components/posts/requirement-steps";

export const meta = () => [{ title: "Smart Match — TSC" }, { name: "robots", content: "noindex" }];

const DRAFT_KEY = "tsc-match-draft";
const LAST = 5;
const empty: NewMatch = {
  curriculum: "bangla_version",
  level: "",
  subjects: [],
  mode: "offline",
  days: [],
  negotiable: true,
  teacher_gender: "any",
  preferred_institutions: [],
  goals: [],
  learning_styles: [],
  teacher_qualities: [],
};

export default function NewSmartMatch() {
  const { t, href, locale } = useLocale();
  const x = t.match;
  const f = t.posts.form;
  const { me } = useRequireAuth();
  const navigate = useNavigate();
  const L = useOptions();
  const validateReq = useRequirementValidator();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<NewMatch>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(250);
  const [voucher, setVoucher] = useState<{ id: string; amount_bdt: number } | null>(null);
  const [useV, setUseV] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setP({ ...empty, ...JSON.parse(saved) });
    } catch {
      /* ignore */
    }
    getPrices()
      .then((r) => r.smart_match && setPrice(r.smart_match.price_bdt))
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, [p]);
  useEffect(() => {
    if (me) myVoucher(me.userId).then(setVoucher).catch(() => {});
  }, [me]);

  const isTeacherOnly = !!me && me.roles.includes("teacher") && !me.roles.includes("student");
  const textHit = findContact(p.note ?? "") ?? findContact(p.trial_topic ?? "");
  const set = <K extends keyof NewMatch>(k: K, v: NewMatch[K]) => setP((c) => ({ ...c, [k]: v }));

  function validate(s: number): string | null {
    if (s < 4) return validateReq(s, p);
    if (s === LAST && textHit) return f.noteBlocked;
    return null;
  }

  function go(delta: number) {
    if (delta > 0) {
      const err = validate(step);
      if (err) return setError(err);
    }
    setError(null);
    setDir(delta);
    setStep((s) => Math.min(LAST, Math.max(0, s + delta)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = [LAST, 0, 1, 2].map(validate).find(Boolean);
    if (err) return setError(err);
    setBusy(true);
    setError(null);
    try {
      const body: NewMatch = { ...cleanRequirement(p), note: p.note?.trim() || undefined, trial_topic: p.trial_topic?.trim() || undefined };
      const r = await createSmartMatch(body, useV && voucher ? voucher.id : null);
      localStorage.removeItem(DRAFT_KEY);
      navigate(href(`/pay/${r.payment_request_id}`));
    } catch (e) {
      const k = moneyErrorKey(e as { code?: string });
      setError(k === "teachersCannot" ? x.teachersCannot : k === "errInvalidTrx" ? f.noteBlocked : t.auth.genericError);
      setBusy(false);
    }
  }

  const discount = useV && voucher ? Math.min(voucher.amount_bdt, price) : 0;
  const summary: [string, string][] = [
    [x.levelShort, levelLabel(p.level, locale)],
    [x.subjectsShort, p.subjects.map((s) => label(SUBJECTS, s, locale)).join(", ")],
    [x.areaShort, p.mode === "online" ? f.modeOnline : p.district ? districtLabel(p.district, locale) : "—"],
    [x.goalsShort, p.goals.map((g) => label(GOALS, g, locale)).join(", ") || "—"],
  ];

  return (
    <div className="container-page grid max-w-2xl grid-cols-1 gap-6 pb-28 pt-8 sm:pt-12 [&>*]:min-w-0">
      <div>
        <h1 className="text-3xl sm:text-4xl">{x.wizardTitle}</h1>
        <p className="mt-2 text-muted">{x.wizardSubtitle}</p>
      </div>

      {isTeacherOnly && <FormError>{x.teachersCannot}</FormError>}

      <div>
        <div className="flex justify-between text-xs font-bold text-muted">
          <span>{x.steps[step]}</span>
          <span className="tabular">
            {formatNumber(step + 1, locale)}/{formatNumber(LAST + 1, locale)}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-text/8">
          <motion.div className="h-full rounded-full bg-[image:var(--grad-primary)]" animate={{ width: `${((step + 1) / (LAST + 1)) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      <Card>
        <CardBody className="overflow-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="grid gap-7"
            >
              {step < 4 && <RequirementStep step={step as 0 | 1 | 2 | 3} p={p} setP={setP} />}

              {step === 4 && (
                <>
                  <Field label={x.goals}>
                    <Chips multi max={3} options={L(GOALS)} value={p.goals} onChange={(v) => set("goals", v)} />
                  </Field>
                  <Field label={x.styles}>
                    <Chips multi max={2} options={L(LEARNING_STYLES)} value={p.learning_styles} onChange={(v) => set("learning_styles", v)} />
                  </Field>
                  <Field label={x.qualities}>
                    <Chips multi max={3} options={L(TEACHER_QUALITIES)} value={p.teacher_qualities} onChange={(v) => set("teacher_qualities", v)} />
                  </Field>
                </>
              )}

              {step === LAST && (
                <>
                  <GuardedText label={x.trialTopic} value={p.trial_topic ?? ""} onChange={(v) => set("trial_topic", v)} placeholder={x.trialTopicPh} max={100} rows={1} />
                  <GuardedText label={x.note} value={p.note ?? ""} onChange={(v) => set("note", v)} placeholder={x.notePh} />

                  <div className="grid gap-2 rounded-2xl bg-surface/70 p-4">
                    <p className="font-bold">{x.summary}</p>
                    {summary.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 text-sm">
                        <span className="shrink-0 text-muted">{k}</span>
                        <span className="min-w-0 text-right font-bold [overflow-wrap:anywhere]">{v}</span>
                      </div>
                    ))}
                    {voucher && (
                      <label className="mt-2 flex items-center gap-3 rounded-xl bg-brand-soft/60 p-3 text-sm">
                        <input type="checkbox" checked={useV} onChange={(e) => setUseV(e.target.checked)} className="size-5 accent-[var(--primary)]" />
                        <Ticket className="size-4 shrink-0 text-brand" aria-hidden />
                        <span className="flex-1">{x.useVoucher}</span>
                        <span className="tabular font-bold text-brand">−{formatTaka(Math.min(voucher.amount_bdt, price), locale)}</span>
                      </label>
                    )}
                    <div className="mt-2 flex justify-between border-t border-border pt-3 text-lg">
                      <span className="font-bold">{t.pay.total}</span>
                      <span className="tabular font-bold text-primary">{formatTaka(price - discount, locale)}</span>
                    </div>
                  </div>
                </>
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
            {step < LAST ? (
              <Button type="button" className="flex-1" onClick={() => go(1)}>
                {f.next}
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button type="button" className="flex-1" onClick={submit} disabled={busy || !!textHit || isTeacherOnly}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
                {busy ? x.submitting : x.submit}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
