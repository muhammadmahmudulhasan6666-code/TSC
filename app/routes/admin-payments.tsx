import { Check, Copy, Loader2, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { isAdminRole, useRequireAuth } from "~/lib/auth";
import { formatDate, formatNumber, formatTaka } from "~/lib/format";
import { adminListPayments, adminMarkRefunded, adminPaymentCounts, adminReviewPayment, type AdminPayment } from "~/lib/money";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "Payments — TSC Admin" }, { name: "robots", content: "noindex" }];

const TABS = ["pending", "refund_due", "approved", "rejected", "refunded", "all"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPayments() {
  const { t, locale } = useLocale();
  const x = t.adminPay;
  const { me, ready } = useRequireAuth();
  const isAdmin = isAdminRole(me);
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<AdminPayment[] | null>(null);
  const [counts, setCounts] = useState<{ pending_with_proof: number; pending_no_proof: number; refund_due: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const [list, c] = await Promise.all([adminListPayments(tab), adminPaymentCounts()]);
    // Proof-submitted requests first: they are the ones that can be approved now.
    setRows(tab === "pending" ? [...list].sort((a, b) => Number(!!b.trx_id || b.amount_bdt === 0) - Number(!!a.trx_id || a.amount_bdt === 0)) : list);
    setCounts(c);
  }, [tab]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
      toast.success(x.done);
      await load();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  if (ready && me && !isAdmin) {
    return (
      <div className="container-page grid min-h-[50svh] place-items-center text-center text-muted">
        <ShieldAlert className="size-10" aria-hidden />
      </div>
    );
  }

  const badge = (k: Tab) => (k === "pending" ? counts?.pending_with_proof : k === "refund_due" ? counts?.refund_due : undefined);

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
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                tab === k ? "bg-[image:var(--grad-primary)] text-white shadow-[var(--glow-primary)]" : "glass text-muted hover:text-text",
              )}
            >
              {x.tabs[k]}
              {!!badge(k) && <span className={cn("tabular rounded-full px-1.5 text-xs", tab === k ? "bg-white/25" : "bg-primary/12 text-primary")}>{formatNumber(badge(k)!, locale)}</span>}
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
          {rows.map((p) => {
            const canApprove = p.status === "pending" && (!!p.trx_id || p.amount_bdt === 0);
            return (
              <Card key={p.id} className="min-w-0">
                <CardBody className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{p.full_name?.trim() || p.email}</p>
                      <p className="truncate text-sm text-muted">{[p.tsc_id, p.email].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className="tabular shrink-0 text-xl font-bold text-primary">{formatTaka(p.amount_bdt, locale)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 rounded-xl bg-surface/70 p-2.5">
                      <p className="text-xs text-muted">{locale === "bn" ? p.name_bn : p.name_en}</p>
                      <p className="tabular truncate font-bold">{p.reference_code}</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-surface/70 p-2.5">
                      <p className="text-xs text-muted">TrxID {p.sender_number ? `· ${x.from} ${p.sender_number}` : ""}</p>
                      {p.trx_id ? (
                        <button
                          type="button"
                          className="tabular inline-flex max-w-full items-center gap-1 truncate font-bold hover:text-primary"
                          onClick={() => navigator.clipboard.writeText(p.trx_id!).then(() => toast.success(t.pay.copied))}
                        >
                          {p.trx_id}
                          <Copy className="size-3.5 shrink-0" aria-hidden />
                        </button>
                      ) : (
                        <p className="text-muted">{p.amount_bdt === 0 ? "—" : x.noProof}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {formatDate(p.created_at, locale, { dateStyle: "medium", timeStyle: "short" })}
                    {p.discount_bdt > 0 && ` · ${t.pay.discount} ${formatTaka(p.discount_bdt, locale)}`}
                    {p.admin_note && ` · ${p.admin_note}`}
                  </p>

                  {p.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button disabled={!canApprove || busy === p.id} onClick={() => act(p.id, () => adminReviewPayment(p.id, true))}>
                        {busy === p.id ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                        {x.approve}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy === p.id}
                        onClick={() => {
                          const reason = window.prompt(x.rejectReason) ?? "";
                          if (reason.trim()) act(p.id, () => adminReviewPayment(p.id, false, reason.trim()));
                        }}
                      >
                        <X aria-hidden />
                        {x.reject}
                      </Button>
                    </div>
                  )}
                  {p.status === "refund_due" && (
                    <Button variant="premium" disabled={busy === p.id} onClick={() => act(p.id, () => adminMarkRefunded(p.id))}>
                      <RotateCcw aria-hidden />
                      {x.markRefunded} — {formatTaka(p.amount_bdt, locale)} → {p.sender_number}
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
