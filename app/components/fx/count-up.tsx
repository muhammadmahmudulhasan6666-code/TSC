import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "~/i18n";
import { formatNumber } from "~/lib/format";

/** Counts up to `value` once when visible, in the locale's numerals. Renders the final value on the server. */
export function CountUp({ value, locale, duration = 1.4, className }: { value: number; locale: Locale; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {formatNumber(shown, locale)}
    </span>
  );
}
