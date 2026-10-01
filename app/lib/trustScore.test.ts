import { describe, expect, it } from "vitest";
import { trustScore } from "./trustScore";

const base = { averageRating: 0, completionRate: 0, totalReviews: 0, totalStudents: 0, isVerified: false, isCertified: false };

describe("trustScore", () => {
  it("is 0 / C for a brand-new unverified teacher", () => {
    expect(trustScore(base)).toMatchObject({ total: 0, grade: "C" });
  });

  it("gives 7 for verified and 3 more for certified", () => {
    expect(trustScore({ ...base, isVerified: true }).total).toBe(7);
    expect(trustScore({ ...base, isVerified: true, isCertified: true }).total).toBe(10);
  });

  it("reaches 100 / A at the caps", () => {
    const s = trustScore({ averageRating: 5, completionRate: 100, totalReviews: 50, totalStudents: 20, isVerified: true, isCertified: true });
    expect(s).toMatchObject({ rating: 30, completion: 25, reviews: 20, students: 15, verification: 10, total: 100, grade: "A" });
  });

  it("caps reviews and students instead of overflowing", () => {
    const s = trustScore({ ...base, totalReviews: 500, totalStudents: 300 });
    expect(s.reviews).toBe(20);
    expect(s.students).toBe(15);
  });

  it("clamps out-of-range and non-finite input", () => {
    const s = trustScore({ ...base, averageRating: 9, completionRate: -20, totalReviews: Number.NaN });
    expect(s).toMatchObject({ rating: 30, completion: 0, reviews: 0 });
  });

  it("grades at the 60 and 80 boundaries", () => {
    // 4.5/5 → 27, 80% → 20, 10 reviews → 4, 4 students → 3, verified → 7 = 61
    expect(trustScore({ averageRating: 4.5, completionRate: 80, totalReviews: 10, totalStudents: 4, isVerified: true, isCertified: false })).toMatchObject({ total: 61, grade: "B" });
    // + certified 3, + 16 students → 15 instead of 3: 61 + 3 + 12 = 76 → still B
    expect(trustScore({ averageRating: 4.5, completionRate: 80, totalReviews: 10, totalStudents: 16, isVerified: true, isCertified: true }).grade).toBe("B");
    expect(trustScore({ averageRating: 5, completionRate: 90, totalReviews: 25, totalStudents: 10, isVerified: true, isCertified: true })).toMatchObject({ total: 80, grade: "A" });
  });
});
