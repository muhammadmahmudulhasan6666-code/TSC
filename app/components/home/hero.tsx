import { BadgeCheck, BookOpen, GraduationCap, Headset, Percent, Search, ShieldCheck, Star, UserPlus, Wallet, Zap } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { Button } from "~/components/ui/button";
import { Logo } from "~/components/site/brand";
import { Magnetic } from "~/components/fx/magnetic";
import { cn } from "~/lib/cn";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

function Chip({ icon: Icon, label, tone, className }: { icon: typeof Zap; label: string; tone: "rose" | "mint" | "gold" | "violet"; className?: string }) {
  return (
    <div className={cn("glass glass-strong pointer-events-none absolute flex items-center gap-2 rounded-2xl py-2 pl-2 pr-3.5 text-sm font-bold shadow-[var(--shadow-lift)]", `tint-${tone}`, className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-[var(--chip)] text-[var(--accent)]">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="relative whitespace-nowrap">{label}</span>
    </div>
  );
}

/**
 * The TSC hero: rotating light beam, radiating rings, pointer-follow glow, floating chips and a
 * word-by-word headline. Entrance animations are pure CSS so the hero paints before hydration.
 */
export function Hero() {
  const { t, href } = useLocale();
  const h = t.hero;
  const ref = useRef<HTMLElement>(null);

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }

  const words = h.line1.split(" ");

  return (
    <section ref={ref} onPointerMove={onPointerMove} className="hero-stage -mt-[76px] flex min-h-[94svh] items-center overflow-hidden pb-16 pt-[120px] sm:pb-24">
      <div aria-hidden className="hero-beam" />
      <div aria-hidden className="hero-cursor" />
      <div aria-hidden className="hero-rings">
        <span />
        <span />
        <span />
      </div>

      {/* Floating proof chips — desktop places four around the copy, mobile two above it. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1280px] lg:block">
        <div className="rise float-a absolute left-[4%] top-[30%]" style={d(0.9)}>
          <Chip icon={BadgeCheck} label={h.chipVerified} tone="mint" className="relative" />
        </div>
        <div className="rise float-b absolute right-[4%] top-[26%]" style={d(1.05)}>
          <Chip icon={Wallet} label={h.chipCommission} tone="gold" className="relative" />
        </div>
        <div className="rise float-c absolute bottom-[20%] left-[8%]" style={d(1.2)}>
          <Chip icon={Percent} label={h.chipTrial} tone="rose" className="relative" />
        </div>
        <div className="rise float-a absolute bottom-[24%] right-[7%]" style={d(1.35)}>
          <Chip icon={Zap} label={h.chipMatch} tone="violet" className="relative" />
        </div>
      </div>

      <div className="container-page relative text-center">
        {/* Logo with its edge ring, circled by orbiting glass satellites. */}
        <div className="rise relative mx-auto grid size-[150px] place-items-center [--orbit-size:150px] sm:size-[190px] sm:[--orbit-size:190px]" style={d(0)}>
          <div aria-hidden className="orbit" style={{ "--orbit-speed": "26s" } as React.CSSProperties}>
            {[
              [BadgeCheck, "0deg", "text-brand"],
              [BookOpen, "90deg", "text-primary"],
              [GraduationCap, "180deg", "text-violet"],
              [Star, "270deg", "text-gold"],
            ].map(([Icon, a, color], i) => {
              const I = Icon as typeof Star;
              return (
                <span key={i} className="sat" style={{ "--a": a } as React.CSSProperties}>
                  <span className="glass glass-strong grid size-9 place-items-center rounded-full shadow-[var(--shadow-card)] sm:size-10">
                    <I className={cn("relative size-4 sm:size-[18px]", color as string)} />
                  </span>
                </span>
              );
            })}
          </div>
          <div className="float-b">
            <div className="logo-ring">
              <Logo size={76} priority className="shadow-none" />
            </div>
          </div>
        </div>

        <div className="rise mt-7 flex justify-center" style={d(0.1)}>
          <span className="glass inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-bold">
            <span className="grid size-6 place-items-center rounded-full bg-[image:var(--grad-primary)] text-white">
              <ShieldCheck className="size-3.5" aria-hidden />
            </span>
            {h.pill}
          </span>
        </div>

        <h1 className="mx-auto mt-7 max-w-5xl text-[2.6rem] leading-[1.06] sm:text-[4.1rem] lg:text-[5.4rem]">
          <span className="block">
            {words.map((w, i) => (
              <span key={i} className="rise inline-block" style={d(0.2 + i * 0.09)}>
                {w}
                {i < words.length - 1 && " "}
              </span>
            ))}
          </span>
          <span className="rise relative inline-block pb-3" style={d(0.2 + words.length * 0.09)}>
            <span className="text-shimmer drop-shadow-[0_8px_30px_rgb(255_77_109/0.25)]">{h.line2}</span>
            <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="swoosh absolute -bottom-1 left-[4%] h-3 w-[92%] sm:h-4">
              <defs>
                <linearGradient id="swoosh" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--primary)" />
                  <stop offset="0.6" stopColor="var(--primary-2)" />
                  <stop offset="1" stopColor="var(--brand-2)" />
                </linearGradient>
              </defs>
              <path d="M3 13 C 70 3, 150 3, 297 9" pathLength={1} fill="none" stroke="url(#swoosh)" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="rise mx-auto mt-7 max-w-2xl text-lg text-muted sm:text-xl" style={d(0.55)}>
          {h.body}
        </p>

        <div className="rise mx-auto mt-9 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center" style={d(0.7)}>
          <Magnetic className="block sm:inline-flex">
            <Button asChild size="lg" block>
              <Link to={href("/teachers")}>
                <Search aria-hidden />
                {h.ctaPrimary}
              </Link>
            </Button>
          </Magnetic>
          <Magnetic className="block sm:inline-flex">
            <Button asChild size="lg" variant="secondary" block>
              <Link to={href("/register?role=teacher")}>
                <UserPlus aria-hidden />
                {h.ctaSecondary}
              </Link>
            </Button>
          </Magnetic>
        </div>

        <ul className="rise mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted sm:text-base" style={d(0.85)}>
          {h.trust.map((item, i) => {
            const Icon = [BadgeCheck, Percent, Headset][i];
            return (
              <li key={item} className="inline-flex items-center gap-2">
                <Icon className={cn("size-4", ["text-brand", "text-primary", "text-gold"][i])} aria-hidden />
                {item}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
