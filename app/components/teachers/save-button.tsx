import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { useAuth } from "~/lib/auth";
import { mySavedIds, toggleSaved } from "~/lib/trials";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";

/** ♡ Save / Saved toggle. Logged-out users are sent to log in and brought back. */
export function SaveButton({ tscId, className }: { tscId: string; className?: string }) {
  const { t, href } = useLocale();
  const { me } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) mySavedIds().then((ids) => setSaved(ids.includes(tscId))).catch(() => {});
  }, [me, tscId]);

  async function toggle() {
    if (!me) {
      toast(t.saved.loginToSave);
      navigate(`${href("/login")}?next=${encodeURIComponent(href(`/teachers/${tscId}`))}`);
      return;
    }
    setBusy(true);
    setSaved((s) => !s); // optimistic
    try {
      setSaved(await toggleSaved(tscId));
    } catch {
      setSaved((s) => !s);
      toast.error(t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="ghost" onClick={toggle} disabled={busy} aria-pressed={saved} className={className}>
      <motion.span key={String(saved)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="inline-flex">
        <Heart className={cn("size-5", saved && "fill-primary text-primary")} aria-hidden />
      </motion.span>
      {saved ? t.saved.saved : t.saved.save}
    </Button>
  );
}
