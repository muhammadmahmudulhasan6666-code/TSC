import { CalendarCheck, Clock, CreditCard, Loader2, MessageCircle, Phone, Search, Star } from "lucide-react";
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
                  <Avatar name={u.person.full_name ?? null} url={u.person.photo_url ?? null} size={56} />
                  <div className="min-w-0 flex-1">
                    {u.person.kind === "teacher" ? (
                      <Link to={href(`/teachers/${u.person.tsc_id}`)} className="block truncate text-lg font-bold hover:underline">
                        {u.person.full_name?.trim() || u.person.tsc_id}
                      </Link>
                    ) : (
                      <p className="truncate text-lg font-bold">{u.person.full_name?.trim() || u.person.tsc_id}</p>
                    )}
                    <p className="truncate text-sm text-muted">{[u.person.tsc_id, u.person.line].filter(Boolean).join(" · ")}</p>
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

                {u.status === "accepted" && u.person.kind === "teacher" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild size="sm">
                      <Link to={href(`/trial/${u.person.tsc_id}`)}>
                        <CalendarCheck aria-hidden />
                        {t.trial.cta}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={href(`/review/${u.person.tsc_id}`)}>
                        <Star aria-hidden />
                        {t.trial.writeReview}
                      </Link>
                    </Button>
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
