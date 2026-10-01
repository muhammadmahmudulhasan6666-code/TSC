import { BookOpen, Check, GraduationCap, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useLocale } from "~/i18n";
import { authErrorKey, passwordStrength, useAuth } from "~/lib/auth";
import { supabase } from "~/lib/supabase";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { AuthShell, FormError, PasswordField, TextField } from "~/components/auth/parts";

export const meta = () => [{ title: "Sign up — TSC" }, { name: "robots", content: "noindex" }];

type Role = "student" | "teacher";

export default function Register() {
  const { t, href } = useLocale();
  const a = t.auth;
  const { me } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<Role>(params.get("role") === "teacher" ? "teacher" : "student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me) navigate(href("/dashboard"), { replace: true });
  }, [me, navigate, href]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError(a.nameRequired);
    if (password.length < 8 || passwordStrength(password) < 2) return setError(a.weakPassword);
    if (!agree) return setError(a.termsRequired);
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role, full_name: name.trim() }, emailRedirectTo: window.location.origin + href("/dashboard") },
    });
    setBusy(false);
    // Supabase returns a user with no identities when the email is already registered.
    if (!err && data.user && data.user.identities?.length === 0) return setError(a.emailTaken);
    if (err) setError(a[authErrorKey(err)] ?? a.genericError);
  }

  const roles: { id: Role; label: string; hint: string; icon: typeof BookOpen }[] = [
    { id: "student", label: a.roleStudent, hint: a.roleStudentHint, icon: BookOpen },
    { id: "teacher", label: a.roleTeacher, hint: a.roleTeacherHint, icon: GraduationCap },
  ];

  return (
    <AuthShell
      title={a.registerTitle}
      subtitle={a.registerSubtitle}
      footer={
        <>
          {a.haveAccount}{" "}
          <Link to={href("/login")} className="font-bold text-primary hover:underline">
            {a.loginCta}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-bold">{a.iAm}</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ id, label, hint, icon: Icon }) => {
              const active = role === id;
              return (
                <label
                  key={id}
                  className={cn(
                    "relative cursor-pointer rounded-[18px] border p-3.5 transition-all duration-300",
                    active ? "border-primary bg-primary/6 shadow-[var(--glow-primary)]" : "border-border-strong bg-surface/60 hover:border-primary/40",
                  )}
                >
                  <input type="radio" name="role" value={id} checked={active} onChange={() => setRole(id)} className="sr-only" />
                  <span className={cn("grid size-9 place-items-center rounded-xl", active ? "bg-[image:var(--grad-primary)] text-white" : "bg-text/6 text-muted")}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="mt-2 block font-bold leading-tight">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                  {active && (
                    <span className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-primary text-white">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
        <TextField label={a.fullName} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={a.fullNamePlaceholder} />
        <TextField label={a.email} type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <PasswordField label={a.password} autoComplete="new-password" required showMeter hint={a.passwordRule} value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
          <span className="text-muted">{a.terms}</span>
        </label>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" block disabled={busy || !email || !password}>
          <UserPlus aria-hidden />
          {busy ? a.registering : a.registerCta}
        </Button>
      </form>
    </AuthShell>
  );
}
