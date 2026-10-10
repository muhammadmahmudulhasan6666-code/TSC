import { Mail, MessageCircle } from "lucide-react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { adminWhatsApp, usePublicSettings } from "~/lib/settings";
import { BrandLink } from "./brand";

export function SiteFooter() {
  const { t, href } = useLocale();
  const s = t.site;
  const { contact } = usePublicSettings();
  const cols: [string, [string, string][]][] = [
    [
      s.explore,
      [
        ["/teachers", t.nav.findTeachers],
        ["/tuition-posts", t.nav.teacherNeeded],
        ["/smart-match", "Smart Match"],
        ["/mathsprint", "MathSprint"],
        ["/mynotes", "MyNotes"],
        ["/free-materials", "Free Materials"],
      ],
    ],
    [
      s.company,
      [
        ["/how-it-works", t.nav.howItWorks],
        ["/pricing", t.nav.pricing],
        ["/about", s.about],
        ["/success-stories", s.stories],
        ["/user-guide", s.guide],
        ["/contact", s.contact],
      ],
    ],
    [
      s.legal,
      [
        ["/terms", s.terms],
        ["/privacy-policy", s.privacy],
        ["/refund-policy", s.refund],
      ],
    ],
  ];

  return (
    <footer className="container-page mt-10 pb-28 sm:pb-10">
      <div className="glass rounded-[28px] p-6 sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="grid content-start gap-4">
            <BrandLink />
            <p className="max-w-xs text-sm text-muted">{s.footerTagline}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href={adminWhatsApp(contact.whatsapp, s.whatsappGreeting)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/12 px-3 py-1.5 font-bold text-[#128C7E] dark:text-[#25D366]">
                <MessageCircle className="size-4" aria-hidden />
                {s.whatsappShort}
              </a>
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-text/6 px-3 py-1.5 font-bold">
                <Mail className="size-4" aria-hidden />
                Email
              </a>
            </div>
          </div>
          {cols.map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
              <ul className="mt-3 grid gap-2">
                {links.map(([to, label]) => (
                  <li key={to}>
                    <Link to={href(to)} className="text-[0.95rem] hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} TSC — tscmmh.bd · {s.rights}
          </span>
          <span>{s.madeIn} 💚</span>
        </div>
      </div>
    </footer>
  );
}
