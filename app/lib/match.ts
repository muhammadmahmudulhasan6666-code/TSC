// Smart Match (৳250): requirement → bKash → admin assigns 1 teacher (+1 replacement). See migration 1200.
import type { Requirement } from "~/components/posts/requirement-steps";
import type { PaymentStatus, PersonCard } from "./money";
import { supabase } from "./supabase";

export type MatchStatus = "awaiting_payment" | "payment_review" | "searching" | "proposed" | "replacement_requested" | "completed" | "unfulfilled" | "cancelled";

export interface NewMatch extends Requirement {
  goals: string[];
  learning_styles: string[];
  teacher_qualities: string[];
  trial_topic?: string;
}

export interface MyMatch {
  id: string;
  code: string;
  status: MatchStatus;
  level: string;
  curriculum: string;
  subjects: string[];
  district: string | null;
  created_at: string;
  assigned_at: string | null;
  payment_request_id: string | null;
  payment_status: PaymentStatus | null;
  replacement_used: boolean;
  teacher: PersonCard | null;
  teacher_phone: string | null;
}

export interface TeacherMatch {
  id: string;
  code: string;
  status: MatchStatus;
  level: string;
  curriculum: string;
  subjects: string[];
  mode: string;
  district: string | null;
  thana: string | null;
  days: string[];
  time_slot: string | null;
  budget_min: number | null;
  budget_max: number | null;
  goals: string[];
  learning_styles: string[];
  trial_topic: string | null;
  note: string | null;
  assigned_at: string;
  student: PersonCard;
  phone: string | null;
}

export interface AdminMatch extends Omit<NewMatch, "mode"> {
  id: string;
  code: string;
  status: MatchStatus;
  mode_text: string;
  email: string;
  created_at: string;
  replacement_reason: string | null;
  admin_note: string | null;
  requester: PersonCard;
  t1: PersonCard | null;
  t2: PersonCard | null;
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const createSmartMatch = (p: NewMatch, voucher?: string | null) =>
  call<{ id: string; code: string; payment_request_id: string; amount_bdt: number }>("create_smart_match", { _p: p, _voucher: voucher ?? null });
export const renewMatchPayment = (id: string) => call<string>("renew_match_payment", { _match: id });
export const myMatches = () => call<MyMatch[]>("my_matches");
export const teacherMatches = () => call<TeacherMatch[]>("teacher_matches");
export const requestReplacement = (id: string, reason?: string) => call<void>("request_match_replacement", { _match: id, _reason: reason || null });
export const completeMatch = (id: string) => call<void>("complete_match", { _match: id });
export const adminListMatches = (status: string) => call<AdminMatch[]>("admin_list_matches", { _status: status });
export const adminAssignMatch = (id: string, tscId: string, note?: string) => call<void>("admin_assign_match", { _match: id, _teacher_tsc: tscId, _note: note || null });
export const adminUnfulfillMatch = (id: string, note?: string) => call<void>("admin_unfulfill_match", { _match: id, _note: note || null });

/** The signed-in user's unused legacy voucher (first service only), if any. */
export async function myVoucher(userId: string) {
  const { data } = await supabase().from("vouchers").select("id, amount_bdt").eq("user_id", userId).is("redeemed_at", null).limit(1).maybeSingle();
  return data as { id: string; amount_bdt: number } | null;
}
