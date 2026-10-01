import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "~/i18n";
import { useAuth } from "~/lib/auth";
import { formatDate, formatNumber } from "~/lib/format";
import { supabase } from "~/lib/supabase";
import { cn } from "~/lib/cn";

interface Note {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

/** Bell with unread count; live via Supabase Realtime; glass dropdown with the latest 20. */
export function NotificationBell() {
  const { t, locale } = useLocale();
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const sb = supabase();
    const [{ data }, { count }] = await Promise.all([
      sb.from("notifications").select("id,type,title,message,is_read,created_at").eq("user_id", me.userId).order("created_at", { ascending: false }).limit(20),
      sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me.userId).eq("is_read", false),
    ]);
    setItems((data as Note[]) ?? []);
    setUnread(count ?? 0);
  }, [me]);

  useEffect(() => {
    if (!me) return;
    load();
    const channel = supabase()
      .channel(`notes-${me.userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.userId}` }, () => load())
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [me, load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  async function markAll() {
    if (!me) return;
    await supabase().from("notifications").update({ is_read: true }).eq("user_id", me.userId).eq("is_read", false);
    load();
  }

  if (!me) return null;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.notif.title}
        aria-expanded={open}
        className="glass relative grid size-11 place-items-center rounded-full transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.7rem] font-bold leading-5 text-white shadow-[var(--glow-primary)]">
            {formatNumber(Math.min(unread, 99), locale)}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass glass-strong fixed inset-x-3 top-[84px] z-50 max-h-[70svh] overflow-hidden rounded-[22px] shadow-[var(--shadow-lift)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[380px]"
          >
            <div className="relative flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-bold">{t.notif.title}</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-sm font-bold text-primary hover:underline">
                  {t.notif.markAll}
                </button>
              )}
            </div>
            <ul className="relative max-h-[calc(70svh-52px)] overflow-y-auto">
              {items.length === 0 && <li className="px-4 py-10 text-center text-muted">{t.notif.empty}</li>}
              {items.map((n) => (
                <li key={n.id} className={cn("border-b border-border px-4 py-3 last:border-0", !n.is_read && "bg-primary/5")}>
                  <p className="flex items-start gap-2 font-bold">
                    {!n.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                    <span className="min-w-0 break-words">{n.title}</span>
                  </p>
                  <p className="mt-0.5 break-words text-sm text-muted">{n.message}</p>
                  <p className="mt-1 text-xs text-muted/80">{formatDate(n.created_at, locale, { dateStyle: "medium", timeStyle: "short" })}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
