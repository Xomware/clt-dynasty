"use client";

import type { MouseEvent } from "react";

import type { WindowLink } from "@/lib/desktop/deep-link";
import { useLaunchers } from "@/lib/desktop/registry";
import { LINE, LineIcon } from "./line-icons";
import { ABOUT, RELATED, urlOf } from "./pages";

interface RelatedProps {
  kind: string;
  onNav: (e: MouseEvent, to: WindowLink) => void;
}

// "Keep going": the pages that usually come next from this one.
export function Related({ kind, onNav }: RelatedProps) {
  const launchers = useLaunchers();
  const next = (RELATED[kind as keyof typeof RELATED] ?? []).flatMap((k) => launchers.filter((l) => l.kind === k));
  if (next.length === 0) return null;
  return (
    <nav aria-labelledby="u-related" className="u-related">
      <h2 id="u-related" className="u-related-title">
        Keep going
      </h2>
      <ul>
        {next.map(({ kind, label, Icon }) => {
          const to = { kind, params: {} };
          return (
            <li key={kind}>
              <a href={urlOf(to)} className="u-related-card" onClick={(e) => onNav(e, to)}>
                <Icon width={32} height={32} className="flex-none" aria-hidden />
                <span className="min-w-0">
                  <span className="u-related-name">{label}</span>
                  {ABOUT[kind] && <span className="u-related-about">{ABOUT[kind]}</span>}
                </span>
                <LineIcon d={LINE.chevron} size={18} className="u-related-go" />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
