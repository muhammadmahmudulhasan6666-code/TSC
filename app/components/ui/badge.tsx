import { cva, type VariantProps } from "class-variance-authority";
import { BadgeCheck, Crown, ShieldCheck } from "lucide-react";
import { cn } from "~/lib/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-5", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-muted",
      verified: "bg-brand-soft text-brand", // NID + university ID verified
      certified: "bg-gold-soft text-gold ring-1 ring-gold/40", // TSC Certified seal
      premium: "text-gold ring-1 ring-gold/60", // premium outline only
      danger: "bg-danger/10 text-danger",
      warning: "bg-warning/10 text-warning",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const icons = { verified: BadgeCheck, certified: ShieldCheck, premium: Crown } as const;

export function Badge({ tone, className, children, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  const Icon = tone && tone in icons ? icons[tone as keyof typeof icons] : null;
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}
