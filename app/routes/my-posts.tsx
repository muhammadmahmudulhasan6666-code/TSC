import { CheckCircle2, Loader2, PlusCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { SUBJECTS, label, levelLabel } from "~/data/education";
import { useRequireAuth } from "~/lib/auth";
import { formatDate, formatNumber } from "~/lib/format";
import { closeTuitionPost, myTuitionPosts, type MyPost, type PostStatus } from "~/lib/posts";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Card, CardBody } from "~/components/ui/card";
import { Reveal, Stagger } from "~/components/fx/reveal";
import { Avatar } from "~/components/teachers/teacher-card";

export const meta = () => [{ title: "My tuition posts — TSC" }, { name: "robots", content: "noindex" }];

const tone: Record<PostStatus, string> = {
  pending_review: "bg-gold-soft text-gold",
  open: "bg-brand-soft text-brand",
  filled: "bg-violet/10 text-violet",
  closed: "bg-text/6 text-muted",
  rejected: "bg-danger/10 text-danger",
  expired: "bg-text/6 text-muted",
};

export default function MyPosts() {
  const { t, href, locale } = useLocale();
  const x = t.posts;
  const { me } = useRequireAuth();
  const [posts, setPosts] = useState<MyPost[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => myTuitionPosts().then(setPosts).catch(() => setPosts([])), []);
  useEffect(() => {
    if (me) load();
  }, [me, load]);

  async function close(id: string, filled: boolean) {
    setBusy(id);
    await closeTuitionPost(id, filled).finally(() => setBusy(null));
    load();
  }

  return (
    <div className="container-page grid max-w-3xl grid-cols-1 gap-5 pb-24 pt-8 sm:pt-12 [&>*]:min-w-0">
      <Reveal from="blur" className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">{x.myPosts}</h1>
        <Button asChild>
          <Link to={href("/tuition-posts/new")}>
            <PlusCircle aria-hidden />
            {x.newCta}
          </Link>
        </Button>
      </Reveal>

      {posts === null ? (
        <div className="grid place-items-center py-16 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-muted">{x.empty}</CardBody>
        </Card>
      ) : (
        <Stagger step={0.06} className="grid grid-cols-1 gap-4">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardBody className="grid gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted">
                      {p.code} · {formatDate(p.created_at, locale, { dateStyle: "medium" })}
                    </p>
                    <h2 className="text-xl">{levelLabel(p.level, locale)}</h2>
                    <p className="text-sm text-muted">{p.subjects.map((s) => label(SUBJECTS, s, locale)).join(", ")}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone[p.status])}>{x.status[p.status]}</span>
                </div>

                <div>
                  <p className="text-sm font-bold">
                    {x.interestedTeachers} ({formatNumber(p.hand_raise_count, locale)})
                  </p>
                  {p.interested.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">{x.noInterest}</p>
                  ) : (
                    <ul className="mt-2 grid gap-2">
                      {p.interested.map((tch) => (
                        <li key={tch.tsc_id}>
                          <Link to={href(`/teachers/${tch.tsc_id}`)} className="flex items-center gap-3 rounded-2xl bg-surface/70 p-2.5 hover:bg-surface">
                            <Avatar name={tch.full_name} url={tch.photo_url} size={44} className="rounded-2xl" />
                            <span className="min-w-0">
                              <span className="block truncate font-bold">{tch.full_name?.trim() || tch.tsc_id}</span>
                              <span className="block truncate text-xs text-muted">{[tch.tsc_id, tch.line].filter(Boolean).join(" · ")}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {(p.status === "open" || p.status === "pending_review") && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="brand" className="h-11" disabled={busy === p.id} onClick={() => close(p.id, true)}>
                      <CheckCircle2 aria-hidden />
                      {x.markFilled}
                    </Button>
                    <Button size="sm" variant="secondary" className="h-11" disabled={busy === p.id} onClick={() => close(p.id, false)}>
                      <XCircle aria-hidden />
                      {x.closePost}
                    </Button>
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
