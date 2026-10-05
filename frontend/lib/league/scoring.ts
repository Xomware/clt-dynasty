const LABELS: Record<string, string> = {
  pass_yd: "Pass yards",
  pass_td: "Pass TD",
  pass_int: "Interception thrown",
  pass_2pt: "Pass 2PT",
  rush_yd: "Rush yards",
  rush_td: "Rush TD",
  rush_2pt: "Rush 2PT",
  rec: "Reception",
  rec_yd: "Rec yards",
  rec_td: "Rec TD",
  rec_2pt: "Rec 2PT",
  bonus_rec_te: "TE reception bonus",
  bonus_rec_wr: "WR reception bonus",
  bonus_rec_rb: "RB reception bonus",
  pr_td: "Punt return TD",
  kr_td: "Kick return TD",
  st_td: "Special teams TD",
  fum: "Fumble",
  fum_lost: "Fumble lost",
  fum_rec: "Fumble recovery",
  fum_rec_td: "Fumble recovery TD",
  fgm_0_19: "FG 0-19",
  fgm_20_29: "FG 20-29",
  fgm_30_39: "FG 30-39",
  fgm_40_49: "FG 40-49",
  fgm_50p: "FG 50+",
  fgmiss: "FG missed",
  xpm: "XP made",
  xpmiss: "XP missed",
};

// The old site's groups. Kicking only shows when the lineup has a kicker.
const GROUPS: { name: string; prefixes: string[]; slot?: string }[] = [
  { name: "Passing", prefixes: ["pass_"] },
  { name: "Rushing", prefixes: ["rush_"] },
  { name: "Receiving", prefixes: ["rec", "bonus_rec"] },
  { name: "Returns", prefixes: ["pr_", "kr_", "st_td"] },
  { name: "Fumbles", prefixes: ["fum"] },
  { name: "Kicking", prefixes: ["fg", "xp"], slot: "K" },
];

export interface ScoringGroup {
  name: string;
  rules: { key: string; label: string; value: number }[];
}

const title = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function scoringGroups(settings: Record<string, number>, rosterPositions: string[]): ScoringGroup[] {
  const used = new Set<string>();
  return GROUPS.filter((g) => !g.slot || rosterPositions.includes(g.slot))
    .map((g) => ({
      name: g.name,
      rules: Object.entries(settings)
        .filter(([key, value]) => value !== 0 && !used.has(key) && g.prefixes.some((p) => key.startsWith(p)))
        .map(([key, value]) => {
          used.add(key);
          return { key, label: LABELS[key] ?? title(key), value };
        })
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    }))
    .filter((g) => g.rules.length > 0);
}

// Yardage reads better per yard than per 25: 0.04 is "1 per 25 yards".
export function pointsText(key: string, value: number): string {
  const sign = value > 0 ? "+" : "";
  if (key.endsWith("_yd") && Math.abs(value) < 1) return `${sign}${value} (1 per ${Math.round(1 / Math.abs(value))} yds)`;
  return `${sign}${value}`;
}
