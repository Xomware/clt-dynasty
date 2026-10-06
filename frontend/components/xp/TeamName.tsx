import { StarIcon } from "./icons";
import { TeamAvatar } from "./TeamAvatar";

interface TeamNameProps {
  name: string;
  avatarUrl?: string | null;
  isMine?: boolean;
}

// A team's avatar and name, starred when it is the signed-in member's.
export function TeamName({ name, avatarUrl, isMine = false }: TeamNameProps) {
  return (
    <span className="xp-team">
      <TeamAvatar name={name} url={avatarUrl} />
      <span className="xp-team-name">{name}</span>
      {isMine && <StarIcon className="shrink-0" role="img" aria-hidden={false} aria-label="Your team" />}
    </span>
  );
}
