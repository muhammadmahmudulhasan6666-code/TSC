import { Children, cloneElement, isValidElement } from "react";
import { cn } from "~/lib/cn";

/** Minimal `asChild` helper: merges className/props onto the single child element. */
export function Slot({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const child = Children.only(children);
  if (!isValidElement<{ className?: string }>(child)) return null;
  return cloneElement(child, { ...props, ...child.props, className: cn(className, child.props.className) });
}
