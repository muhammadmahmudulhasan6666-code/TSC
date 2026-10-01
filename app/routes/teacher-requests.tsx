import { Check, Clock, Loader2, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { useRequireAuth } from "~/lib/auth";
import { formatDate } from "~/lib/format";
import { respondContactUnlock, teacherUnlockRequests, whatsappLink, type IncomingRequest } from "~/lib/money";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { statusTone } from "./my-unlocks";

export const meta = () => [{ title: "Contact requests — TSC" }, { name: "robots", content: "noindex" }];

const classLabel = (c: string | null) => (c ? c.replace(/^class_/, "Class ").replace(/^hsc_1$/, "HSC 1st yr").replace(/^hsc_2$/, "HSC 2nd yr") : null);

export default function TeacherRequests() {
  const { t, locale } = useLocale();
  const x = t.unlock;
  const { me } = useRequireAuth();
  const [items, setItems] = useState<IncomingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => teacherUnlockRequests().then(setItems).catch(() => setItems([])), []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await respondContactUnlock(id, accept);
      if (accept) toast.success(x.accepted);
      await load();
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-page grid max-w-3xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.requestsTitle}</h1>
        <p className="mt-2 text-muted">{x.requestsSubtitle}</p>
      </Reveal>

      {items === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-muted">{x.noRequests}</CardBody>
        </Card>
      ) : (
        <Stagger step={0.06} className="grid grid-cols-1 gap-4">
          {items.map((r) => (
            <Card key={r.id} tint={r.status === "pending_teacher" ? "violet" : r.status === "accepted" ? "mint" : undefined}>
              <CardBody className="grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold">{r.full_name?.trim() || r.tsc_id || "Student"}</p>
                    <p className="text-sm text-muted">{[r.tsc_id, classLabel(r.current_class), r.subjects?.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</p>
                    {(r.district || r.thana) && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <MapPin className="size-4" aria-hidden />
                        {[r.thana, r.district].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", statusTone[r.status])}>{x.status[r.status]}</span>
                </div>

                {r.status === "pending_teacher" && (
                  <>
                    {r.expires_at && (
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <Clock className="size-4" aria-hidden />
                        {x.answerBy}: {formatDate(r.expires_at, locale, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => respond(r.id, true)} disabled={busyId === r.id}>
                        {busyId === r.id ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                        {x.accept}
                      </Button>
                      <Button variant="secondary" onClick={() => respond(r.id, false)} disabled={busyId === r.id}>
                        <X aria-hidden />
                        {x.reject}
                      </Button>
                    </div>
                  </>
                )}

                {r.status === "accepted" && r.phone && (
                  <div className="flex flex-col gap-2 rounded-2xl bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      {r.guardian_name && <p className="text-xs text-muted">{x.guardian}: {r.guardian_name}</p>}
                      <span className="tabular text-xl font-bold">{r.phone}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="brand">
                        <a href={`tel:${r.phone}`}>
                          <Phone aria-hidden />
                          {x.call}
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="secondary">
                        <a href={whatsappLink(r.phone)} target="_blank" rel="noreferrer">
                          <MessageCircle aria-hidden />
                          {x.whatsapp}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </Stagger>
      )}
    </div>
  );
}
