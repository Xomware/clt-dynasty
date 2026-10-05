import { getPlayers } from "@/lib/api/players";
import { sharedResource } from "@/lib/shared-resource";

// About 4,000 players, so they load the first time a lineup opens, not with the league.
const resource = sharedResource(async () => ({ status: "ok" as const, players: await getPlayers() }));

export const usePlayers = resource.use;
