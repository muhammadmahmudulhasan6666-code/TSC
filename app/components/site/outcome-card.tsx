import { AnimatePresence, motion } from "motion/react";
import { HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { useAuth } from "~/lib/auth";
import type { PersonCard } from "~/lib/money";
import { answerOutcome, pendingOutcomes } from "~/lib/trials";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Avatar } from "~/components/teachers/teacher-card";

/** "Did the tuition work out?" — one card per connection, answered in one tap. */
export function OutcomeCards() {
  const { t } = useLocale();
  const x = t.outcome;
  const { me } = useAuth();
  const [items, setItems] = useState<{ person: PersonCard }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (me) pendingOutcomes().then(setItems).catch(() => {});
  }, [me]);

  async function answer(tscId: string, a: "matched" | "talking" | "not_matched") {
    setBusy(tscId);
    try {
      await answerOutcome(tscId, a);
      setItems((list) => list.filter((i) => i.person.tsc_id !== tscId));
      toast.success(x.thanks);
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence initial={false}>
      {items.map(({ person }) => (
        <motion.div key={person.tsc_id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }}>
          <Card tint="violet">
            <CardBody className="grid gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={person.full_name ?? null} url={person.photo_url ?? null} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    <HeartHandshake className="size-5 shrink-0 text-violet" aria-hidden />
                    {x.title}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {person.full_name?.trim() || person.tsc_id} · {x.body}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="brand" size="sm" disabled={busy === person.tsc_id} onClick={() => answer(person.tsc_id!, "matched")}>
                  {x.matched}
                </Button>
                <Button variant="secondary" size="sm" disabled={busy === person.tsc_id} onClick={() => answer(person.tsc_id!, "talking")}>
                  {x.talking}
                </Button>
                <Button variant="ghost" size="sm" disabled={busy === person.tsc_id} onClick={() => answer(person.tsc_id!, "not_matched")}>
                  {x.notMatched}
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
