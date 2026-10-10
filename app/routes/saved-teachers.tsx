import { Check, GitCompareArrows, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import type { TeacherProfile } from "~/lib/api";
import { useRequireAuth } from "~/lib/auth";
import { formatNumber } from "~/lib/format";
import { mySavedTeachers } from "~/lib/trials";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { TeacherCard } from "~/components/teachers/teacher-card";

export const meta = () => [{ title: "Saved teachers — TSC" }, { name: "robots", content: "noindex" }];

export default function SavedTeachers() {
  const { t, href, locale } = useLocale();
  const x = t.saved;
  const { me } = useRequireAuth();
  const [items, setItems] = useState<TeacherProfile[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);

  useEffect(() => {
    if (me) mySavedTeachers().then(setItems).catch(() => setItems([]));
  }, [me]);

  function togglePick(id: string) {
    setPick((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= 3) {
        toast(x.compareMax);
        return p;
      }
      return [...p, id];
    });
  }

  return (
    <div className="container-page grid grid-cols-1 gap-5 pb-32 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur">
        <h1 className="text-3xl sm:text-4xl">{x.title}</h1>
        <p className="mt-2 text-muted">{x.compareHint}</p>
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
                {t.nav.findTeachers}
              </Link>
            </Button>
          </CardBody>
        </Card>
      ) : (
        <Stagger step={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const on = pick.includes(p.tsc_id);
            return (
              <div key={p.tsc_id} className="relative min-w-0">
                <TeacherCard teacher={p} />
                <button
                  type="button"
                  onClick={() => togglePick(p.tsc_id)}
                  aria-pressed={on}
                  className={cn(
                    "absolute bottom-4 right-4 z-10 inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold shadow-sm transition-colors",
                    on ? "bg-primary text-on-primary" : "glass text-text",
                  )}
                >
                  {on ? <Check className="size-3.5" aria-hidden /> : <GitCompareArrows className="size-3.5" aria-hidden />}
                  {on ? x.remove : x.add}
                </button>
              </div>
            );
          })}
        </Stagger>
      )}

      {pick.length >= 2 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <Button asChild size="lg" className="shadow-[var(--shadow-lift)]">
            <Link to={`${href("/compare")}?t=${pick.join(",")}`}>
              <GitCompareArrows aria-hidden />
              {x.compare} ({formatNumber(pick.length, locale)})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
