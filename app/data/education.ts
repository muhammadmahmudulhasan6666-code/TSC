// Education taxonomy for forms (ADR 0001 "Curriculum taxonomy"). Codes are stored in the DB;
// labels are shown in the user's language. Keep codes stable — they appear in saved posts.
type L = { bn: string; en: string };

export type Curriculum = "bangla_version" | "english_version" | "english_medium" | "madrasah" | "technical" | "admission";

export const CURRICULA: (L & { code: Curriculum; hint: L })[] = [
  { code: "bangla_version", bn: "বাংলা ভার্সন", en: "Bangla Version", hint: { bn: "জাতীয় কারিকুলাম (SSC/HSC)", en: "National curriculum (SSC/HSC)" } },
  { code: "english_version", bn: "English Version", en: "English Version", hint: { bn: "জাতীয় কারিকুলাম, ইংরেজিতে", en: "National curriculum in English" } },
  { code: "english_medium", bn: "English Medium", en: "English Medium", hint: { bn: "Edexcel / Cambridge", en: "Edexcel / Cambridge" } },
  { code: "madrasah", bn: "মাদ্রাসা", en: "Madrasah", hint: { bn: "আলিয়া / কওমি", en: "Alia / Qawmi" } },
  { code: "technical", bn: "কারিগরি / Diploma", en: "Technical / Diploma", hint: { bn: "Polytechnic, SSC Vocational", en: "Polytechnic, SSC Vocational" } },
  { code: "admission", bn: "ভর্তি প্রস্তুতি", en: "Admission prep", hint: { bn: "University, Medical, Engineering", en: "University, Medical, Engineering" } },
];

export const BOARDS: Record<"english_medium" | "madrasah", (L & { code: string })[]> = {
  english_medium: [
    { code: "edexcel", bn: "Pearson Edexcel", en: "Pearson Edexcel" },
    { code: "cambridge", bn: "Cambridge", en: "Cambridge" },
  ],
  madrasah: [
    { code: "alia", bn: "আলিয়া", en: "Alia" },
    { code: "qawmi", bn: "কওমি", en: "Qawmi" },
  ],
};

const national: (L & { code: string })[] = [
  { code: "play", bn: "Play", en: "Play" },
  { code: "nursery", bn: "Nursery", en: "Nursery" },
  { code: "kg", bn: "KG", en: "KG" },
  ...Array.from({ length: 10 }, (_, i) => ({ code: `class_${i + 1}`, bn: `Class ${["১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯", "১০"][i]}`, en: `Class ${i + 1}` })),
  { code: "hsc_1", bn: "HSC ১ম বর্ষ", en: "HSC 1st year" },
  { code: "hsc_2", bn: "HSC ২য় বর্ষ", en: "HSC 2nd year" },
];

export const LEVELS: Record<Curriculum, (L & { code: string })[]> = {
  bangla_version: national,
  english_version: national,
  english_medium: [
    { code: "em_playgroup", bn: "Playgroup / Nursery", en: "Playgroup / Nursery" },
    { code: "em_primary", bn: "Primary (Grade 1–5)", en: "Primary (Grade 1–5)" },
    { code: "em_lower_secondary", bn: "Lower Secondary (Grade 6–8)", en: "Lower Secondary (Grade 6–8)" },
    { code: "o_level", bn: "O Level / IGCSE", en: "O Level / IGCSE" },
    { code: "as_level", bn: "AS Level", en: "AS Level" },
    { code: "a2_level", bn: "A2 Level", en: "A2 Level" },
  ],
  madrasah: [
    { code: "ebtedayee", bn: "ইবতেদায়ি (১–৫)", en: "Ebtedayee (1–5)" },
    { code: "madrasah_6_8", bn: "Class ৬–৮", en: "Class 6–8" },
    { code: "dakhil", bn: "দাখিল", en: "Dakhil" },
    { code: "alim", bn: "আলিম", en: "Alim" },
  ],
  technical: [
    { code: "ssc_vocational", bn: "SSC Vocational", en: "SSC Vocational" },
    { code: "diploma", bn: "Diploma", en: "Diploma" },
  ],
  admission: [
    { code: "adm_university", bn: "University ভর্তি", en: "University admission" },
    { code: "adm_engineering", bn: "Engineering ভর্তি", en: "Engineering admission" },
    { code: "adm_medical", bn: "Medical ভর্তি", en: "Medical admission" },
  ],
};

export const GROUPS: (L & { code: string })[] = [
  { code: "science", bn: "বিজ্ঞান", en: "Science" },
  { code: "commerce", bn: "ব্যবসায় শিক্ষা", en: "Business Studies" },
  { code: "humanities", bn: "মানবিক", en: "Humanities" },
];

/** Groups apply from Class 9 / Dakhil upwards. */
export const levelHasGroup = (level: string) => ["class_9", "class_10", "hsc_1", "hsc_2", "dakhil", "alim"].includes(level);

export const SUBJECTS: (L & { code: string })[] = [
  { code: "Mathematics", bn: "গণিত", en: "Mathematics" },
  { code: "Higher Mathematics", bn: "উচ্চতর গণিত", en: "Higher Mathematics" },
  { code: "Physics", bn: "পদার্থবিজ্ঞান", en: "Physics" },
  { code: "Chemistry", bn: "রসায়ন", en: "Chemistry" },
  { code: "Biology", bn: "জীববিজ্ঞান", en: "Biology" },
  { code: "English", bn: "ইংরেজি", en: "English" },
  { code: "Bangla", bn: "বাংলা", en: "Bangla" },
  { code: "ICT", bn: "ICT", en: "ICT" },
  { code: "General Science", bn: "সাধারণ বিজ্ঞান", en: "General Science" },
  { code: "Social Science", bn: "বাংলাদেশ ও বিশ্বপরিচয়", en: "Bangladesh & Global Studies" },
  { code: "Religion", bn: "ধর্ম", en: "Religion" },
  { code: "Accounting", bn: "হিসাববিজ্ঞান", en: "Accounting" },
  { code: "Finance", bn: "ফিন্যান্স", en: "Finance" },
  { code: "Business Entrepreneurship", bn: "ব্যবসায় উদ্যোগ", en: "Business Entrepreneurship" },
  { code: "Economics", bn: "অর্থনীতি", en: "Economics" },
  { code: "History", bn: "ইতিহাস", en: "History" },
  { code: "Geography", bn: "ভূগোল", en: "Geography" },
  { code: "Civics", bn: "পৌরনীতি", en: "Civics" },
  { code: "Arabic", bn: "আরবি", en: "Arabic" },
  { code: "Quran", bn: "কুরআন মাজিদ", en: "Qur'an" },
  { code: "Additional/Pure Math", bn: "Additional / Pure Maths", en: "Additional / Pure Maths" },
  { code: "Mechanics", bn: "Mechanics", en: "Mechanics" },
  { code: "Statistics", bn: "Statistics", en: "Statistics" },
  { code: "Computer Science", bn: "Computer Science", en: "Computer Science" },
  { code: "IELTS", bn: "IELTS", en: "IELTS" },
  { code: "Spoken English", bn: "Spoken English", en: "Spoken English" },
  { code: "All subjects", bn: "সব বিষয়", en: "All subjects" },
];

export const DAYS: (L & { code: string })[] = [
  { code: "sat", bn: "শনি", en: "Sat" },
  { code: "sun", bn: "রবি", en: "Sun" },
  { code: "mon", bn: "সোম", en: "Mon" },
  { code: "tue", bn: "মঙ্গল", en: "Tue" },
  { code: "wed", bn: "বুধ", en: "Wed" },
  { code: "thu", bn: "বৃহস্পতি", en: "Thu" },
  { code: "fri", bn: "শুক্র", en: "Fri" },
];

export const TIME_SLOTS: (L & { code: string })[] = [
  { code: "morning", bn: "সকাল (৭–১১)", en: "Morning (7–11)" },
  { code: "noon", bn: "দুপুর (১১–৩)", en: "Midday (11–3)" },
  { code: "afternoon", bn: "বিকাল (৩–৬)", en: "Afternoon (3–6)" },
  { code: "evening", bn: "সন্ধ্যা (৬–৯)", en: "Evening (6–9)" },
  { code: "night", bn: "রাত (৯–১১)", en: "Night (9–11)" },
];

export const BUDGETS = [2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];

export const label = (items: (L & { code: string })[], code: string, locale: "bn" | "en") => items.find((i) => i.code === code)?.[locale] ?? code;
export const levelLabel = (code: string, locale: "bn" | "en") => {
  for (const list of Object.values(LEVELS)) {
    const hit = list.find((l) => l.code === code);
    if (hit) return hit[locale];
  }
  return code;
};
