import { cn } from "~/lib/cn";

export function Card({ className, tint, ...props }: React.ComponentProps<"div"> & { tint?: "rose" | "mint" | "gold" | "violet" }) {
  return <div className={cn("glass overflow-hidden rounded-[22px]", tint && `tint-${tint}`, className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("relative p-5 sm:p-6", className)} {...props} />;
}
