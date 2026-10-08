// The signed-in member's Sleeper user id, kept so the next session's intro
// can light their team's tile before /clt/me has answered.
const ME_KEY = "clt.intro.me";

export function rememberMe(sleeperUserId: string) {
  try {
    if (sleeperUserId) localStorage.setItem(ME_KEY, sleeperUserId);
    else localStorage.removeItem(ME_KEY);
  } catch {
    // Storage refused: the tile just isn't lit next time.
  }
}

export function rememberedMe(): string | null {
  try {
    return localStorage.getItem(ME_KEY);
  } catch {
    return null;
  }
}

export const forgetMe = () => rememberMe("");
