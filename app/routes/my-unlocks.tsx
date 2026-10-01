import { Clock, CreditCard, Loader2, MessageCircle, Phone, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "~/i18n";
import { useRequireAuth } from "~/lib/auth";
import { formatDate } from "~/lib/format";
import { myUnlocks, renewUnlockPayment, whatsappLink, type MyUnlock, type UnlockStatus } from "~/lib/money";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { Avatar } from "~/components/teachers/teacher-card";

export const meta = () => [{ title: "My unlocks — TSC" }, { name: "robots", content: "noindex" }];

export const statusTone: Record<UnlockStatus, string> = {
  awaiting_payment: "bg-gold-soft text-gold",
  payment_review: "bg-violet/10 text-violet",
  pending_teacher: "bg-violet/10 text-violet",
  accepted: "bg-brand-soft text-brand",
  rejected: "bg-text/6 text-muted",
  expired: "bg-text/6 text-muted",
  cancelled: "bg-text/6 text-muted",
};

export default function MyUnlocks() {
  const { t, href, locale } = useLocale();
  const x = t.unlock;
  const { me } = useRequireAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MyUnlock[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => myUnlocks().then(setItems).catch(() => setItems([])), []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function pay(u: MyUnlock) {
    setBusyId(u.id);
    try {
      const id = u.payment_status === "pending" && u.payment_request_id ? u.payment_request_id : await renewUnlockPayment(u.id);
      navigate(href(`/pay/${id}`));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-page grid max-w-3xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.myTitle}</h1>
        <p className="mt-2 text-muted">{x.mySubtitle}</p>
      </Reveal>

      {items === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="grid justify-items-center gap-4 py-10 text-center">
            <p className="text-muted">{x.empty}</p>
            <Button asChild>
              <Link to={href("/teachers")}>
                <Search aria-hidden />
                {x.findTeacher}
              </Link>
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Stagger step={0.06} className="grid grid-cols-1 gap-4">
          {items.map((u) => (
            <Card key={u.id} tint={u.status === "accepted" ? "mint" : undefined}>
              <CardBody className="grid gap-4">
                <div className="flex items-start gap-4">
                  <Link to={href(`/teachers/${u.tsc_id}`)} className="shrink-0">
                    <Avatar name={u.full_name} url={u.photo_url} size={56} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={href(`/teachers/${u.tsc_id}`)} className="block truncate text-lg font-bold hover:underline">
                      {u.full_name?.trim() || u.tsc_id}
                    </Link>
                    <p className="truncate text-sm text-muted">{[u.university_name?.trim(), u.department].filter(Boolean).join(" · ")}</p>
                    <span className={cn("mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold", statusTone[u.status])}>{x.status[u.status]}</span>
                  </div>
                </div>

                {u.status === "accepted" && u.phone && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="tabular text-xl font-bold">{u.phone}</span>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="brand">
                        <a href={`tel:${u.phone}`}>
                          <Phone aria-hidden />
                          {x.call}
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <a href={whatsappLink(u.phone)} target="_blank" rel="noreferrer">
                          <MessageCircle aria-hidden />
                          {x.whatsapp}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {u.status === "pending_teacher" && u.expires_at && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Clock className="size-4" aria-hidden />
                    {x.answerBy}: {formatDate(u.expires_at, locale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}

                {u.status === "awaiting_payment" && (
                  <Button onClick={() => pay(u)} disabled={busyId === u.id} className="w-full sm:w-auto sm:justify-self-start">
                    {busyId === u.id ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
                    {x.payNow}
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </Stagger>
      )}
    </div>
  );
}
