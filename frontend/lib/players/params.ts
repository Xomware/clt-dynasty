import { fold } from "@/lib/search/nfl";

// The Players page keeps its whole view in one window param, so a link or
// Back restores the filters and the scenario. Window links join params with
// ":" and the shell joins windows with ",", so neither may appear in it:
// fields are `key-value` joined by "~", lists joined by ".".
export type Fields = Map<string, string>;

export function decode(v: string): Fields {
  const fields: Fields = new Map();
  for (const part of v.split("~")) {
    const at = part.indexOf("-");
    if (at > 0 && at < part.length - 1) fields.set(part.slice(0, at), part.slice(at + 1));
  }
  return fields;
}

export const encode = (fields: Fields) => [...fields].map(([k, v]) => `${k}-${v}`).join("~");

export const list = (s: string | undefined) => (s ? s.split(".").filter(Boolean) : []);

export const POSITIONS = ["QB", "RB", "WR", "TE", "K"] as const;

export type Owner = "any" | "available" | "mine" | number;
export type Slot = "any" | "active" | "taxi" | "ir";
export type Health = "any" | "healthy" | "questionable" | "out";
export const SORTS = ["pts", "ppg", "rank", "proj", "ros", "value", "age"] as const;
export type SortKey = (typeof SORTS)[number];

export interface View {
  q: string;
  pos: string[];
  nfl: string;
  owner: Owner;
  slot: Slot;
  health: Health;
  rookies: boolean;
  ageMin: number | null;
  ageMax: number | null;
  sort: SortKey;
  desc: boolean;
}

// Best first, except rank and age, where smaller leads.
export const naturalDesc = (sort: SortKey) => sort !== "rank" && sort !== "age";

export const DEFAULT_VIEW: View = {
  q: "",
  pos: [],
  nfl: "",
  owner: "any",
  slot: "any",
  health: "any",
  rookies: false,
  ageMin: null,
  ageMax: null,
  sort: "pts",
  desc: true,
};

const SLOTS: Slot[] = ["any", "active", "taxi", "ir"];
const HEALTH: Health[] = ["any", "healthy", "questionable", "out"];
const pick = <T extends string>(options: readonly T[], s: string | undefined, fallback: T): T => (options.includes(s as T) ? (s as T) : fallback);
const age = (s: string | undefined) => (s && /^\d{2}$/.test(s) ? Number(s) : null);

function owner(s: string | undefined): Owner {
  if (s === "available" || s === "mine") return s;
  return s && /^[1-9]\d?$/.test(s) ? Number(s) : "any";
}

// Search text as the search folds it, minus the characters the link reserves.
export const cleanQuery = (q: string) => fold(q).replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trimStart().slice(0, 40);

export function readView(fields: Fields): View {
  const sort = pick(SORTS, fields.get("sort"), DEFAULT_VIEW.sort);
  return {
    q: cleanQuery(fields.get("q") ?? ""),
    pos: list(fields.get("pos")).filter((p) => (POSITIONS as readonly string[]).includes(p)),
    nfl: /^[A-Z]{2,3}$/.test(fields.get("nfl") ?? "") ? (fields.get("nfl") as string) : "",
    owner: owner(fields.get("own")),
    slot: pick(SLOTS, fields.get("slot"), "any"),
    health: pick(HEALTH, fields.get("hl"), "any"),
    rookies: fields.get("rk") === "1",
    ageMin: age(fields.get("amin")),
    ageMax: age(fields.get("amax")),
    sort,
    desc: fields.has("dir") ? fields.get("dir") === "desc" : naturalDesc(sort),
  };
}

// Only what differs from the default, so a plain view links as `players`.
export function writeView(view: View, fields: Fields = new Map()): Fields {
  const out = new Map(fields);
  const set = (k: string, v: string | null) => (v ? out.set(k, v) : out.delete(k));
  set("q", view.q.trim());
  set("pos", view.pos.join("."));
  set("nfl", view.nfl);
  set("own", view.owner === "any" ? null : String(view.owner));
  set("slot", view.slot === "any" ? null : view.slot);
  set("hl", view.health === "any" ? null : view.health);
  set("rk", view.rookies ? "1" : null);
  set("amin", view.ageMin === null ? null : String(view.ageMin));
  set("amax", view.ageMax === null ? null : String(view.ageMax));
  set("sort", view.sort === DEFAULT_VIEW.sort ? null : view.sort);
  set("dir", view.desc === naturalDesc(view.sort) ? null : view.desc ? "desc" : "asc");
  return out;
}

export const TABS = ["list", "sim", "compare"] as const;

// `players`, `players:<tab>`, `players:<v>` or `players:<tab>:<v>`: the
// window link lists param values in key order, and an empty one is left out.
export function readPlayersLink(value: string) {
  const params: Record<string, string> = {};
  for (const part of value.split(":")) {
    if ((TABS as readonly string[]).includes(part)) params.tab = part;
    else if (part) params.v = part;
  }
  return params;
}
