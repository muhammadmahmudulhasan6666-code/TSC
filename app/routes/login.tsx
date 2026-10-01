import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useLocale } from "~/i18n";
import { authErrorKey, useAuth } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import { Button } from "~/components/ui/button";
import { AuthShell, Divider, FormError, GoogleIcon, PasswordField, TextField } from "~/components/auth/parts";

export const meta = () => [{ title: "Log in — TSC" }, { name: "robots", content: "noindex" }];

const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_AUTH === "on";

export default function Login() {
  const { t, href } = useLocale();
  const a = t.auth;
  const { me, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in (or just logged in): go where they were headed.
  useEffect(() => {
    if (me) navigate(next && next.startsWith("/") ? next : href("/dashboard"), { replace: true });
  }, [me, next, navigate, href]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      return setError(a[authErrorKey(err)] ?? a.genericError);
    }
    // Load the profile now instead of waiting on the auth event, so the redirect below fires reliably.
    await refresh();
    setBusy(false);
  }

  async function google() {
    await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + href("/dashboard") } });
  }

  return (
    <AuthShell
      title={a.loginTitle}
      subtitle={a.loginSubtitle}
      footer={
        <>
          {a.noAccount}{" "}
          <Link to={href("/register")} className="font-bold text-primary hover:underline">
            {a.createAccount}
          </Link>
        </>
      }
    >
      {GOOGLE_ENABLED && (
        <>
          <Button type="button" variant="secondary" block onClick={google}>
            <GoogleIcon />
            {a.google}
          </Button>
          <Divider label={a.or} />
        </>
      )}
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <TextField label={a.email} type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <PasswordField label={a.password} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="-mt-1 text-right">
          <Link to={href("/forgot-password") + (email ? `?email=${encodeURIComponent(email)}` : "")} className="text-sm font-bold text-primary hover:underline">
            {a.forgot}
          </Link>
        </div>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" block disabled={busy || !email || !password}>
          <LogIn aria-hidden />
          {busy ? a.loggingIn : a.loginCta}
        </Button>
      </form>
    </AuthShell>
  );
}
