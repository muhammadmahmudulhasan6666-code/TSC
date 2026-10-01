import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "~/lib/cn";

/** Pulls its child toward the cursor while hovered, then springs back (mouse only). */
export function Magnetic({ children, strength = 0.28, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.5 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.5 });

  if (reduce) return <span className={cn("inline-flex", className)}>{children}</span>;
  return (
    <motion.span
      className={cn("inline-flex", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
