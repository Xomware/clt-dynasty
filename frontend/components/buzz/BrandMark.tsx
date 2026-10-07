import type { StaticImageData } from "next/image";

import badgeSkyline from "@/public/brand/badge-skyline.webp";
import badgeSkyline2 from "@/public/brand/badge-skyline@2x.webp";
import crown from "@/public/brand/crown.webp";
import crown2 from "@/public/brand/crown@2x.webp";
import footballHornet from "@/public/brand/football-hornet.webp";
import footballHornet2 from "@/public/brand/football-hornet@2x.webp";
import head from "@/public/brand/head.webp";
import head2 from "@/public/brand/head@2x.webp";
import helmet from "@/public/brand/helmet.webp";
import helmet2 from "@/public/brand/helmet@2x.webp";
import lockup from "@/public/brand/lockup.webp";
import lockup2 from "@/public/brand/lockup@2x.webp";
import monogram from "@/public/brand/monogram.webp";
import monogram2 from "@/public/brand/monogram@2x.webp";
import pennant from "@/public/brand/pennant.webp";
import pennant2 from "@/public/brand/pennant@2x.webp";
import seal from "@/public/brand/seal.webp";
import seal2 from "@/public/brand/seal@2x.webp";

// Imported rather than linked from /brand/ so the URLs are content-hashed: the
// deploy caches everything outside _next/static for good. Each 1x file is the
// widest the mark is drawn, so any smaller size is a downscale.
const MARKS = {
  "badge-skyline": [badgeSkyline, badgeSkyline2],
  crown: [crown, crown2],
  "football-hornet": [footballHornet, footballHornet2],
  head: [head, head2],
  helmet: [helmet, helmet2],
  lockup: [lockup, lockup2],
  monogram: [monogram, monogram2],
  pennant: [pennant, pennant2],
  seal: [seal, seal2],
} satisfies Record<string, [StaticImageData, StaticImageData]>;

export type Mark = keyof typeof MARKS;

// Next hands back StaticImageData; vitest's plain Vite hands back the URL string.
const url = (m: StaticImageData | string) => (typeof m === "string" ? m : m.src);

interface BrandMarkProps {
  mark: Mark;
  /** Empty for a mark beside text that already names it. */
  alt: string;
  className?: string;
  priority?: boolean;
}

/** One of the league's marks, cut from Dom's brand sheet. Size it in CSS. */
export function BrandMark({ mark, alt, className, priority = false }: BrandMarkProps) {
  const [one, two] = MARKS[mark];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a static export has no image optimizer; the 1x/2x files are the sizes.
    <img
      src={url(one)}
      srcSet={`${url(one)} 1x, ${url(two)} 2x`}
      width={one.width}
      height={one.height}
      alt={alt}
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      draggable={false}
    />
  );
}
