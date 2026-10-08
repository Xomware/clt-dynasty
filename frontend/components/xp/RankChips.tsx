"use client";

import { type PlayerRanks, useRanks } from "@/lib/nfl/use-ranks";

import "./rank-chips.css";

interface RankChipsProps {
  ranks: PlayerRanks;
  week: number | null;
  // The field's tokens: codes only. Otherwise each chip carries its label and number.
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
      short: `${season.position}${season.rank}`,
      long: `Season ${season.position}${season.rank}, ${points(season.points)} pts`,
      title: `Season rank in CLT scoring: ${season.position}${season.rank}, ${points(season.points)} points`,
    },
    projected &&
      week && {
        key: "week",
        short: `Wk${week} ${projected.position}${projected.rank}`,
        long: `Week ${week} proj ${projected.position}${projected.rank}, ${points(projected.points)} pts`,
        title: `Week ${week} projection in CLT scoring: ${projected.position}${projected.rank}, ${points(projected.points)} points`,
      },
    dynasty && {
      key: "dynasty",
      short: `Dyn ${dynasty.position}${dynasty.rank}`,
      long: `Dynasty ${dynasty.position}${dynasty.rank}, #${dynasty.overall} overall`,
      title: `FantasyCalc dynasty superflex: ${dynasty.position}${dynasty.rank}, ${dynasty.overall} overall, value ${dynasty.value.toLocaleString("en-US")}`,
    },
  ].filter((c) => !!c);
  if (chips.length === 0) return null;
  return (
    <span className="xp-ranks" data-compact={compact || undefined}>
      {chips.map((c) => (
        <span key={c.key} className="xp-rank" data-kind={c.key} title={c.title}>
          <span aria-hidden>{compact ? c.short : c.long}</span>
          <span className="sr-only">{c.title}</span>
        </span>
      ))}
    </span>
  );
}
