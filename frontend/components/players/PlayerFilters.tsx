"use client";

import { useId, useState } from "react";

import { FunnelIcon } from "@/components/xp/icons";
import type { Team } from "@/lib/league/use-league";
import { NFL_TEAMS } from "@/lib/nfl/teams";
import { DEFAULT_VIEW, type Health, naturalDesc, type Owner, POSITIONS, type Slot, type SortKey, type View } from "@/lib/players/params";

export const SORT_LABELS: Record<SortKey, string> = {
  pts: "Season points",
  ppg: "Points per game",
  rank: "Season position rank",
  proj: "This week's projection",
  ros: "Rest-of-season average",
  value: "Dynasty value",
  age: "Age",
};

interface PlayerFiltersProps {
  view: View;
  onChange: (patch: Partial<View>) => void;
  query: string;
  onQuery: (q: string) => void;
  teams: { rosterId: number; team: Team }[];
  mine: number | null;
  inSeason: boolean;
  // The worth-adding check needs a linked team and this week's projections.
  canRate: boolean;
}

// How many filters differ from the default, for the phone's Filters button.
export function activeFilters(v: View): number {
  return [v.pos.length > 0, v.nfl, v.owner !== "any", v.slot !== "any", v.health !== "any", v.rookies, v.worth, v.ageMin !== null || v.ageMax !== null].filter(Boolean).length;
}

// Unclamped while typing: "25" passes through "2" on the way.
const ageValue = (s: string) => (/^\d{1,2}$/.test(s) ? Number(s) : null);

export function PlayerFilters({ view, onChange, query, onQuery, teams, mine, inSeason, canRate }: PlayerFiltersProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const count = activeFilters(view);
  const sorts = (Object.keys(SORT_LABELS) as SortKey[]).filter((s) => inSeason || (s !== "proj" && s !== "ros"));

  return (
    <div className="pl-filters">
      <div className="pl-filters-top">
        <div className="pl-field pl-search">
          <label htmlFor={`${id}-q`}>Search players</label>
          <input
            id={`${id}-q`}
            type="search"
            className="xp-input"
            value={query}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Name, like Bijan or St. Brown"
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <div className="pl-field">
          <label htmlFor={`${id}-sort`}>Sort by</label>
          <div className="pl-sort">
            <select
              id={`${id}-sort`}
              className="xp-select"
              value={view.sort}
              onChange={(e) => {
                const sort = e.target.value as SortKey;
                onChange({ sort, desc: naturalDesc(sort) });
              }}
            >
              {sorts.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
            <button type="button" className="xp-button pl-dir" onClick={() => onChange({ desc: !view.desc })}>
              {view.desc ? "High to low" : "Low to high"}
              <span className="sr-only">, change the sort order</span>
            </button>
          </div>
        </div>
        {canRate && (
          <label className="pl-check pl-worth-toggle">
            <input type="checkbox" checked={view.worth} onChange={(e) => onChange({ worth: e.target.checked })} />
            Only free agents worth adding to my team
          </label>
        )}
        <button
          type="button"
          className="xp-button pl-filters-toggle"
          aria-expanded={open}
          aria-controls={`${id}-more`}
          onClick={() => setOpen((o) => !o)}
        >
          <FunnelIcon width={16} height={16} aria-hidden />
          Filters{count > 0 && ` (${count})`}
        </button>
      </div>

      <div id={`${id}-more`} className="pl-filters-more" data-open={open || undefined}>
        <fieldset className="pl-field pl-positions">
          <legend>Position</legend>
          <div className="pl-chips">
            <button type="button" className="pl-chip" aria-pressed={view.pos.length === 0} onClick={() => onChange({ pos: [] })}>
              All
            </button>
            {POSITIONS.map((p) => {
              const on = view.pos.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  className="pl-chip"
                  aria-pressed={on}
                  onClick={() => onChange({ pos: on ? view.pos.filter((x) => x !== p) : [...view.pos, p] })}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="pl-field">
          <label htmlFor={`${id}-own`}>CLT team</label>
          <select
            id={`${id}-own`}
            className="xp-select"
            value={String(view.owner)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ owner: (v === "any" || v === "available" || v === "mine" ? v : Number(v)) as Owner });
            }}
          >
            <option value="any">Anyone</option>
            <option value="available">Available</option>
            {mine !== null && <option value="mine">My team</option>}
            {teams.map((t) => (
              <option key={t.rosterId} value={t.rosterId}>
                {t.team.name}
                {t.rosterId === mine ? " (you)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="pl-field">
          <label htmlFor={`${id}-slot`}>Roster spot</label>
          <select id={`${id}-slot`} className="xp-select" value={view.slot} onChange={(e) => onChange({ slot: e.target.value as Slot })}>
            <option value="any">Any</option>
            <option value="active">Active roster</option>
            <option value="taxi">Taxi squad</option>
            <option value="ir">Injured reserve</option>
          </select>
        </div>

        <div className="pl-field">
          <label htmlFor={`${id}-nfl`}>NFL team</label>
          <select id={`${id}-nfl`} className="xp-select" value={view.nfl} onChange={(e) => onChange({ nfl: e.target.value })}>
            <option value="">All teams</option>
            <option value="FA">Free agents</option>
            {[...NFL_TEAMS]
              .sort((a, b) => a.abbr.localeCompare(b.abbr))
              .map((t) => (
                <option key={t.abbr} value={t.abbr}>
                  {t.abbr}, {t.city} {t.name}
                </option>
              ))}
          </select>
        </div>

        <div className="pl-field">
          <label htmlFor={`${id}-hl`}>Injury</label>
          <select id={`${id}-hl`} className="xp-select" value={view.health} onChange={(e) => onChange({ health: e.target.value as Health })}>
            <option value="any">Any</option>
            <option value="healthy">Healthy</option>
            <option value="questionable">Questionable or doubtful</option>
            <option value="out">Out, IR or inactive</option>
          </select>
        </div>

        <fieldset className="pl-field pl-age">
          <legend>Age</legend>
          <div className="pl-age-inputs">
            <label htmlFor={`${id}-amin`} className="sr-only">
              Youngest
            </label>
            <input
              id={`${id}-amin`}
              type="number"
              inputMode="numeric"
              min={18}
              max={45}
              className="xp-input"
              placeholder="Min"
              value={view.ageMin ?? ""}
              onChange={(e) => onChange({ ageMin: ageValue(e.target.value) })}
            />
            <span aria-hidden>to</span>
            <label htmlFor={`${id}-amax`} className="sr-only">
              Oldest
            </label>
            <input
              id={`${id}-amax`}
              type="number"
              inputMode="numeric"
              min={18}
              max={45}
              className="xp-input"
              placeholder="Max"
              value={view.ageMax ?? ""}
              onChange={(e) => onChange({ ageMax: ageValue(e.target.value) })}
            />
          </div>
        </fieldset>

        <label className="pl-check">
          <input type="checkbox" checked={view.rookies} onChange={(e) => onChange({ rookies: e.target.checked })} />
          Rookies only
        </label>

        <button
          type="button"
          className="xp-button pl-reset"
          disabled={count === 0 && !query}
          onClick={() => {
            onQuery("");
            onChange({ ...DEFAULT_VIEW, sort: view.sort, desc: view.desc });
          }}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
