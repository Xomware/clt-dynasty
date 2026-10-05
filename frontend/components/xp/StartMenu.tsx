import { launchers, type WindowKind } from "@/lib/desktop/registry";
import { CrownIcon, DesktopIcon } from "./icons";

interface StartMenuProps {
  id: string;
  name: string;
  onOpen: (kind: WindowKind) => void;
  onReset: () => void;
  onSignOut: () => void;
}

export function StartMenu({ id, name, onOpen, onReset, onSignOut }: StartMenuProps) {
  const programs = launchers();
  return (
    <nav id={id} className="xp-start-menu" aria-label="Start menu">
      <div className="xp-start-menu-header">
        <span className="xp-start-menu-avatar">
          <CrownIcon width={36} height={36} />
        </span>
        <span className="truncate">{name}</span>
      </div>
      <ul className="xp-start-menu-list">
        {programs.map(({ kind, label, Icon }) => (
          <li key={kind}>
            <button type="button" className="xp-start-menu-link w-full" onClick={() => onOpen(kind)}>
              <Icon width={24} height={24} />
              {label}
            </button>
          </li>
        ))}
        {programs.length === 0 && <li className="xp-start-menu-empty">League windows land here as they&rsquo;re built.</li>}
        <li>
          <button type="button" className="xp-start-menu-link w-full" onClick={onReset}>
            <DesktopIcon width={24} height={24} />
            Reset desktop
          </button>
        </li>
      </ul>
      <div className="xp-start-menu-footer">
        <span className="mr-auto">CLT Dynasty League</span>
        <button type="button" className="xp-log-off" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
