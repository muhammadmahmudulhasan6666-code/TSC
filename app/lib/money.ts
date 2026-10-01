// Authenticated money RPCs (payments, contact unlocks, admin review). Prices and state live in the DB.
import { supabase } from "./supabase";

export type PaymentStatus = "pending" | "approved" | "rejected" | "refund_due" | "refunded" | "cancelled";
export type UnlockStatus = "awaiting_payment" | "payment_review" | "pending_teacher" | "accepted" | "rejected" | "expired" | "cancelled";

export interface PaymentRequest {
  id: string;
  service_code: string;
  name_bn: string;
  name_en: string;
  list_price_bdt: number;
  discount_bdt: number;
  amount_bdt: number;
  reference_code: string;
  status: PaymentStatus;
  trx_id: string | null;
  sender_number: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  ref_table: string | null;
  ref_id: string | null;
  bkash: { number: string | null; type: string | null } | null;
}

export interface MyUnlock {
  id: string;
  status: UnlockStatus;
  created_at: string;
  expires_at: string | null;
  payment_request_id: string | null;
  payment_status: PaymentStatus | null;
  amount_bdt: number | null;
  tsc_id: string;
  full_name: string | null;
  photo_url: string | null;
  university_name: string | null;
  department: string | null;
  phone: string | null;
}

export interface IncomingRequest {
  id: string;
  status: UnlockStatus;
  created_at: string;
  expires_at: string | null;
  tsc_id: string | null;
  full_name: string | null;
  current_class: string | null;
  curriculum: string | null;
  district: string | null;
  thana: string | null;
  subjects: string[] | null;
  phone: string | null;
  guardian_name: string | null;
}

export interface AdminPayment extends Omit<PaymentRequest, "bkash"> {
  email: string;
  full_name: string | null;
  tsc_id: string | null;
}

/** TSC SQLSTATEs (see migration 0950) → dictionary keys. */
export function moneyErrorKey(err: { code?: string; message?: string } | null) {
  switch (err?.code) {
    case "TS422":
      return "errInvalidTrx" as const;
    case "TS423":
      return "errInvalidSender" as const;
    case "TS409":
      return "errDuplicateTrx" as const;
    case "TS429":
      return "limit" as const;
    case "TS403":
      return "teachersCannot" as const;
    case "TS401":
      return "loginFirst" as const;
    default:
      return null;
  }
}

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const requestContactUnlock = (tscId: string, voucher?: string) =>
  call<{ unlock_id: string; status: UnlockStatus; payment_request_id: string }>("request_contact_unlock", { _tsc_id: tscId, _voucher: voucher ?? null });
export const getPaymentRequest = (id: string) => call<PaymentRequest | null>("get_payment_request", { _id: id });
export const submitPaymentProof = (id: string, sender: string, trx: string) => call<void>("submit_payment_proof", { _request: id, _sender: sender, _trx: trx });
export const renewUnlockPayment = (unlockId: string) => call<string>("renew_unlock_payment", { _unlock: unlockId });
export const myUnlocks = () => call<MyUnlock[]>("my_unlocks");
export const teacherUnlockRequests = () => call<IncomingRequest[]>("teacher_unlock_requests");
export const respondContactUnlock = (id: string, accept: boolean) => call<void>("respond_contact_unlock", { _unlock: id, _accept: accept });
export const adminListPayments = (status: string) => call<AdminPayment[]>("admin_list_payments", { _status: status });
export const adminPaymentCounts = () => call<{ pending_with_proof: number; pending_no_proof: number; refund_due: number }>("admin_payment_counts");
export const adminReviewPayment = (id: string, approve: boolean, note?: string) =>
  call<void>("admin_review_payment", { _request: id, _approve: approve, _note: note ?? null });
export const adminMarkRefunded = (id: string, note?: string) => call<void>("admin_mark_refunded", { _request: id, _note: note ?? null });

/** "01712345678" → WhatsApp link with the Bangladesh country code. */
export const whatsappLink = (phone: string) => `https://wa.me/88${phone.replace(/\D/g, "").replace(/^88/, "")}`;
