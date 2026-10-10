import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { BOARDS, CURRICULA, DAYS, GROUPS, LEVELS, SUBJECTS, TIME_SLOTS, levelHasGroup, type Curriculum } from "~/data/education";
import { DISTRICTS } from "~/data/geo";
import { useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatNumber } from "~/lib/format";
import { moneyErrorKey } from "~/lib/money";
import { createTuitionPost, type NewPost } from "~/lib/posts";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Chips } from "~/components/ui/chips";
import { FormError } from "~/components/auth/parts";

export const meta = () => [{ title: "Post a tuition need — TSC" }, { name: "robots", content: "noindex" }];

const DRAFT_KEY = "tsc-post-draft";
const empty: NewPost = { curriculum: "bangla_version", level: "", subjects: [], mode: "offline", days: [], negotiable: true, teacher_gender: "any", preferred_institutions: [] };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5">
      <p className="font-bold">{label}</p>
      {children}
    </div>
  );
}

const selectCls = "h-12 w-full min-w-0 rounded-[14px] border border-border-strong bg-surface/80 px-3 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12";

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

  const set = <K extends keyof NewPost>(k: K, v: NewPost[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const L = (items: { code: string; bn: string; en: string; hint?: { bn: string; en: string } }[]) =>
    items.map((i) => ({ code: i.code, label: i[locale], hint: i.hint?.[locale] }));

  const noteHit = findContact(p.note ?? "");
  const district = DISTRICTS.find((d) => d.en === p.district);
  const isTeacherOnly = !!me && me.roles.includes("teacher") && !me.roles.includes("student");

  function validate(s: number): string | null {
    if (s === 0 && !p.level) return f.needLevel;
    if (s === 1 && p.subjects.length === 0) return f.needSubjects;
    if (s === 2 && p.mode !== "online" && !p.district) return f.needDistrict;
    if (s === 4 && noteHit) return f.noteBlocked;
    return null;
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
      const body: NewPost = { ...p, group_stream: levelHasGroup(p.level) ? p.group_stream : undefined, note: p.note?.trim() || undefined };
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

  const levels = LEVELS[p.curriculum as Curriculum] ?? [];
  const boards = p.curriculum === "english_medium" || p.curriculum === "madrasah" ? BOARDS[p.curriculum] : null;

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
              {step === 0 && (
                <>
                  <Field label={f.curriculum}>
                    <Chips options={L(CURRICULA)} value={p.curriculum} onChange={(v) => setP((c) => ({ ...c, curriculum: v ?? c.curriculum, level: "", board: undefined }))} />
                  </Field>
                  {boards && (
                    <Field label={f.board}>
                      <Chips options={L(boards)} value={p.board} onChange={(v) => set("board", v)} />
                    </Field>
                  )}
                  <Field label={f.level}>
                    <Chips options={L(levels)} value={p.level} onChange={(v) => set("level", v ?? "")} />
                  </Field>
                  {levelHasGroup(p.level) && (
                    <Field label={f.group}>
                      <Chips options={L(GROUPS)} value={p.group_stream} onChange={(v) => set("group_stream", v)} />
                    </Field>
                  )}
                  <Field label={f.studentGender}>
                    <Chips options={[{ code: "male", label: f.boy }, { code: "female", label: f.girl }]} value={p.student_gender} onChange={(v) => set("student_gender", v)} />
                  </Field>
                </>
              )}

              {step === 1 && (
                <Field label={f.subjects}>
                  <Chips multi max={8} options={L(SUBJECTS)} value={p.subjects} onChange={(v) => set("subjects", v)} />
                </Field>
              )}

              {step === 2 && (
                <>
                  <Field label={f.mode}>
                    <Chips
                      options={[
                        { code: "offline", label: f.modeOffline },
                        { code: "online", label: f.modeOnline },
                        { code: "both", label: f.modeBoth },
                      ]}
                      value={p.mode}
                      onChange={(v) => set("mode", v ?? p.mode)}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={f.district}>
                      <select className={selectCls} value={p.district ?? ""} onChange={(e) => setP((c) => ({ ...c, district: e.target.value || undefined, thana: undefined }))}>
                        <option value="">{f.choose}</option>
                        {DISTRICTS.map((d) => (
                          <option key={d.en} value={d.en}>
                            {locale === "bn" ? d.bn : d.en}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={f.thana}>
                      <select className={selectCls} value={p.thana ?? ""} disabled={!district} onChange={(e) => set("thana", e.target.value || undefined)}>
                        <option value="">{f.choose}</option>
                        {district?.thanas.map((th) => (
                          <option key={th} value={th}>
                            {th}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label={f.days}>
                    <Chips multi options={L(DAYS)} value={p.days} onChange={(v) => set("days", v)} />
                  </Field>
                  <Field label={f.time}>
                    <Chips options={L(TIME_SLOTS)} value={p.time_slot} onChange={(v) => set("time_slot", v)} />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <Field label={f.budget}>
                    <div className="grid grid-cols-2 gap-3">
                      {(["budget_min", "budget_max"] as const).map((k) => (
                        <label key={k} className="grid gap-1.5">
                          <span className="text-xs text-muted">{k === "budget_min" ? f.from : f.to}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={500}
                            value={p[k] ?? ""}
                            onChange={(e) => set(k, e.target.value ? Math.round(Number(e.target.value) / 100) * 100 : undefined)}
                            placeholder={k === "budget_min" ? "3000" : "6000"}
                            className={cn(selectCls, "tabular")}
                          />
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={p.negotiable} onChange={(e) => set("negotiable", e.target.checked)} className="size-5 accent-[var(--primary)]" />
                      {f.negotiable}
                    </label>
                  </Field>
                  <Field label={f.teacherGender}>
                    <Chips
                      options={[
                        { code: "any", label: t.posts.anyTeacher },
                        { code: "male", label: t.posts.maleTeacher },
                        { code: "female", label: t.posts.femaleTeacher },
                      ]}
                      value={p.teacher_gender}
                      onChange={(v) => set("teacher_gender", v ?? "any")}
                    />
                  </Field>
                  <Field label={f.institutions}>
                    <Chips
                      multi
                      max={5}
                      options={["CUET", "BUET", "DU", "CU", "KUET", "RUET", "SUST", "NSU", "BRACU", "CMC", "DMC"].map((c) => ({ code: c, label: c }))}
                      value={p.preferred_institutions}
                      onChange={(v) => set("preferred_institutions", v)}
                    />
                  </Field>
                  <Field label={f.experience}>
                    <Chips
                      options={[{ code: "0", label: f.noExp }, ...[1, 2, 3, 5].map((n) => ({ code: String(n), label: `${formatNumber(n, locale)} ${f.years}` }))]}
                      value={p.min_experience != null ? String(p.min_experience) : "0"}
                      onChange={(v) => set("min_experience", v ? Number(v) || undefined : undefined)}
                    />
                  </Field>
                </>
              )}

              {step === 4 && (
                <Field label={f.note}>
                  <textarea
                    value={p.note ?? ""}
                    maxLength={150}
                    rows={3}
                    onChange={(e) => set("note", e.target.value)}
                    placeholder={f.notePh}
                    aria-invalid={noteHit ? true : undefined}
                    className={cn(
                      "w-full rounded-[14px] border bg-surface/80 p-3.5 text-base focus:outline-none focus:ring-4",
                      noteHit ? "border-danger focus:ring-danger/15" : "border-border-strong focus:border-primary focus:ring-primary/12",
                    )}
                  />
                  <div className="flex items-start justify-between gap-3 text-xs">
                    {noteHit ? (
                      <p role="alert" className="flex items-start gap-1.5 font-bold text-danger">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {f.noteBlocked}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="tabular shrink-0 text-muted">{formatNumber((p.note ?? "").length, locale)}/১৫০</span>
                  </div>
                </Field>
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
