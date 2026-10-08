// Sleeper's team codes (WAS, not ESPN's WSH), by division.
export const NFL_TEAMS = [
  { abbr: "BUF", city: "Buffalo", name: "Bills", division: "AFC East" },
  { abbr: "MIA", city: "Miami", name: "Dolphins", division: "AFC East" },
  { abbr: "NE", city: "New England", name: "Patriots", division: "AFC East" },
  { abbr: "NYJ", city: "New York", name: "Jets", division: "AFC East" },
  { abbr: "BAL", city: "Baltimore", name: "Ravens", division: "AFC North" },
  { abbr: "CIN", city: "Cincinnati", name: "Bengals", division: "AFC North" },
  { abbr: "CLE", city: "Cleveland", name: "Browns", division: "AFC North" },
  { abbr: "PIT", city: "Pittsburgh", name: "Steelers", division: "AFC North" },
  { abbr: "HOU", city: "Houston", name: "Texans", division: "AFC South" },
  { abbr: "IND", city: "Indianapolis", name: "Colts", division: "AFC South" },
  { abbr: "JAX", city: "Jacksonville", name: "Jaguars", division: "AFC South" },
  { abbr: "TEN", city: "Tennessee", name: "Titans", division: "AFC South" },
  { abbr: "DEN", city: "Denver", name: "Broncos", division: "AFC West" },
  { abbr: "KC", city: "Kansas City", name: "Chiefs", division: "AFC West" },
  { abbr: "LV", city: "Las Vegas", name: "Raiders", division: "AFC West" },
  { abbr: "LAC", city: "Los Angeles", name: "Chargers", division: "AFC West" },
  { abbr: "DAL", city: "Dallas", name: "Cowboys", division: "NFC East" },
  { abbr: "NYG", city: "New York", name: "Giants", division: "NFC East" },
  { abbr: "PHI", city: "Philadelphia", name: "Eagles", division: "NFC East" },
  { abbr: "WAS", city: "Washington", name: "Commanders", division: "NFC East" },
  { abbr: "CHI", city: "Chicago", name: "Bears", division: "NFC North" },
  { abbr: "DET", city: "Detroit", name: "Lions", division: "NFC North" },
  { abbr: "GB", city: "Green Bay", name: "Packers", division: "NFC North" },
  { abbr: "MIN", city: "Minnesota", name: "Vikings", division: "NFC North" },
  { abbr: "ATL", city: "Atlanta", name: "Falcons", division: "NFC South" },
  { abbr: "CAR", city: "Carolina", name: "Panthers", division: "NFC South" },
  { abbr: "NO", city: "New Orleans", name: "Saints", division: "NFC South" },
  { abbr: "TB", city: "Tampa Bay", name: "Buccaneers", division: "NFC South" },
  { abbr: "ARI", city: "Arizona", name: "Cardinals", division: "NFC West" },
  { abbr: "LAR", city: "Los Angeles", name: "Rams", division: "NFC West" },
  { abbr: "SF", city: "San Francisco", name: "49ers", division: "NFC West" },
  { abbr: "SEA", city: "Seattle", name: "Seahawks", division: "NFC West" },
] as const;

export type NflTeam = (typeof NFL_TEAMS)[number];

export const nflTeam = (abbr: string | undefined): NflTeam | undefined => NFL_TEAMS.find((t) => t.abbr === abbr);

export const nflTeamName = (t: NflTeam) => `${t.city} ${t.name}`;

// The CDN only has lowercase file names; LAC.png is a 404.
export const nflLogo = (abbr: string) => `https://sleepercdn.com/images/team_logos/nfl/${abbr.toLowerCase()}.png`;

// A defense's player id is its team code, and its picture is the logo.
export const headshot = (id: string, position?: string) =>
  position === "DEF" ? nflLogo(id) : `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`;

// End zone paint and lettering: the primary color, and whichever team color
// reads on it (cream where neither does). Black is the near-black most teams print.
export const NFL_COLORS: Record<string, [string, string]> = {
  ARI: ["#97233f", "#ffb612"],
  ATL: ["#a71930", "#f4f1e6"],
  BAL: ["#241773", "#c9a227"],
  BUF: ["#00338d", "#f4f1e6"],
  CAR: ["#0085ca", "#101820"],
  CHI: ["#0b162a", "#c83803"],
  CIN: ["#fb4f14", "#101820"],
  CLE: ["#311d00", "#ff3c00"],
  DAL: ["#003594", "#f4f1e6"],
  DEN: ["#fb4f14", "#002244"],
  DET: ["#0076b6", "#f4f1e6"],
  GB: ["#203731", "#ffb612"],
  HOU: ["#03202f", "#e0334a"],
  IND: ["#002c5f", "#f4f1e6"],
  JAX: ["#006778", "#d7a22a"],
  KC: ["#e31837", "#ffb81c"],
  LV: ["#101820", "#a5acaf"],
  LAC: ["#0080c6", "#ffc20e"],
  LAR: ["#003594", "#ffa300"],
  MIA: ["#008e97", "#f4f1e6"],
  MIN: ["#4f2683", "#ffc62f"],
  NE: ["#002244", "#f4f1e6"],
  NO: ["#d3bc8d", "#101820"],
  NYG: ["#0b2265", "#f4f1e6"],
  NYJ: ["#125740", "#f4f1e6"],
  PHI: ["#004c54", "#f4f1e6"],
  PIT: ["#ffb612", "#101820"],
  SF: ["#aa0000", "#f4f1e6"],
  SEA: ["#002244", "#69be28"],
  TB: ["#d50a0a", "#f4f1e6"],
  TEN: ["#0c2340", "#4b92db"],
  WAS: ["#5a1414", "#ffb612"],
};
