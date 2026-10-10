import { Loader2, ShieldAlert, Undo2, UserCheck, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { GOALS, LEARNING_STYLES, SUBJECTS, TEACHER_QUALITIES, TIME_SLOTS, DAYS, label, levelLabel } from "~/data/education";
import { districtLabel } from "~/data/geo";
import { searchTeachers, type TeacherCard } from "~/lib/api";
import { isAdminRole, useRequireAuth } from "~/lib/auth";
import { formatDate, formatTaka } from "~/lib/format";
import { adminAssignMatch, adminListMatches, adminUnfulfillMatch, type AdminMatch } from "~/lib/match";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal } from "~/components/fx/reveal";
import { Avatar } from "~/components/teachers/teacher-card";
import { matchTone } from "./my-matches";

export const meta = () => [{ title: "Smart Match — TSC Admin" }, { name: "robots", content: "noindex" }];

/** Teachers in the same district (and subject, when the data allows) as quick picks for the admin. */
async function candidates(m: AdminMatch): Promise<TeacherCard[]> {
  const base = { district: m.mode_text === "online" ? undefined : m.district ?? undefined, gender: m.teacher_gender === "any" ? undefined : m.teacher_gender, limit: 6 };
  const bySubject = await searchTeachers({ ...base, subject: m.subjects[0] });
  return bySubject.items.length ? bySubject.items : (await searchTeachers(base)).items;
}

function MatchCard({ m, reload }: { m: AdminMatch; reload: () => void }) {
  const { t, locale } = useLocale();
  const x = t.match;
  const [tsc, setTsc] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<TeacherCard[] | null>(null);
  const open = m.status === "searching" || m.status === "replacement_requested";
  const L = <T extends { code: string; bn: string; en: string }>(list: T[], codes: string[]) => codes.map((c) => label(list, c, locale)).join(", ");

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      toast.success(t.adminPay.done);
      reload();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string | null][] = [
    [x.subjectsShort, `${levelLabel(m.level, locale)} · ${L(SUBJECTS, m.subjects)}`],
    [x.areaShort, m.mode_text === "online" ? t.posts.form.modeOnline : [m.thana, m.district && districtLabel(m.district, locale)].filter(Boolean).join(", ") + (m.mode_text === "both" ? ` (+${t.posts.form.modeOnline})` : "")],
    [t.posts.form.days, [L(DAYS, m.days), m.time_slot && label(TIME_SLOTS, m.time_slot, locale)].filter(Boolean).join(" · ") || null],
    [t.posts.form.budget, m.budget_min || m.budget_max ? [m.budget_min, m.budget_max].filter(Boolean).map((n) => formatTaka(n!, locale)).join(" – ") : null],
    [x.goalsShort, L(GOALS, m.goals) || null],
    [x.styles.replace(/\s*\(.*$/, ""), L(LEARNING_STYLES, m.learning_styles) || null],
    [x.qualities.replace(/\s*\(.*$/, ""), L(TEACHER_QUALITIES, m.teacher_qualities) || null],
    [t.posts.form.teacherGender, m.teacher_gender !== "any" ? m.teacher_gender : null],
    ["University", m.preferred_institutions.join(", ") || null],
    ["Trial", m.trial_topic ?? null],
    ["Note", m.note ?? null],
  ];

  return (
    <Card className="min-w-0">
      <CardBody className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{m.requester.full_name?.trim() || m.email}</p>
            <p className="truncate text-sm text-muted">{[m.requester.tsc_id, m.email].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="tabular shrink-0 rounded-full bg-text/6 px-2.5 py-1 text-xs font-bold">{m.code}</span>
        </div>
        <span className={cn("justify-self-start rounded-full px-2.5 py-1 text-xs font-bold", matchTone[m.status])}>{x.status[m.status]}</span>

        <dl className="grid gap-1.5 text-sm">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
              </div>
            ))}
        </dl>

        {m.t1 && (
          <p className="rounded-xl bg-surface/70 p-2.5 text-sm">
            {m.status === "replacement_requested" ? x.replacementFor : "Teacher"}: <b>{m.t1.full_name || m.t1.tsc_id}</b> ({m.t1.tsc_id})
            {m.t2 && (
              <>
                {" → "}
                <b>{m.t2.full_name || m.t2.tsc_id}</b> ({m.t2.tsc_id})
              </>
            )}
            {m.replacement_reason && <span className="block text-muted">“{m.replacement_reason}”</span>}
          </p>
        )}

        {open && (
          <div className="grid gap-2 border-t border-border pt-3">
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => candidates(m).then(setPicks).catch(() => setPicks([]))}>
              <Wand2 aria-hidden />
              {locale === "bn" ? "মানানসই Teacher দেখাও" : "Suggest teachers"}
            </Button>
            {picks && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {picks
                  .filter((p) => p.tsc_id !== m.t1?.tsc_id)
                  .map((p) => (
                    <button
                      key={p.tsc_id}
                      type="button"
                      onClick={() => setTsc(p.tsc_id)}
                      className={cn("flex w-44 shrink-0 items-center gap-2 rounded-2xl border p-2 text-left text-sm", tsc === p.tsc_id ? "border-primary bg-primary/8" : "border-border-strong")}
                    >
                      <Avatar name={p.full_name} url={p.photo_url} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{p.full_name || p.tsc_id}</span>
                        <span className="block truncate text-xs text-muted">
                          {p.tsc_id} · {p.institution ?? p.university_name ?? ""}
                        </span>
                      </span>
                    </button>
                  ))}
                {picks.length === 0 && <p className="text-sm text-muted">—</p>}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <input value={tsc} onChange={(e) => setTsc(e.target.value.toUpperCase())} placeholder={x.assignPh} className="tabular h-11 rounded-[14px] border border-border-strong bg-surface/80 px-3 focus:border-primary focus:outline-none" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={x.assignNote} className="h-11 min-w-0 rounded-[14px] border border-border-strong bg-surface/80 px-3 focus:border-primary focus:outline-none" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button disabled={busy || !/^T\d+$/.test(tsc)} onClick={() => act(() => adminAssignMatch(m.id, tsc, note.trim()))}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <UserCheck aria-hidden />}
                {x.assign}
              </Button>
              {!m.t1 && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(x.unfulfill + "?")) act(() => adminUnfulfillMatch(m.id, note.trim()));
                  }}
                >
                  <Undo2 aria-hidden />
                  {x.unfulfill}
                </Button>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-muted">{formatDate(m.created_at, locale, { dateStyle: "medium", timeStyle: "short" })}</p>
      </CardBody>
    </Card>
  );
}

export default function AdminMatches() {
  const { t } = useLocale();
  const x = t.match;
  const { me, ready } = useRequireAuth();
  const isAdmin = isAdminRole(me);
  const [tab, setTab] = useState<"open" | "all">("open");
  const [rows, setRows] = useState<AdminMatch[] | null>(null);

  const load = useCallback(() => {
    setRows(null);
    adminListMatches(tab)
      .then((r) => setRows(r ?? []))
      .catch(() => setRows([]));
  }, [tab]);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (ready && me && !isAdmin) {
    return (
      <div className="container-page grid min-h-[50svh] place-items-center text-center text-muted">
        <ShieldAlert className="size-10" aria-hidden />
      </div>
    );
  }

  return (
    <div className="container-page grid grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.adminTitle}</h1>
      </Reveal>
      <div className="flex gap-2" role="tablist">
        {(["open", "all"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("h-10 rounded-full px-4 text-sm font-bold", tab === k ? "bg-[image:var(--grad-primary)] text-white shadow-[var(--glow-primary)]" : "glass text-muted hover:text-text")}
          >
            {k === "open" ? x.filterOpen : x.filterAll}
          </button>
        ))}
      </div>
      {rows === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-muted">{x.adminEmpty}</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((m) => (
            <MatchCard key={m.id} m={m} reload={load} />
          ))}
        </div>
      )}
    </div>
  );
}
