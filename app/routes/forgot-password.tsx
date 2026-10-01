import { MailCheck, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useLocale } from "~/i18n";
import { authErrorKey } from "~/lib/auth";
import { formatNumber } from "~/lib/format";
import { supabase } from "~/lib/supabase";
import { Button } from "~/components/ui/button";
import { AuthShell, FormError, TextField, maskEmail } from "~/components/auth/parts";

export const meta = () => [{ title: "Reset password — TSC" }, { name: "robots", content: "noindex" }];

const COOLDOWN = 60;

export default function ForgotPassword() {
  const { t, href, locale } = useLocale();
  const a = t.auth;
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send(target: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.resetPasswordForEmail(target, { redirectTo: window.location.origin + href("/reset-password") });
    setBusy(false);
    // Never reveal whether the account exists: only rate limits surface as errors.
    if (err && authErrorKey(err) === "rateLimited") return setError(a.rateLimited);
    setSentTo(target);
    setWait(COOLDOWN);
  }

  if (sentTo) {
    return (
      <AuthShell title={a.sentTitle}>
        <div className="grid justify-items-center gap-4 text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-brand-soft text-brand">
            <MailCheck className="size-8" aria-hidden />
          </span>
          <p className="text-muted">{a.sentBody}</p>
          <p className="text-lg font-bold">{maskEmail(sentTo)}</p>
          <p className="text-sm text-muted">{a.sentHint}</p>
          <FormError>{error}</FormError>
          <Button variant="secondary" block disabled={wait > 0 || busy} onClick={() => send(sentTo)}>
            {wait > 0 ? `${a.resendIn} ${formatNumber(wait, locale)}s` : a.resend}
          </Button>
          <div className="flex w-full justify-between text-sm">
            <button type="button" className="font-bold text-primary hover:underline" onClick={() => setSentTo(null)}>
              {a.wrongEmail}
            </button>
            <Link to={href("/login")} className="font-bold text-primary hover:underline">
              {a.backToLogin}
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={a.forgotTitle}
      subtitle={a.forgotSubtitle}
      footer={
        <Link to={href("/login")} className="font-bold text-primary hover:underline">
          {a.backToLogin}
        </Link>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(email.trim());
        }}
      >
        <TextField label={a.email} type="email" inputMode="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" block disabled={busy || !email.includes("@")}>
          <Send aria-hidden />
          {busy ? a.sending : a.sendLink}
        </Button>
      </form>
    </AuthShell>
  );
}
