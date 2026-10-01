import { KeyRound, Loader2, TimerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useLocale } from "~/i18n";
import { authErrorKey, passwordStrength } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import { Button } from "~/components/ui/button";
import { AuthShell, FormError, PasswordField } from "~/components/auth/parts";

export const meta = () => [{ title: "New password — TSC" }, { name: "robots", content: "noindex" }];

type Stage = "checking" | "ready" | "expired";

/**
 * Landing page of the reset email. The link carries a recovery session in the URL hash
 * (implicit flow), which supabase-js picks up on load — so it works on any device.
 */
export default function ResetPassword() {
  const { t, href } = useLocale();
  const a = t.auth;
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabase();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) return setStage("expired");
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && hash.get("type") === "recovery")) setStage("ready");
    });
    // Give supabase-js a moment to read the hash; no session afterwards means a dead link.
    const timer = setTimeout(async () => {
      const { data: s } = await sb.auth.getSession();
      setStage((cur) => (cur === "checking" ? (s.session ? "ready" : "expired") : cur));
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || passwordStrength(password) < 2) return setError(a.weakPassword);
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(a[authErrorKey(err)] ?? a.genericError);
    toast.success(a.resetDone);
    navigate(href("/dashboard"), { replace: true });
  }

  if (stage === "checking") {
    return (
      <AuthShell title={a.checkingLink}>
        <div className="grid place-items-center py-6 text-primary">
          <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
      </AuthShell>
    );
  }

  if (stage === "expired") {
    return (
      <AuthShell title={a.linkExpiredTitle} subtitle={a.linkExpiredBody}>
        <div className="grid justify-items-center gap-5">
          <span className="grid size-16 place-items-center rounded-3xl bg-gold-soft text-gold">
            <TimerOff className="size-8" aria-hidden />
          </span>
          <Button asChild size="lg" block>
            <Link to={href("/forgot-password")}>{a.requestNew}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={a.resetTitle} subtitle={a.resetSubtitle}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <PasswordField label={a.newPassword} autoComplete="new-password" autoFocus showMeter hint={a.passwordRule} value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" block disabled={busy || password.length < 8}>
          <KeyRound aria-hidden />
          {busy ? a.saving : a.saveAndLogin}
        </Button>
      </form>
    </AuthShell>
  );
}
