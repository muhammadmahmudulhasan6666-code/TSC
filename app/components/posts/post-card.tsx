import { CalendarDays, Clock, GraduationCap, Hand, Loader2, MapPin, MonitorSmartphone, Phone, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { CURRICULA, DAYS, SUBJECTS, TIME_SLOTS, label, levelLabel } from "~/data/education";
import { districtLabel } from "~/data/geo";
import { useAuth } from "~/lib/auth";
import { formatDate, formatNumber, formatTaka } from "~/lib/format";
import { moneyErrorKey, requestContactUnlock } from "~/lib/money";
import { raiseHand, type TuitionPost } from "~/lib/posts";
import { Button } from "~/components/ui/button";
import { TiltCard } from "~/components/fx/tilt-card";

function Row({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

/** One tuition post on the public board. Teachers can raise a hand (free) or pay ৳100 to unlock the guardian. */
export function PostCard({ post: p, canAct }: { post: TuitionPost; canAct: boolean }) {
  const { t, href, locale } = useLocale();
  const x = t.posts;
  const { me } = useAuth();
  const navigate = useNavigate();
  const [raised, setRaised] = useState(p.i_raised);
  const [count, setCount] = useState(p.hand_raise_count);
  const [busy, setBusy] = useState<"raise" | "contact" | null>(null);

  const needLogin = () => navigate(`${href("/login")}?next=${encodeURIComponent(href("/tuition-posts"))}`);

  async function onRaise() {
    if (!me) return needLogin();
    setBusy("raise");
    try {
      setCount(await raiseHand(p.id));
      setRaised(true);
    } catch (e) {
      toast.error(moneyErrorKey(e as { code?: string }) === "teachersCannot" ? x.onlyVerified : t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function onContact() {
    if (!me) return needLogin();
    if (!p.author_tsc_id) return;
    setBusy("contact");
    try {
      const r = await requestContactUnlock(p.author_tsc_id);
      navigate(href(r.status === "awaiting_payment" ? `/pay/${r.payment_request_id}` : "/dashboard/unlocks"));
    } catch (e) {
      const k = moneyErrorKey(e as { code?: string });
      toast.error(k === "teachersCannot" ? x.onlyVerified : k && k in t.unlock ? (t.unlock[k as keyof typeof t.unlock] as string) : t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  const budget =
    p.budget_min || p.budget_max
      ? `${[p.budget_min, p.budget_max].filter(Boolean).map((b) => formatTaka(b!, locale)).join(" – ")}${x.perMonth}`
      : x.negotiable;
  const mode = p.mode === "online" ? t.posts.form.modeOnline : p.mode === "offline" ? t.posts.form.modeOffline : t.posts.form.modeBoth;
  const teacherPref = p.teacher_gender === "male" ? x.maleTeacher : p.teacher_gender === "female" ? x.femaleTeacher : x.anyTeacher;

  return (
    <TiltCard tint={p.mode === "online" ? "violet" : "mint"} intensity={4} className="h-full">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {p.code} · {label(CURRICULA, p.curriculum, locale)}
            </p>
            <h3 className="mt-1 text-xl leading-tight">{levelLabel(p.level, locale)}</h3>
          </div>
          <span className="tabular shrink-0 rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
            <Users className="mr-1 inline size-3.5" aria-hidden />
            {formatNumber(count, locale)} {x.interested}
          </span>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {p.subjects.map((s) => (
            <li key={s} className="rounded-full border border-border-strong bg-surface/70 px-2.5 py-1 text-xs font-bold">
              {label(SUBJECTS, s, locale)}
            </li>
          ))}
        </ul>

        <ul className="grid gap-2">
          <Row icon={MonitorSmartphone}>{mode}</Row>
          {(p.district || p.thana) && <Row icon={MapPin}>{[p.thana, p.district && districtLabel(p.district, locale)].filter(Boolean).join(", ")}</Row>}
          {p.days.length > 0 && <Row icon={CalendarDays}>{p.days.map((d) => label(DAYS, d, locale)).join(", ")}</Row>}
          {p.time_slot && <Row icon={Clock}>{label(TIME_SLOTS, p.time_slot, locale)}</Row>}
          <Row icon={Wallet}>
            <b className="tabular">{budget}</b>
            {p.negotiable && (p.budget_min || p.budget_max) ? ` · ${x.negotiable}` : ""}
          </Row>
          <Row icon={GraduationCap}>
            {x.teacherPref}: {teacherPref}
            {p.min_experience ? ` · ${x.minExp.replace("{n}", formatNumber(p.min_experience, locale))}` : ""}
          </Row>
        </ul>

        {p.note && <p className="rounded-2xl bg-surface/70 p-3 text-sm text-muted">“{p.note}”</p>}

        <p className="mt-auto text-xs text-muted">
          {x.postedAgo}: {formatDate(p.created_at, locale, { dateStyle: "medium" })}
        </p>

        {canAct && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant={raised ? "brand" : "secondary"} size="sm" className="h-11" onClick={onRaise} disabled={raised || busy !== null}>
              {busy === "raise" ? <Loader2 className="animate-spin" aria-hidden /> : <Hand aria-hidden />}
              {raised ? x.raised : x.raiseHand}
            </Button>
            <Button size="sm" className="h-11" onClick={onContact} disabled={busy !== null}>
              {busy === "contact" ? <Loader2 className="animate-spin" aria-hidden /> : <Phone aria-hidden />}
              {x.contact}
            </Button>
          </div>
        )}
      </div>
    </TiltCard>
  );
}
