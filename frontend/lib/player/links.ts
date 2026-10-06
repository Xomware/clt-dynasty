import type { WindowLink } from "@/lib/desktop/deep-link";

export const playerLink = (playerId: string): WindowLink => ({ kind: "player", params: { playerId } });

export const nflLink = (team: string): WindowLink => ({ kind: "nfl", params: { team } });
