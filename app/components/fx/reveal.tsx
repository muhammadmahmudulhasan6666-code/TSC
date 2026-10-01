import { motion, useReducedMotion, type Variants } from "motion/react";
import { Children } from "react";
import { cn } from "~/lib/cn";

type From = "up" | "down" | "left" | "right" | "scale" | "blur";

const offset: Record<From, Record<string, number | string>> = {
  up: { y: 36 },
  down: { y: -36 },
  left: { x: -56 },
  right: { x: 56 },
  scale: { scale: 0.92 },
  blur: { y: 16, filter: "blur(10px)" },
};

const variants = (from: From, delay: number): Variants => ({
  hidden: { opacity: 0, ...offset[from] },
  shown: {
    opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)",
    transition: { type: "spring", stiffness: 90, damping: 18, mass: 0.9, delay },
  },
});

/** Slides content in once when it scrolls into view. Respects reduced-motion. */
export function Reveal({ from = "up", delay = 0, className, children, as = "div" }: { from?: From; delay?: number; className?: string; children: React.ReactNode; as?: "div" | "section" | "li" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp className={className} variants={variants(from, delay)} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.25, margin: "0px 0px -8% 0px" }}>
      {children}
    </Comp>
  );
}

/** Reveals each child in turn; `alternate` sends odd items in from the left and even from the right. */
export function Stagger({ children, className, step = 0.08, from = "up", alternate = false }: { children: React.ReactNode; className?: string; step?: number; from?: From; alternate?: boolean }) {
  return (
    <div className={cn(className)}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delay={i * step} from={alternate ? (i % 2 ? "right" : "left") : from}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
