import { ArrowRight, BadgeCheck, CreditCard, Gift, Inbox, KeyRound, LogOut, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useLocale } from "~/i18n";
import { useAuth } from "~/lib/auth";
import { formatTaka } from "~/lib/format";
import { supabase } from "~/lib/supabase";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { CountUp } from "~/components/fx/count-up";
import { Reveal, Stagger } from "~/components/fx/reveal";

export const meta = () => [{ title: "Dashboard — TSC" }, { name: "robots", content: "noindex" }];

interface AdminStats {
  users: number;
  teachers: number;
  students: number;
  pending: number;
}

/** First post-login screen: who you are, your TSC ID, legacy voucher; admins see live counts. */
export default function Dashboard() {
  const { t, href, locale } = useLocale();
  const d = t.dash;
  const { ready, me, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [voucher, setVoucher] = useState<number | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const isAdmin = !!me?.roles.some((r) => r === "admin" || r === "super_admin");

  useEffect(() => {
    if (ready && !me) navigate(`${href("/login")}?next=${encodeURIComponent(pathname)}`, { replace: true });
  }, [ready, me, navigate, href, pathname]);

  useEffect(() => {
    if (!me) return;
    const sb = supabase();
    sb.from("vouchers").select("amount_bdt").eq("user_id", me.userId).is("redeemed_at", null).then(({ data }) => {
      const total = (data ?? []).reduce((s, v) => s + v.amount_bdt, 0);
      setVoucher(total || null);
    });
    if (!isAdmin) return;
    const count = (table: string, filter?: (q: any) => any) => {
      let q = sb.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      return q.then(({ count: c }: { count: number | null }) => c ?? 0);
    };
    Promise.all([
      count("user_profiles"),
      count("teacher_profiles"),
      count("student_profiles"),
      count("teacher_profiles", (q) => q.in("verification_status", ["pending", "under_review"])),
    ]).then(([users, teachers, students, pending]) => setStats({ users, teachers, students, pending }));
  }, [me, isAdmin]);

  if (!me) {
    return <div className="min-h-[60svh]" aria-busy="true" />;
  }

  return (
    <div className="container-page grid grid-cols-1 gap-5 py-10 sm:py-14 [&>*]:min-w-0">
      <Reveal from="blur">
        <Card>
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-[image:var(--grad-primary)] text-2xl font-bold text-white shadow-[var(--glow-primary)]">
                {me.photoUrl ? <img src={me.photoUrl} alt="" className="size-full object-cover" /> : (me.fullName ?? me.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{d.hello}</p>
                <h1 className="break-words text-2xl [overflow-wrap:anywhere] sm:text-3xl">{me.fullName ?? me.email.split("@")[0]}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  {me.roles.map((r) => (
                    <Badge key={r} tone={r === "super_admin" || r === "admin" ? "certified" : "verified"}>
                      {d.role[r]}
                    </Badge>
                  ))}
                  {me.tscId && <Badge>{`${t.common.tscId}: ${me.tscId}`}</Badge>}
                </div>
              </div>
            </div>
            <Button variant="secondary" onClick={signOut} className="w-full sm:w-auto">
              <LogOut aria-hidden />
              {t.auth.logout}
            </Button>
          </CardBody>
        </Card>
      </Reveal>

      {me.isLegacy && (
        <Reveal from="up" delay={0.05}>
          <p className="flex items-start gap-2 text-muted">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-brand" aria-hidden />
            {d.welcomeBack}
          </p>
        </Reveal>
      )}

      {voucher && (
        <Reveal from="left" delay={0.1}>
          <Card tint="gold">
            <CardBody className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--chip)] text-gold">
                <Gift className="size-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl">{d.voucherTitle}</h2>
                <p className="text-muted">
                  {d.voucherBody} <b className="tabular text-text">{formatTaka(voucher, locale)}</b>
                </p>
              </div>
            </CardBody>
          </Card>
        </Reveal>
      )}

      {isAdmin && (
        <Reveal from="right" delay={0.15}>
          <Card tint="violet">
            <CardBody>
              <h2 className="flex items-center gap-2 text-xl">
                <Sparkles className="size-5 text-violet" aria-hidden />
                {d.adminTitle}
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {(
                  [
                    [stats?.users, d.adminUsers, Users],
                    [stats?.teachers, d.adminTeachers, BadgeCheck],
                    [stats?.students, d.adminStudents, Users],
                    [stats?.pending, d.adminPendingVerify, ShieldCheck],
                  ] as const
                ).map(([n, label, Icon]) => (
                  <div key={label} className="min-w-0 rounded-2xl bg-surface/60 p-3.5 sm:p-4">
                    <Icon className="size-5 text-muted" aria-hidden />
                    <dd className="tabular mt-2 text-3xl font-bold">{n === undefined ? "…" : <CountUp value={n} locale={locale} />}</dd>
                    <dt className="text-sm leading-snug text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        </Reveal>
      )}

      {/* Shortcuts by role */}
      <Stagger step={0.06} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          me.roles.includes("student") && { to: "/dashboard/unlocks", icon: KeyRound, label: t.unlock.myTitle, tint: "rose" as const },
          me.roles.includes("teacher") && { to: "/dashboard/requests", icon: Inbox, label: t.unlock.requestsTitle, tint: "violet" as const },
          isAdmin && { to: "/admin/payments", icon: CreditCard, label: t.adminPay.title, tint: "gold" as const },
        ]
          .filter(Boolean)
          .map((l) => {
            const { to, icon: Icon, label, tint } = l as { to: string; icon: typeof KeyRound; label: string; tint: "rose" | "violet" | "gold" };
            return (
              <Card key={to} tint={tint}>
                <Link to={href(to)} className="group flex items-center gap-3 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--chip)] text-[var(--accent)]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 font-bold">{label}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </Card>
            );
          })}
      </Stagger>

      <p className="text-center text-sm text-muted">{d.comingNext}</p>
    </div>
  );
}
