// Detects attempts to share contact details in free text (ADR 0001 "Free text").
// Mirrors private.find_contact() in SQL — the server re-checks, the client only gives instant feedback.

export type ContactHit = "phone" | "email" | "link" | "handle" | "platform";

const BN_DIGITS: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };

// Spelled-out digits (Bangla + English, common spellings) → digits.
const WORD_DIGITS: [RegExp, string][] = [
  [/শূন্য|শুন্য|জিরো|zero|\bnil\b|\boh\b/gi, "0"],
  [/এক|ওয়ান|\bone\b/gi, "1"],
  [/দুই|দুয়|টু|\btwo\b/gi, "2"],
  [/তিন|থ্রি|\bthree\b/gi, "3"],
  [/চার|ফোর|\bfour\b/gi, "4"],
  [/পাঁচ|পাচ|ফাইভ|\bfive\b/gi, "5"],
  [/ছয়|ছয়|ছয়|সিক্স|\bsix\b/gi, "6"],
  [/সাত|সেভেন|\bseven\b/gi, "7"],
  [/আট|এইট|\beight\b/gi, "8"],
  [/নয়|নয়|নাইন|\bnine\b/gi, "9"],
];

const PLATFORMS =
  /whats\s*app|watsapp|\bwa\.me|\bimo\b|telegram|\btg\b|messenger|viber|facebook|\bfb\b|fb\.com|instagram|\binsta\b|gmail|yahoo|hotmail|outlook|হোয়াটস|হোয়াটস|হোয়াটস|ইমু|টেলিগ্রাম|মেসেঞ্জার|ফেসবুক|ইনস্টা|জিমেইল|ইমেইল|ইমেল/i;

/** Returns what kind of contact detail the text seems to contain, or null if it's clean. */
export function findContact(raw: string): ContactHit | null {
  if (!raw) return null;
  const text = raw.normalize("NFC");
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text) || /\bat\s*the\s*rate\b|\(at\)|\[at\]/i.test(text)) return "email";
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|bd|me|io|xyz|info)\b/i.test(text)) return "link";
  if (/(^|\s)@[a-z0-9_.]{3,}/i.test(text)) return "handle";
  if (PLATFORMS.test(text)) return "platform";

  // Phone numbers: normalise digits and number-words, then drop separators between digits.
  let s = text.replace(/[০-৯]/g, (d) => BN_DIGITS[d]);
  for (const [re, d] of WORD_DIGITS) s = s.replace(re, d);
  s = s.replace(/(?<=\d)[\s.\-_/\\|,:;()+*'"`~]+(?=\d)/g, "");
  if (/\d{7,}/.test(s)) return "phone";
  return null;
}
