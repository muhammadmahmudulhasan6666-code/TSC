import { AlertTriangle, Check, Loader2, Save, ShieldAlert, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { SUBJECTS, label, levelLabel } from "~/data/education";
import { districtLabel } from "~/data/geo";
import { isAdminRole, useRequireAuth } from "~/lib/auth";
import { findContact } from "~/lib/contact-guard";
import { formatDate, formatTaka } from "~/lib/format";
import { adminListPosts, adminModeratePost, adminRemovePost, adminSetPostNote, type AdminPost } from "~/lib/posts";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "Tuition posts — TSC Admin" }, { name: "robots", content: "noindex" }];

const TABS = ["pending_review", "open", "rejected", "all"] as const;

function PostRow({ p, reload }: { p: AdminPost; reload: () => void }) {
  const { t, locale } = useLocale();
  const x = t.posts.admin;
  const [note, setNote] = useState(p.note ?? "");
  const [busy, setBusy] = useState(false);
  const hit = findContact(note);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      toast.success(t.adminPay.done);
      reload();
    } catch (e) {
      toast.error((e as { code?: string }).code === "TS422" ? x.noteStillBad : ((e as { message?: string }).message ?? t.auth.genericError));
    } finally {
      setBusy(false);
    }
  }
  const ask = () => window.prompt(x.reason)?.trim();
  const where = p.mode === "online" ? t.posts.form.modeOnline : [p.thana, p.district && districtLabel(p.district, locale)].filter(Boolean).join(", ");
  const budget = p.budget_min || p.budget_max ? [p.budget_min, p.budget_max].filter(Boolean).map((n) => formatTaka(n!, locale)).join(" – ") : null;

  return (
    <Card className="min-w-0">
      <CardBody className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{p.author.full_name?.trim() || p.email}</p>
            <p className="truncate text-sm text-muted">{[p.author.tsc_id, p.email].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="tabular shrink-0 rounded-full bg-text/6 px-2.5 py-1 text-xs font-bold">{p.code}</span>
        </div>
        <p className="text-sm">{[levelLabel(p.level, locale), p.subjects.map((s) => label(SUBJECTS, s, locale)).join(", "), where, budget].filter(Boolean).join(" · ")}</p>
        <span className="justify-self-start rounded-full bg-text/6 px-2.5 py-1 text-xs font-bold">{t.posts.status[p.status]}</span>

        {p.moderation_reason && (
          <p className="flex items-start gap-2 rounded-xl bg-gold-soft p-2.5 text-sm text-gold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {x.flagged}: {p.moderation_reason}
            </span>
          </p>
        )}

        {(p.status === "pending_review" || p.status === "open") && (
          <div className="grid gap-2">
            <textarea
              value={note}
              maxLength={150}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
              className={cn("w-full rounded-[14px] border bg-surface/80 p-3 text-base focus:outline-none focus:ring-4", hit ? "border-danger focus:ring-danger/15" : "border-border-strong focus:border-primary focus:ring-primary/12")}
            />
            {note !== (p.note ?? "") && (
              <Button size="sm" variant="secondary" className="justify-self-start" disabled={busy || !!hit} onClick={() => act(() => adminSetPostNote(p.id, note))}>
                <Save aria-hidden />
                {x.saveNote}
              </Button>
            )}
          </div>
        )}

        {p.status === "pending_review" && (
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy || !!findContact(p.note ?? "") || note !== (p.note ?? "")} onClick={() => act(() => adminModeratePost(p.id, true))}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              {x.approve}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const r = ask();
                if (r) act(() => adminModeratePost(p.id, false, r));
              }}
            >
              <X aria-hidden />
              {x.reject}
            </Button>
          </div>
        )}
        {p.status === "open" && (
          <Button
            variant="secondary"
            className="justify-self-start"
            disabled={busy}
            onClick={() => {
              const r = ask();
              if (r) act(() => adminRemovePost(p.id, r));
            }}
          >
            <Trash2 aria-hidden />
            {x.remove}
          </Button>
        )}
        <p className="text-xs text-muted">
          {formatDate(p.created_at, locale, { dateStyle: "medium", timeStyle: "short" })} · ✋ {p.hand_raise_count}
        </p>
      </CardBody>
    </Card>
  );
}

export default function AdminPosts() {
  const { t } = useLocale();
  const x = t.posts.admin;
  const { me, ready } = useRequireAuth();
  const isAdmin = isAdminRole(me);
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending_review");
  const [rows, setRows] = useState<AdminPost[] | null>(null);

  const load = useCallback(() => {
    setRows(null);
    adminListPosts(tab)
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
        <h1 className="text-3xl sm:text-4xl">{x.title}</h1>
      </Reveal>
      <div className="-mx-4 overflow-x-auto px-4" role="tablist">
        <div className="flex w-max gap-2">
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("h-10 rounded-full px-4 text-sm font-bold", tab === k ? "bg-[image:var(--grad-primary)] text-white shadow-[var(--glow-primary)]" : "glass text-muted hover:text-text")}
            >
              {x.tabs[k]}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-muted">{x.empty}</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((p) => (
            <PostRow key={p.id} p={p} reload={load} />
          ))}
        </div>
      )}
    </div>
  );
}
