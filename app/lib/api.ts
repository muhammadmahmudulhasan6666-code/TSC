// Public, read-only API (SECURITY DEFINER RPCs). Plain fetch so it also runs at build time
// (pre-rendering) where there is no browser session.
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase";

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface HomeStats {
  verified_teachers: number;
  students: number;
  districts: number;
  institutions: number;
  subjects: number;
  top_institutions: { code: string; n: number }[];
}

export interface TeacherCard {
  tsc_id: string;
  full_name: string | null;
  gender: string | null;
  photo_url: string | null;
  university_name: string | null;
  institution: string | null;
  department: string | null;
  academic_year: string | null;
  experience_years: number | null;
  subjects: string[];
  district: string | null;
  thana: string | null;
  mode: "online" | "offline" | "both" | null;
  hourly_rate_online: number | null;
  monthly_rate_inperson: number | null;
  rate_negotiable: boolean;
  is_tsc_certified: boolean;
  is_online_certified: boolean;
  is_featured: boolean;
  average_rating: number;
  total_reviews: number;
  trust_score: number;
}

export interface TeacherProfile extends TeacherCard {
  teaching_level: string | null;
  bio_summary: string | null;
  total_students_taught: number;
  created_at: string;
}

export interface TeacherFilters {
  districts: string[];
  subjects: string[];
  institutions: { code: string; name_en: string; name_bn: string }[];
}

export interface TeacherQuery {
  q?: string;
  district?: string;
  subject?: string;
  mode?: string;
  gender?: string;
  institution?: string;
  maxMonthly?: number;
  sort?: "recommended" | "rating" | "price" | "newest";
  limit?: number;
  offset?: number;
}

export const getHomeStats = () => rpc<HomeStats>("get_home_stats");
export const getTeacherFilters = () => rpc<TeacherFilters>("get_teacher_filters");
export const getPublicTeacher = (tscId: string) => rpc<TeacherProfile | null>("get_public_teacher", { _tsc_id: tscId });
export const listPublicTeacherIds = () => rpc<string[]>("list_public_teacher_ids");

export const searchTeachers = (q: TeacherQuery = {}) =>
  rpc<{ total: number; items: TeacherCard[] }>("search_teachers", {
    _q: q.q || null,
    _district: q.district || null,
    _subject: q.subject || null,
    _mode: q.mode || null,
    _gender: q.gender || null,
    _institution: q.institution || null,
    _max_monthly: q.maxMonthly ?? null,
    _sort: q.sort ?? "recommended",
    _limit: q.limit ?? 24,
    _offset: q.offset ?? 0,
  });
