"use client";

import { type PlayerRanks, useRanks } from "@/lib/nfl/use-ranks";

import "./rank-chips.css";

interface RankChipsProps {
  ranks: PlayerRanks;
  week: number | null;
  // A field token's one-line strip. Otherwise each chip carries its label and number.
  compact?: boolean;
}

const points = (n: number) => n.toFixed(1);

// One player's chips, for a header.
export function PlayerRankChips({ id, className }: { id: string; className?: string }) {
  const ranks = useRanks();
  return (
    <div className={className}>
      <RankChips ranks={ranks(id)} week={ranks.week} />
    </div>
  );
}

// Season rank in CLT scoring, this week's projected rank, and the dynasty rank.
export function RankChips({ ranks, week, compact = false }: RankChipsProps) {
  const { season, projected, dynasty } = ranks;
  const chips = [
    season && {
      key: "season",
      long: `Season ${season.position}${season.rank}, ${points(season.points)} pts`,
      title: `Season rank in CLT scoring: ${season.position}${season.rank}, ${points(season.points)} points`,
    },
    projected &&
      week && {
        key: "week",
        long: `Week ${week} proj ${projected.position}${projected.rank}, ${points(projected.points)} pts`,
        title: `Week ${week} projection in CLT scoring: ${projected.position}${projected.rank}, ${points(projected.points)} points`,
      },
    dynasty && {
      key: "dynasty",
      long: `Dynasty ${dynasty.position}${dynasty.rank}, #${dynasty.overall} overall`,
      title: `FantasyCalc dynasty superflex: ${dynasty.position}${dynasty.rank}, ${dynasty.overall} overall, value ${dynasty.value.toLocaleString("en-US")}`,
    },
  ].filter((c) => !!c);
  if (chips.length === 0) return null;
  if (compact) {
    // A field token has room for one line: the position, then season, week and
    // dynasty ranks in that order, told apart by color.
    const position = (season ?? projected ?? dynasty)!.position;
    return (
      <span className="xp-rank-strip" aria-hidden>
        <span>{position}</span>
        <span data-kind="season">{season?.rank ?? "-"}</span>
        <span data-kind="week">{projected && week ? projected.rank : "-"}</span>
        <span data-kind="dynasty">{dynasty?.rank ?? "-"}</span>
      </span>
    );
  }
  return (
    <span className="xp-ranks">
      {chips.map((c) => (
        <span key={c.key} className="xp-rank" data-kind={c.key} title={c.title}>
          <span aria-hidden>{c.long}</span>
          <span className="sr-only">{c.title}</span>
        </span>
      ))}
    </span>
  );
}
