import { motion, useReducedMotion, type Variants } from "motion/react";
import { Children } from "react";
import { cn } from "~/lib/cn";

type From = "up" | "down" | "left" | "right" | "scale" | "blur" | "orbitLeft" | "orbitRight";

const offset: Record<Exclude<From, "orbitLeft" | "orbitRight">, Record<string, number | string>> = {
  up: { y: 36 },
  down: { y: -36 },
  left: { x: -56 },
  right: { x: 56 },
  scale: { scale: 0.92 },
  blur: { y: 16, filter: "blur(10px)" },
};

// Orbit entrances swing in along an arc (rotating as they travel) and settle with a soft overshoot.
const orbit = (dir: 1 | -1): Variants => ({
  hidden: { opacity: 0, x: 140 * dir, y: 90, rotate: 28 * dir, scale: 0.7, filter: "blur(6px)" },
  shown: {
    opacity: [0, 1, 1, 1],
    x: [140 * dir, 60 * dir, -10 * dir, 0],
    y: [90, -40, -8, 0],
    rotate: [28 * dir, -10 * dir, 3 * dir, 0],
    scale: [0.7, 1.04, 0.99, 1],
    filter: ["blur(6px)", "blur(0px)", "blur(0px)", "blur(0px)"],
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 0.8, 1] },
  },
});

const variants = (from: From, delay: number): Variants => {
  if (from === "orbitLeft" || from === "orbitRight") {
    const v = orbit(from === "orbitLeft" ? -1 : 1);
    return { ...v, shown: { ...v.shown, transition: { ...(v.shown as { transition: object }).transition, delay } } };
  }
  return {
    hidden: { opacity: 0, ...offset[from] },
    shown: {
      opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 90, damping: 18, mass: 0.9, delay },
    },
  };
};

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

/** Reveals each child in turn; `alternate` sends odd items in from the left and even from the right; `orbit` swings them in along arcs. */
export function Stagger({ children, className, step = 0.08, from = "up", alternate = false, orbit: orbitMode = false }: { children: React.ReactNode; className?: string; step?: number; from?: From; alternate?: boolean; orbit?: boolean }) {
  return (
    <div className={cn(className)}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delay={i * step} from={orbitMode ? (i % 2 ? "orbitRight" : "orbitLeft") : alternate ? (i % 2 ? "right" : "left") : from}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
