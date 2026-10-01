import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "~/lib/cn";

/**
 * Glass card that tilts toward the pointer, lifts on hover, presses on tap, and carries a
 * spotlight that follows the cursor. On touch devices only the press + lift remain.
 */
export function TiltCard({ className, children, intensity = 8, tint }: { className?: string; children: React.ReactNode; intensity?: number; tint?: "rose" | "mint" | "gold" | "violet" }) {
  const reduce = useReducedMotion();
  // Pointer position drives the spotlight; tilt has its own values so it can spring back on leave
  // while the spotlight stays where the cursor left and fades out slowly (no jump/blink).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const tx = useMotionValue(0.5);
  const ty = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(ty, [0, 1], [intensity, -intensity]), spring);
  const rotateY = useSpring(useTransform(tx, [0, 1], [-intensity, intensity]), spring);
  const sx = useTransform(px, (v) => `${v * 100}%`);
  const sy = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${sx} ${sy}, color-mix(in srgb, var(--accent, #ffffff) 16%, transparent), transparent 45%)`;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    px.set(x);
    py.set(y);
    tx.set(x);
    ty.set(y);
  }
  function onLeave() {
    tx.set(0.5);
    ty.set(0.5);
  }

  return (
    <motion.div
      onPointerMove={reduce ? undefined : onMove}
      onPointerLeave={onLeave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      whileHover={reduce ? undefined : { y: -6, boxShadow: "var(--shadow-lift)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn("glass group relative overflow-hidden rounded-[22px]", tint && `tint-${tint}`, className)}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[900ms] ease-out group-hover:opacity-100 group-hover:duration-300" style={{ background: spotlight }} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
