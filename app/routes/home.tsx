import { Hero } from "~/components/home/hero";

// The real home page is built in Phase 3; for now it shows the new hero. No numbers or claims until they come from the DB.
export const meta = () => [{ title: "TSC — Trust · Success · Care" }, { name: "robots", content: "noindex" }];

export default function Home() {
  return <Hero />;
}
