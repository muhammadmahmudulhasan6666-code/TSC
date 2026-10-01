import { useEffect } from "react";

/** Fixed aurora + grid backdrop behind every page. */
export function Backdrop() {
  return (
    <div aria-hidden className="tsc-backdrop">
      <div className="tsc-blob tsc-blob-1" />
      <div className="tsc-blob tsc-blob-2" />
      <div className="tsc-blob tsc-blob-3" />
    </div>
  );
}

/** Inertia smooth-scrolling on mouse/trackpad devices only; touch keeps native scrolling. */
export function useSmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | undefined;
    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);
}
