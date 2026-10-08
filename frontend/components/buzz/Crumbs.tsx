"use client";

import { type MouseEvent, useLayoutEffect, useRef } from "react";

export interface Crumb {
  label: string;
  href: string;
  onSelect: () => void;
}

interface CrumbsProps {
  items: Crumb[];
  here: string;
  className?: string;
}

// The path to this page on strips of tape, each one a link back to it. A path
// longer than the strip scrolls, kept scrolled to its end.
export function Crumbs({ items, here, className = "" }: CrumbsProps) {
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [items.length, here]);

  const onClick = (e: MouseEvent, c: Crumb) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    c.onSelect();
  };
  return (
    <nav aria-label="Breadcrumb" className={`bz-crumbs ${className}`}>
      <ol ref={list}>
        {items.map((c, i) => (
          <li key={i}>
            <a href={c.href} onClick={(e) => onClick(e, c)}>
              {c.label}
            </a>
          </li>
        ))}
        <li aria-current="page">{here}</li>
      </ol>
    </nav>
  );
}
