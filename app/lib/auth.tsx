import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { localeFromPath, localizePath } from "~/i18n";
import { supabase } from "./supabase";

export type Role = "student" | "teacher" | "admin" | "super_admin";

export interface Me {
  userId: string;
  email: string;
  roles: Role[];
  primaryRole: Role;
  fullName: string | null;
  tscId: string | null;
  photoUrl: string | null;
  /** Account came over from the old (Lovable) TSC. */
  isLegacy: boolean;
}

// Every account created before the import is a migrated one.
const IMPORT_CUTOFF = Date.parse("2026-10-01T12:00:00Z");

interface AuthState {
  ready: boolean; // false until the stored session has been read
  session: Session | null;
  me: Me | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ ready: false, session: null, me: null, refresh: async () => {}, signOut: async () => {} });

const rank: Record<Role, number> = { super_admin: 4, admin: 3, teacher: 2, student: 1 };

async function loadMe(session: Session): Promise<Me> {
  const sb = supabase();
  const uid = session.user.id;
  const [{ data: roleRows }, { data: t }, { data: s }] = await Promise.all([
    sb.from("user_roles").select("role").eq("user_id", uid),
    sb.from("teacher_profiles").select("full_name, tsc_id, profile_photo_url").eq("user_id", uid).maybeSingle(),
    sb.from("student_profiles").select("full_name, tsc_id, profile_photo_url").eq("user_id", uid).maybeSingle(),
  ]);
  const roles = ((roleRows ?? []).map((r) => r.role) as Role[]).sort((a, b) => rank[b] - rank[a]);
  const profile = t ?? s;
  return {
    userId: uid,
    email: session.user.email ?? "",
    roles,
    primaryRole: roles[0] ?? "student",
    fullName: profile?.full_name ?? (session.user.user_metadata?.full_name as string | undefined) ?? null,
    tscId: profile?.tsc_id ?? null,
    photoUrl: profile?.profile_photo_url ?? null,
    isLegacy: Date.parse(session.user.created_at) < IMPORT_CUTOFF,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const sync = useCallback(async (s: Session | null) => {
    setSession(s);
    setMe(s ? await loadMe(s).catch(() => null) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => sync(data.session));
    // Defer profile loading out of the auth callback (supabase-js warns against awaiting inside it).
    const { data } = sb.auth.onAuthStateChange((_event, s) => setTimeout(() => sync(s), 0));
    return () => data.subscription.unsubscribe();
  }, [sync]);

  const value: AuthState = {
    ready,
    session,
    me,
    refresh: async () => sync((await supabase().auth.getSession()).data.session),
    signOut: async () => {
      await supabase().auth.signOut();
      await sync(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Maps Supabase auth errors to a dictionary key. */
export function authErrorKey(err: { code?: string; message?: string; status?: number } | null) {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login")) return "invalidCredentials" as const;
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) return "emailTaken" as const;
  if (code === "weak_password" || msg.includes("password should")) return "weakPassword" as const;
  if (err?.status === 429 || code.includes("rate_limit")) return "rateLimited" as const;
  return "genericError" as const;
}

/** 0–4 strength score: length, character variety. */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) score++;
  if (/[^a-z0-9]/i.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) score++;
  return Math.min(4, pw.length < 8 ? Math.min(score, 1) : score);
}

/** For app pages: once the session is known, send logged-out visitors to log in and back here afterwards. */
export function useRequireAuth() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (auth.ready && !auth.me) {
      navigate(`${localizePath("/login", localeFromPath(pathname))}?next=${encodeURIComponent(pathname + search)}`, { replace: true });
    }
  }, [auth.ready, auth.me, navigate, pathname, search]);
  return auth;
}

export const isAdminRole = (me: Me | null) => !!me?.roles.some((r) => r === "admin" || r === "super_admin");
