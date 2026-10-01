/**
 * Teacher trust score, 0–100 (business rule, code.md §7). The same formula runs in SQL for sorting.
 *   rating        30  (average rating / 5)
 *   completion    25  (completion rate %)
 *   reviews       20  (capped at 50 reviews)
 *   students      15  (capped at 20 students)
 *   verification  10  (verified 7 + TSC certified 3)
 * Grade A ≥ 80, B ≥ 60, otherwise C.
 */
export interface TrustInput {
  averageRating: number;
  completionRate: number; // percent
  totalReviews: number;
  totalStudents: number;
  isVerified: boolean;
  isCertified: boolean;
}

export type TrustGrade = "A" | "B" | "C";

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const oneDp = (x: number) => Math.round(x * 10) / 10;

export function trustScore(i: TrustInput) {
  const rating = clamp01(i.averageRating / 5) * 30;
  const completion = clamp01(i.completionRate / 100) * 25;
  const reviews = clamp01(i.totalReviews / 50) * 20;
  const students = clamp01(i.totalStudents / 20) * 15;
  const verification = (i.isVerified ? 7 : 0) + (i.isCertified ? 3 : 0);
  const total = Math.round(rating + completion + reviews + students + verification);
  const grade: TrustGrade = total >= 80 ? "A" : total >= 60 ? "B" : "C";
  return {
    rating: oneDp(rating),
    completion: oneDp(completion),
    reviews: oneDp(reviews),
    students: oneDp(students),
    verification,
    total,
    grade,
  };
}
