import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "./slot";
import { cn } from "~/lib/cn";

// Crimson is reserved for the single primary action on a screen; gold only for premium.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-[0_1px_0_rgb(0_0_0/0.08)]",
        secondary: "border border-border-strong bg-surface text-text hover:bg-surface-2",
        ghost: "text-text hover:bg-surface-2",
        brand: "bg-brand text-white hover:brightness-110",
        premium: "border border-gold/60 bg-gold-soft text-text hover:border-gold",
        link: "h-auto px-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-[10px] px-3 text-sm",
        md: "h-11 rounded-[10px] px-5 text-base", // 44px — minimum touch target
        lg: "h-13 rounded-[12px] px-7 text-lg",
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
