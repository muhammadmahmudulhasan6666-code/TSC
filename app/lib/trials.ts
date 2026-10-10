// Trials (free), reviews, match outcomes and saved teachers. See migration 1400.
import { SUPABASE_KEY, SUPABASE_URL, supabase } from "./supabase";
import type { TeacherProfile } from "./api";
import type { PersonCard } from "./money";

export type TrialStatus = "requested" | "accepted" | "rejected" | "cancelled" | "expired" | "awaiting_confirmation" | "completed" | "no_show" | "disputed";
export type TrialAnswer = "happened" | "no_show" | "problem";

export interface Trial {
  id: string;
  code: string;
  status: TrialStatus;
  subject: string;
  level: string | null;
  topic: string | null;
  mode: "online" | "offline";
  scheduled_at: string;
  duration_min: number;
  note: string | null;
  reject_reason: string | null;
  my_role: "student" | "teacher";
  my_answer: TrialAnswer | null;
  person: PersonCard;
  reviewed: boolean;
}

export interface NewTrial {
  subject: string;
  level?: string;
  topic?: string;
  mode: "online" | "offline";
  scheduled_at: string;
  duration_min: number;
  note?: string;
}

export interface NewReview {
  rating: number;
  teaching?: number;
  communication?: number;
  punctuality?: number;
  tags: string[];
  comment?: string;
}

export interface PublicReview extends NewReview {
  id: string;
  created_at: string;
  after_trial: boolean;
  reviewer_name: string;
  reviewer_class: string | null;
}

export interface AdminReview extends NewReview {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewer: PersonCard;
  teacher: PersonCard;
  trial_status: TrialStatus | null;
}

export interface AdminTrial extends Omit<Trial, "my_role" | "my_answer" | "person" | "reviewed"> {
  student: PersonCard;
  teacher: PersonCard;
  student_says: TrialAnswer | null;
  teacher_says: TrialAnswer | null;
  problem_note: string | null;
}

export interface AdminOutcome {
  id: string;
  student: PersonCard;
  teacher: PersonCard;
  student_answer: string | null;
  teacher_answer: string | null;
  final_status: string;
  updated_at: string;
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const requestTrial = (tscId: string, p: NewTrial) => call<{ id: string; code: string }>("request_trial", { _teacher_tsc: tscId, _p: p });
export const respondTrial = (id: string, accept: boolean, reason?: string) => call<void>("respond_trial", { _trial: id, _accept: accept, _reason: reason || null });
export const cancelTrial = (id: string, reason?: string) => call<void>("cancel_trial", { _trial: id, _reason: reason || null });
export const confirmTrial = (id: string, answer: TrialAnswer, note?: string) => call<TrialStatus>("confirm_trial", { _trial: id, _answer: answer, _note: note || null });
export const myTrials = () => call<Trial[]>("my_trials");

export const submitReview = (tscId: string, p: NewReview) => call<string>("submit_review", { _teacher_tsc: tscId, _p: p });
export const myReviewFor = (tscId: string) => call<{ eligible: boolean; review: (NewReview & { status: string }) | null } | null>("my_review_for", { _teacher_tsc: tscId });

/** Public: approved reviews (plain fetch so it also works logged out). */
export async function getTeacherReviews(tscId: string): Promise<PublicReview[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_teacher_reviews`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ _tsc_id: tscId }),
  });
  if (!res.ok) return [];
  return res.json();
}

export const pendingOutcomes = () => call<{ person: PersonCard; my_role: "student" | "teacher" }[]>("pending_outcomes");
export const answerOutcome = (tscId: string, answer: "matched" | "talking" | "not_matched") => call<string>("answer_outcome", { _other_tsc: tscId, _answer: answer });

export const toggleSaved = (tscId: string) => call<boolean>("toggle_saved_teacher", { _tsc_id: tscId });
export const mySavedTeachers = () => call<TeacherProfile[]>("my_saved_teachers");
export const mySavedIds = () => call<string[]>("my_saved_ids");

export const adminListReviews = (status: string) => call<AdminReview[] | null>("admin_list_reviews", { _status: status });
export const adminReviewReview = (id: string, approve: boolean, reason?: string) => call<void>("admin_review_review", { _review: id, _approve: approve, _reason: reason || null });
export const adminListTrials = (status: string) => call<AdminTrial[] | null>("admin_list_trials", { _status: status });
export const adminResolveTrial = (id: string, status: "completed" | "no_show" | "cancelled", note?: string) =>
  call<void>("admin_resolve_trial", { _trial: id, _status: status, _note: note || null });
export const adminListOutcomes = (status: string) => call<AdminOutcome[] | null>("admin_list_outcomes", { _status: status });
export const adminResolveOutcome = (id: string, final: "matched" | "not_matched", note?: string) => call<void>("admin_resolve_outcome", { _id: id, _final: final, _note: note || null });

/** TS error codes for trial/review RPCs → dictionary keys. */
export function trialErrorKey(err: { code?: string } | null) {
  return ({ TS409: "needConnection", TS422: "errTime", TS429: "errOpen", TS403: "notEligible" } as const)[err?.code as "TS409"] ?? null;
}
