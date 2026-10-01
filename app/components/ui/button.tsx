import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "./slot";
import { cn } from "~/lib/cn";

// Crimson gradient is the one primary action per screen; gold is reserved for premium.
export const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-bold",
    "transition-[transform,box-shadow,background-color,border-color,color,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "shine bg-[image:var(--grad-primary)] text-on-primary shadow-[var(--glow-primary)] hover:brightness-110",
        secondary: "glass text-text hover:border-border-strong",
        brand: "bg-brand text-white shadow-[0_10px_28px_-10px_rgb(0_128_92/0.6)] hover:brightness-110",
        ghost: "text-text hover:bg-text/5",
        premium: "shine bg-[image:var(--grad-gold)] text-[#2a1d02] shadow-[0_10px_28px_-10px_rgb(176_132_31/0.7)] hover:brightness-105",
        link: "h-auto px-0 text-primary underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        sm: "h-10 rounded-full px-4 text-sm",
        md: "h-12 rounded-full px-6 text-base", // ≥44px touch target
        lg: "h-14 rounded-full px-8 text-lg",
        icon: "size-11 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, block, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
