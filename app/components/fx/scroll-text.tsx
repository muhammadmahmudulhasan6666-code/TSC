import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cn } from "~/lib/cn";

function Word({ word, progress, range, accent }: { word: string; progress: MotionValue<number>; range: [number, number]; accent?: boolean }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [8, 0]);
  return (
    <motion.span style={{ opacity, y }} className={cn("inline-block", accent && "text-gradient")}>
      {word}&nbsp;
    </motion.span>
  );
}

/**
 * Apple-style manifesto: words light up one by one as the paragraph scrolls through the viewport.
 * Words wrapped in *asterisks* get the brand gradient.
 */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  if (reduce) return <p className={className}>{text.replace(/\*/g, "")}</p>;
  return (
    <p ref={ref} className={cn("flex flex-wrap", className)}>
      {words.map((w, i) => {
        const accent = /^\*.*\*[.,!?।]?$/.test(w);
        return <Word key={i} word={w.replace(/\*/g, "")} accent={accent} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />;
      })}
    </p>
  );
}
