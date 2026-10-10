import { AlertTriangle } from "lucide-react";
import { useLocale } from "~/i18n";
import { BOARDS, CURRICULA, DAYS, GROUPS, LEVELS, SUBJECTS, TIME_SLOTS, levelHasGroup, type Curriculum } from "~/data/education";
import { DISTRICTS } from "~/data/geo";
import { findContact } from "~/lib/contact-guard";
import { formatNumber } from "~/lib/format";
import type { NewPost } from "~/lib/posts";
import { cn } from "~/lib/cn";
import { Chips } from "~/components/ui/chips";

/** The requirement shared by Tuition Posts and Smart Match. */
export type Requirement = Omit<NewPost, "days_per_week">;

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5">
      <p className="font-bold">{label}</p>
      {children}
    </div>
  );
}

export const selectCls =
  "h-12 w-full min-w-0 rounded-[14px] border border-border-strong bg-surface/80 px-3 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12";

export const INSTITUTIONS = ["CUET", "BUET", "DU", "CU", "KUET", "RUET", "SUST", "NSU", "BRACU", "CMC", "DMC"];

type Item = { code: string; bn: string; en: string; hint?: { bn: string; en: string } };
export function useOptions() {
  const { locale } = useLocale();
  return (items: Item[]) => items.map((i) => ({ code: i.code, label: i[locale], hint: i.hint?.[locale] }));
}

/** Per-step validation for the four requirement steps (0 student, 1 subjects, 2 where/when, 3 budget). */
export function useRequirementValidator() {
  const f = useLocale().t.posts.form;
  return (s: number, p: Requirement): string | null => {
    if (s === 0 && !p.level) return f.needLevel;
    if (s === 1 && p.subjects.length === 0) return f.needSubjects;
    if (s === 2 && p.mode !== "online" && !p.district) return f.needDistrict;
    return null;
  };
}

export const cleanRequirement = <T extends Requirement>(p: T): T => ({ ...p, group_stream: levelHasGroup(p.level) ? p.group_stream : undefined });

export function RequirementStep<T extends Requirement>({ step, p, setP }: { step: 0 | 1 | 2 | 3; p: T; setP: React.Dispatch<React.SetStateAction<T>> }) {
  const { t, locale } = useLocale();
  const f = t.posts.form;
  const L = useOptions();
  const set = <K extends keyof T>(k: K, v: T[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const district = DISTRICTS.find((d) => d.en === p.district);
  const levels = LEVELS[p.curriculum as Curriculum] ?? [];
  const boards = p.curriculum === "english_medium" || p.curriculum === "madrasah" ? BOARDS[p.curriculum] : null;

  if (step === 0)
    return (
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
    );

  if (step === 1)
    return (
      <Field label={f.subjects}>
        <Chips multi max={8} options={L(SUBJECTS)} value={p.subjects} onChange={(v) => set("subjects", v)} />
      </Field>
    );

  if (step === 2)
    return (
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
    );

  return (
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
                onChange={(e) => set(k, (e.target.value ? Math.round(Number(e.target.value) / 100) * 100 : undefined) as T[typeof k])}
                placeholder={k === "budget_min" ? "3000" : "6000"}
                className={cn(selectCls, "tabular")}
              />
            </label>
          ))}
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={p.negotiable} onChange={(e) => set("negotiable", e.target.checked as T["negotiable"])} className="size-5 accent-[var(--primary)]" />
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
          onChange={(v) => set("teacher_gender", (v ?? "any") as T["teacher_gender"])}
        />
      </Field>
      <Field label={f.institutions}>
        <Chips multi max={5} options={INSTITUTIONS.map((c) => ({ code: c, label: c }))} value={p.preferred_institutions} onChange={(v) => set("preferred_institutions", v)} />
      </Field>
      <Field label={f.experience}>
        <Chips
          options={[{ code: "0", label: f.noExp }, ...[1, 2, 3, 5].map((n) => ({ code: String(n), label: `${formatNumber(n, locale)} ${f.years}` }))]}
          value={p.min_experience != null ? String(p.min_experience) : "0"}
          onChange={(v) => set("min_experience", (v ? Number(v) || undefined : undefined) as T["min_experience"])}
        />
      </Field>
    </>
  );
}

/** Free-text box with the live contact detector (phone, email, links, social handles are blocked). */
export function GuardedText({ label, value, onChange, placeholder, max = 150, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number; rows?: number }) {
  const { t, locale } = useLocale();
  const hit = findContact(value);
  const Tag = rows > 1 ? "textarea" : "input";
  return (
    <Field label={label}>
      <Tag
        value={value}
        maxLength={max}
        rows={rows > 1 ? rows : undefined}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement & HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={hit ? true : undefined}
        className={cn(
          "w-full rounded-[14px] border bg-surface/80 p-3.5 text-base focus:outline-none focus:ring-4",
          hit ? "border-danger focus:ring-danger/15" : "border-border-strong focus:border-primary focus:ring-primary/12",
        )}
      />
      <div className="flex items-start justify-between gap-3 text-xs">
        {hit ? (
          <p role="alert" className="flex items-start gap-1.5 font-bold text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t.posts.form.noteBlocked}
          </p>
        ) : (
          <span />
        )}
        <span className="tabular shrink-0 text-muted">
          {formatNumber(value.length, locale)}/{formatNumber(max, locale)}
        </span>
      </div>
    </Field>
  );
}
