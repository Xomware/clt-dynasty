"use client";

import Image from "next/image";
import { useState } from "react";

interface TeamAvatarProps {
  name: string;
  url: string | null | undefined;
  // Rendered size in px; the box's CSS class sets the layout size.
  size?: number;
  className?: string;
}

// A team's picture, or its initial when it has none or the CDN fails it.
export function TeamAvatar({ name, url, size = 28, className = "xp-avatar" }: TeamAvatarProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const show = url && broken !== url;
  return (
    <span className={`${className} overflow-hidden`} aria-hidden>
      {show ? (
        <Image src={url} alt="" width={size} height={size} unoptimized className="size-full object-cover" onError={() => setBroken(url)} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
