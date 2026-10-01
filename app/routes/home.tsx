import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { Button } from "~/components/ui/button";
import { Logo } from "~/components/site/brand";

// Temporary home while the public site is built (Phase 3). No numbers or claims until they come from the DB.
export const meta = () => [{ title: "TSC — বিশ্বাস | সাফল্য | যত্ন" }, { name: "robots", content: "noindex" }];

export default function Home() {
  const { t, href } = useLocale();
  return (
    <section className="container-page grid min-h-[70dvh] place-items-center py-20 text-center">
      <div className="max-w-xl">
        <Logo size={88} className="mx-auto" />
        <p className="mt-8 text-sm font-bold tracking-wide text-brand">{t.meta.pillars}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">{t.styleguide.sampleHeading}</h1>
        <p className="mt-4 text-lg text-muted">{t.meta.tagline}</p>
        <Button asChild size="lg" className="mt-10">
          <Link to={href("/dev/styleguide")}>{t.styleguide.title}</Link>
        </Button>
      </div>
    </section>
  );
}
