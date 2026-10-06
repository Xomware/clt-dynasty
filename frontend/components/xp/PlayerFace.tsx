"use client";

import Image from "next/image";
import { useState } from "react";

import { headshot } from "@/lib/nfl/teams";
import { SilhouetteIcon } from "./icons";

import "./players.css";

interface PlayerFaceProps {
  id: string;
  position?: string | null;
  // CSS pixels; the box itself is sized by the caller's class.
  size?: number;
  className?: string;
}

// Sleeper's headshot, a defense's logo, or a silhouette when the CDN has neither.
export function PlayerFace({ id, position, size = 32, className = "" }: PlayerFaceProps) {
  const src = headshot(id, position ?? undefined);
  // Keyed by src, so a window that navigates to another player tries again.
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={`xp-face ${className}`} data-logo={position === "DEF" || undefined} aria-hidden>
      {failed === src ? (
        <SilhouetteIcon width="100%" height="100%" />
      ) : (
        <Image src={src} alt="" width={size} height={size} unoptimized loading="lazy" onError={() => setFailed(src)} />
      )}
    </span>
  );
}
