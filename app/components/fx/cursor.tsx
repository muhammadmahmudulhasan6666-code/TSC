import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Desktop-only cursor companion: a precise dot plus a glass ring that trails with a spring and
 * swells over anything clickable. Native cursor stays visible (accessibility + text selection).
 */
export function CursorFollower() {
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 350, damping: 30, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 350, damping: 30, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    setEnabled(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as Element | null;
      setHot(!!el?.closest("a, button, [role=button], label, input, select, textarea, summary"));
    };
    const press = () => setDown(true);
    const release = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        className="absolute left-0 top-0 rounded-full border border-primary/40 bg-primary/5 backdrop-blur-[2px]"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hot ? 54 : 30, height: hot ? 54 : 30, opacity: hot ? 1 : 0.7, scale: down ? 0.82 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
      <motion.div className="absolute left-0 top-0 size-1.5 rounded-full bg-primary" style={{ x, y, translateX: "-50%", translateY: "-50%" }} />
    </div>
  );
}
