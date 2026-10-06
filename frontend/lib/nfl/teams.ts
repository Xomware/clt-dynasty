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
