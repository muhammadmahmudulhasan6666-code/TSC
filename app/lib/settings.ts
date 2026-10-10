// Public platform settings (admin-editable rows in platform_settings where is_public), cached per page load.
import { useEffect, useState } from "react";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase";

export interface PublicSettings {
  contact: { email: string; whatsapp: string };
}

const FALLBACK: PublicSettings = { contact: { email: "tsc.mmh.bd@gmail.com", whatsapp: "8801861977995" } };
let cache: Promise<PublicSettings> | null = null;

export function loadPublicSettings(): Promise<PublicSettings> {
  cache ??= fetch(`${SUPABASE_URL}/rest/v1/platform_settings?select=key,value&is_public=eq.true`, { headers: { apikey: SUPABASE_KEY } })
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: { key: string; value: unknown }[]) => ({ ...FALLBACK, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }) as PublicSettings)
    .catch(() => FALLBACK);
  return cache;
}

export function usePublicSettings() {
  const [s, setS] = useState<PublicSettings>(FALLBACK);
  useEffect(() => {
    loadPublicSettings().then(setS);
  }, []);
  return s;
}

/** wa.me link to TSC admin with a prefilled, page-aware greeting. */
export const adminWhatsApp = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
