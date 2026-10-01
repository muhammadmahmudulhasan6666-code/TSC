import { CheckCircle2, Clock, Copy, Loader2, RotateCcw, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { useRequireAuth } from "~/lib/auth";
import { formatTaka } from "~/lib/format";
import { getPaymentRequest, moneyErrorKey, submitPaymentProof, type PaymentRequest } from "~/lib/money";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { FormError, TextField } from "~/components/auth/parts";
import { Reveal } from "~/components/fx/reveal";

export const meta = () => [{ title: "bKash Payment — TSC" }, { name: "robots", content: "noindex" }];

function CopyRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface/70 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className={cn("tabular truncate font-bold", big ? "text-2xl" : "text-lg")}>{value}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value.replace(/[৳,\s]/g, ""));
          toast.success(t.pay.copied);
        }}
      >
        <Copy aria-hidden />
        {t.pay.copy}
      </Button>
    </div>
  );
}

export default function Pay() {
  const { t, locale, href } = useLocale();
  const x = t.pay;
  const { me } = useRequireAuth();
  const { id = "" } = useParams();
  const [req, setReq] = useState<PaymentRequest | null | undefined>(undefined);
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => getPaymentRequest(id).then(setReq).catch(() => setReq(null)), [id]);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trxClean = trx.replace(/\s/g, "").toUpperCase();
    const senderClean = sender.replace(/\D/g, "").replace(/^88/, "");
    if (!/^01[3-9]\d{8}$/.test(senderClean)) return setError(x.errInvalidSender);
    if (!/^[A-Z0-9]{8,12}$/.test(trxClean)) return setError(x.errInvalidTrx);
    setBusy(true);
    try {
      await submitPaymentProof(id, senderClean, trxClean);
      await load();
    } catch (err) {
      const k = moneyErrorKey(err as { code?: string });
      setError(k && k in x ? x[k as keyof typeof x] as string : t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (req === undefined) {
    return (
      <div className="grid min-h-[60svh] place-items-center text-primary">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }
  if (req === null) {
    return <p className="container-page py-24 text-center text-muted">{x.notFound}</p>;
  }

  const name = locale === "bn" ? req.name_bn : req.name_en;
  const proofSent = !!req.trx_id;
  const waiting = req.status === "pending" && (proofSent || req.amount_bdt === 0);
  const statusView = {
    approved: [CheckCircle2, x.statusApproved, "text-brand", "bg-brand-soft"],
    rejected: [XCircle, x.statusRejected, "text-danger", "bg-danger/10"],
    refund_due: [RotateCcw, x.statusRefundDue, "text-gold", "bg-gold-soft"],
    refunded: [RotateCcw, x.statusRefunded, "text-brand", "bg-brand-soft"],
  } as const;
  const done = req.status in statusView ? statusView[req.status as keyof typeof statusView] : null;

  return (
    <div className="container-page grid max-w-2xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.title}</h1>
        <p className="mt-2 flex items-start gap-2 text-muted">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-brand" aria-hidden />
          {x.secure}
        </p>
      </Reveal>

      {/* Order summary */}
      <Reveal from="up">
        <Card>
          <CardBody className="grid gap-2">
            <div className="flex justify-between gap-3">
              <span className="text-muted">{x.service}</span>
              <span className="text-right font-bold">{name}</span>
            </div>
            {req.discount_bdt > 0 && (
              <div className="flex justify-between gap-3 text-brand">
                <span>{x.discount}</span>
                <span className="tabular">−{formatTaka(req.discount_bdt, locale)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between gap-3 border-t border-border pt-3 text-xl">
              <span className="font-bold">{x.total}</span>
              <span className="tabular font-bold text-primary">{formatTaka(req.amount_bdt, locale)}</span>
            </div>
          </CardBody>
        </Card>
      </Reveal>

      {done ? (
        <Reveal from="scale">
          <Card>
            <CardBody className="grid justify-items-center gap-3 text-center">
              <span className={cn("grid size-16 place-items-center rounded-3xl", done[2], done[3])}>
                {(() => {
                  const Icon = done[0];
                  return <Icon className="size-8" aria-hidden />;
                })()}
              </span>
              <h2 className="text-2xl">{done[1]}</h2>
              {req.admin_note && <p className="text-muted">{req.admin_note}</p>}
              <Button asChild variant="secondary">
                <Link to={href(req.service_code === "contact_unlock" ? "/dashboard/unlocks" : "/dashboard")}>{t.dash.myDashboard}</Link>
              </Button>
            </CardBody>
          </Card>
        </Reveal>
      ) : waiting ? (
        <Reveal from="scale">
          <Card tint="mint">
            <CardBody className="grid justify-items-center gap-3 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-[var(--chip)] text-brand">
                <Clock className="size-8" aria-hidden />
              </span>
              <h2 className="text-2xl">{x.statusPending}</h2>
              <p className="text-muted">{x.statusPendingBody}</p>
              {req.trx_id && <p className="tabular text-sm text-muted">TrxID: {req.trx_id}</p>}
            </CardBody>
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal from="orbitLeft">
            <Card tint="rose">
              <CardBody className="grid gap-3">
                <h2 className="flex items-center gap-2 text-xl">
                  <Smartphone className="size-5 text-primary" aria-hidden />
                  {x.stepSend}
                </h2>
                <p className="text-sm text-muted">{x.stepSendBody}</p>
                <CopyRow label={x.number} value={req.bkash?.number ?? "—"} big />
                <CopyRow label={x.amount} value={formatTaka(req.amount_bdt, locale)} />
                <CopyRow label={x.reference} value={req.reference_code} />
              </CardBody>
            </Card>
          </Reveal>
          <Reveal from="orbitRight">
            <Card>
              <CardBody>
                <h2 className="text-xl">{x.stepProof}</h2>
                <form onSubmit={submit} className="mt-4 grid gap-4" noValidate>
                  <TextField label={x.sender} inputMode="tel" autoComplete="tel" placeholder={x.senderPh} value={sender} onChange={(e) => setSender(e.target.value)} required />
                  <div className="grid gap-1.5">
                    <TextField label={x.trx} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder={x.trxPh} value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} required className="tabular tracking-widest" />
                    <p className="text-xs text-muted">{x.trxHint}</p>
                  </div>
                  <FormError>{error}</FormError>
                  <Button type="submit" size="lg" block disabled={busy || !sender || !trx}>
                    {busy && <Loader2 className="animate-spin" aria-hidden />}
                    {busy ? x.submitting : x.submit}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </Reveal>
        </>
      )}
    </div>
  );
}
