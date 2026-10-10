import { describe, expect, it } from "vitest";
import { findContact } from "./contact-guard";

describe("findContact", () => {
  it.each([
    ["call 01712345678", "phone"],
    ["০১৭১২৩৪৫৬৭৮ এ ফোন দিন", "phone"],
    ["017-1234-5678", "phone"],
    ["0 1 7 1 2 3 4 5 6 7 8", "phone"],
    ["017.12.34.56.78", "phone"],
    ["zero one seven one two three four five", "phone"],
    ["শূন্য এক সাত এক দুই তিন চার", "phone"],
    ["+8801712345678", "phone"],
    ["mail me abc@gmail.com", "email"],
    ["abc at the rate gmail", "email"],
    ["see www.example.com", "link"],
    ["https://fb.com/someone", "link"],
    ["insta @tutor.mahmud", "handle"],
    ["WhatsApp করুন", "platform"],
    ["ইমুতে নক দিন", "platform"],
    ["fb te knock", "platform"],
  ])("flags %s", (text, kind) => {
    expect(findContact(text)).toBe(kind);
  });

  it.each([
    "Class 8, সপ্তাহে ৩ দিন, বিকালে পড়াতে হবে",
    "Budget 5000 taka, negotiable",
    "HSC 2026 candidate, weak in Physics",
    "মেয়ে শিক্ষক হলে ভালো হয়, ১০ বছরের অভিজ্ঞতা লাগবে না",
    "Need help with chapter 1 to 5",
    "",
  ])("allows %s", (text) => {
    expect(findContact(text)).toBeNull();
  });
});
