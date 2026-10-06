import { type ReactNode, useId } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import type { WindowLink } from "@/lib/desktop/deep-link";

interface HomeCardProps {
  title: string;
  // The window the card summarises, linked from its header.
  more?: { to: WindowLink; label: string };
  className?: string;
  children: ReactNode;
}

export function HomeCard({ title, more, className = "", children }: HomeCardProps) {
  const id = useId();
  return (
    <section className={`xp-group home-card ${className}`} aria-labelledby={id}>
      <div className="home-card-head">
        <h3 id={id} className="xp-group-title">
          {title}
        </h3>
        {more && (
          <DrillLink to={more.to} className="home-card-more">
            {more.label}
          </DrillLink>
        )}
      </div>
      {children}
    </section>
  );
}
