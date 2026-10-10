// Tuition posts API. The public board works without login (anon RPC); everything else needs a session.
import { SUPABASE_KEY, SUPABASE_URL, supabase } from "./supabase";

export type PostStatus = "pending_review" | "open" | "filled" | "closed" | "rejected" | "expired";

export interface TuitionPost {
  id: string;
  code: string;
  curriculum: string;
  board: string | null;
  level: string;
  group_stream: string | null;
  subjects: string[];
  student_gender: string | null;
  mode: "online" | "offline" | "both";
  district: string | null;
  thana: string | null;
  days: string[];
  time_slot: string | null;
  days_per_week: number | null;
  budget_min: number | null;
  budget_max: number | null;
  negotiable: boolean;
  teacher_gender: "any" | "male" | "female";
  preferred_institutions: string[];
  min_experience: number | null;
  note: string | null;
  hand_raise_count: number;
  created_at: string;
  author_tsc_id: string | null;
  i_raised: boolean;
}

export interface MyPost {
  id: string;
  code: string;
  status: PostStatus;
  level: string;
  curriculum: string;
  subjects: string[];
  mode: string;
  district: string | null;
  thana: string | null;
  budget_min: number | null;
  budget_max: number | null;
  negotiable: boolean;
  hand_raise_count: number;
  created_at: string;
  expires_at: string;
  moderation_reason: string | null;
  interested: { tsc_id: string; full_name: string | null; photo_url: string | null; line: string | null; raised_at: string }[];
}

export interface NewPost {
  curriculum: string;
  board?: string;
  level: string;
  group_stream?: string;
  subjects: string[];
  student_gender?: string;
  mode: "online" | "offline" | "both";
  district?: string;
  thana?: string;
  days: string[];
  time_slot?: string;
  days_per_week?: number;
  budget_min?: number;
  budget_max?: number;
  negotiable: boolean;
  teacher_gender: "any" | "male" | "female";
  preferred_institutions: string[];
  min_experience?: number;
  note?: string;
}

/** Board query runs as the logged-in user when there is one (so `i_raised` is filled), else anonymously. */
export async function listTuitionPosts(f: { district?: string; subject?: string; curriculum?: string; limit?: number; offset?: number } = {}) {
  const args = { _district: f.district || null, _subject: f.subject || null, _curriculum: f.curriculum || null, _mode: null, _limit: f.limit ?? 24, _offset: f.offset ?? 0 };
  if (typeof window !== "undefined") {
    const { data, error } = await supabase().rpc("list_tuition_posts", args);
    if (error) throw error;
    return data as { total: number; items: TuitionPost[] };
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_tuition_posts`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  return (await res.json()) as { total: number; items: TuitionPost[] };
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const createTuitionPost = (p: NewPost) => call<{ id: string; code: string; status: PostStatus; flagged: string | null }>("create_tuition_post", { _p: p });
export const raiseHand = (postId: string) => call<number>("raise_hand", { _post: postId });
export const myTuitionPosts = () => call<MyPost[]>("my_tuition_posts");
export const closeTuitionPost = (postId: string, filled: boolean) => call<void>("close_tuition_post", { _post: postId, _filled: filled });
