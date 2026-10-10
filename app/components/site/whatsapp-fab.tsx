import { motion } from "motion/react";
import { useLocale } from "~/i18n";
import { adminWhatsApp, usePublicSettings } from "~/lib/settings";

/** WhatsApp glyph (brand mark, drawn inline so it needs no icon font). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="currentColor">
      <path d="M16.04 3C9.0 3 3.3 8.7 3.3 15.74c0 2.25.6 4.45 1.72 6.38L3.2 28.8l6.86-1.8a12.7 12.7 0 0 0 5.98 1.52h.01c7.03 0 12.74-5.7 12.74-12.74 0-3.4-1.33-6.6-3.73-9A12.66 12.66 0 0 0 16.04 3Zm0 23.37h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.07 1.07 1.09-3.97-.25-.41a10.57 10.57 0 0 1-1.62-5.6c0-5.86 4.77-10.63 10.65-10.63 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.86-4.77 10.62-10.63 10.62Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.21-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

/** Always-visible "chat with admin" button, bottom-right; lifts above the phone tab bar. */
export function WhatsAppFab() {
  const { t } = useLocale();
  const { contact } = usePublicSettings();
  return (
    <motion.a
      href={adminWhatsApp(contact.whatsapp, t.site.whatsappGreeting)}
      target="_blank"
      rel="noreferrer"
      aria-label={t.site.whatsapp}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.8 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="group fixed bottom-[calc(1rem+env(safe-area-inset-bottom)+var(--tabbar-h,0px))] right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] p-3.5 text-white shadow-[0_12px_32px_-8px_rgb(37_211_102/0.65)] sm:right-6 sm:bottom-6 sm:pr-5"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.6s]" aria-hidden />
      <WhatsAppIcon className="size-7" />
      <span className="hidden text-sm font-bold sm:inline">{t.site.whatsapp}</span>
    </motion.a>
  );
}
