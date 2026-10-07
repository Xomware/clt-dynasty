"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { type Launcher, useLauncherGroups } from "@/lib/desktop/registry";
import { useLeague } from "@/lib/league/use-league";
import { teamLink } from "@/lib/team/links";
import { LINE, LineIcon } from "./line-icons";
import { ABOUT } from "./pages";

// A page, or a team, as one row of results.
interface Option {
  key: string;
  label: string;
  about?: string;
  avatar?: string | null;
  to: WindowLink;
}

interface Section {
  id: string;
  label: string;
  items: Option[];
}

// Every word has to appear in the row's name, its group or its one-liner. A
// hit in the name ranks above one in the group, and both above the one-liner.
function score(query: string, o: Option, group: string): number {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const label = o.label.toLowerCase();
  const about = (o.about ?? "").toLowerCase();
  let total = 0;
  for (const w of words) {
    const hit = label.startsWith(w) ? 4 : label.includes(w) ? 3 : group.toLowerCase().includes(w) ? 2 : about.includes(w) ? 1 : 0;
    if (!hit) return 0;
    total += hit;
  }
  return total;
}

const page = (l: Launcher): Option => ({ key: l.kind, label: l.label, about: ABOUT[l.kind], to: { kind: l.kind, params: {} } });

interface SpotlightProps {
  onClose: () => void;
  onGo: (to: WindowLink) => void;
}

// Search across every page the member can open, filed under the same groups as the nav.
export function Spotlight({ onClose, onGo }: SpotlightProps) {
  const { pinned, groups } = useLauncherGroups();
  const { data, teamFor } = useLeague();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const picked = useRef(false);
  // Read during the first render: autoFocus has moved focus by the time an effect runs.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  // A pick moves focus to the new page's title, so only a dismissal hands it back.
  useEffect(
    () => () => {
      if (!picked.current) opener?.focus();
    },
    [opener],
  );

  // With a query, the section holding the best match comes first, so Enter takes it.
  const teams: Option[] = (data?.rosters ?? []).map((r) => {
    const team = teamFor(r.roster_id);
    return { key: `team-${r.roster_id}`, label: team.name, avatar: team.avatarUrl, about: "Team profile", to: teamLink(LEAGUE_ID, r.roster_id) };
  });
  const sections: Section[] = [
    { id: "start", label: "Start", items: pinned.map(page) },
    ...groups.map((g) => ({ id: g.id, label: g.label, items: g.items.map(page) })),
    // Teams only once something is typed, so the empty palette stays a page list.
    ...(query.trim() ? [{ id: "teams", label: "Teams", items: teams }] : []),
  ]
    .map((s) => {
      const scored = s.items.map((l) => ({ l, at: query.trim() ? score(query, l, s.label) : 1 })).filter((x) => x.at > 0);
      return { ...s, best: Math.max(0, ...scored.map((x) => x.at)), items: scored.sort((a, b) => b.at - a.at).map((x) => x.l) };
    })
    .filter((s) => s.items.length > 0)
    .sort((a, b) => b.best - a.best);
  const flat = sections.flatMap((s) => s.items);
  const index = Math.min(at, flat.length - 1);
  const current = flat[index];
  const optionId = (i: number) => `${id}-option-${i}`;

  useEffect(() => {
    document.getElementById(optionId(index))?.scrollIntoView?.({ block: "nearest" });
  });

  const pick = (o: Option) => {
    picked.current = true;
    onClose();
    onGo(o.to);
  };

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && current) {
      e.preventDefault();
      return pick(current);
    }
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || flat.length === 0) return;
    e.preventDefault();
    setAt((index + (e.key === "ArrowDown" ? 1 : -1) + flat.length) % flat.length);
  };

  const onBoxKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab") return;
    const all = [...(box.current?.querySelectorAll<HTMLElement>("input, button") ?? [])];
    const edge = e.shiftKey ? all[0] : all[all.length - 1];
    if (document.activeElement !== edge) return;
    e.preventDefault();
    (e.shiftKey ? all[all.length - 1] : all[0]).focus();
  };

  return (
    <div className="u-spot-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={`${id}-label`} className="u-spot" onKeyDown={onBoxKey}>
        <div className="u-spot-field">
          <LineIcon d={LINE.search} />
          <label id={`${id}-label`} htmlFor={`${id}-input`} className="sr-only">
            Search pages and teams
          </label>
          <input
            id={`${id}-input`}
            type="text"
            role="combobox"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Standings, taxi, a team name..."
            aria-expanded={flat.length > 0}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={current ? optionId(index) : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAt(0);
            }}
            onKeyDown={onInputKey}
          />
          <button type="button" className="u-spot-close" aria-label="Close search" onClick={onClose}>
            <LineIcon d={LINE.close} size={18} />
          </button>
        </div>
        <div id={`${id}-list`} role="listbox" aria-label="Pages" className="u-spot-list">
          {sections.map((s) => (
            <div key={s.id} role="group" aria-labelledby={`${id}-${s.id}`}>
              <div role="presentation" id={`${id}-${s.id}`} className="u-spot-group">
                {s.label}
              </div>
              {s.items.map((l) => {
                const i = flat.indexOf(l);
                return (
                  <div
                    key={l.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === index}
                    aria-label={l.label}
                    className="u-spot-option"
                    data-team={l.avatar !== undefined || undefined}
                    // Keeps focus, and so the active option, in the input.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => i !== index && setAt(i)}
                    onClick={() => pick(l)}
                  >
                    {l.avatar !== undefined && <TeamAvatar name={l.label} url={l.avatar} size={32} className="u-spot-avatar" />}
                    <span className="u-spot-name">{l.label}</span>
                    {l.about && <span className="u-spot-about">{l.about}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {flat.length === 0 && (
          <p role="status" className="u-spot-empty">
            No page matches &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
