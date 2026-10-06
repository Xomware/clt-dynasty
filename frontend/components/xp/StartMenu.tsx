import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { START_PINNED, START_PLACES } from "@/lib/desktop/groups";
import { readRecent } from "@/lib/desktop/recent";
import { type Launcher, useLauncherGroups, useLaunchers, type WindowKind } from "@/lib/desktop/registry";
import { TASKBAR_HEIGHT } from "@/lib/desktop/windows";
import { CrownIcon, DesktopIcon, FolderIcon, UptownIcon } from "./icons";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Up and Down walk the buttons of one list level; a cascade's own buttons are
// a level of their own.
function moveFocus(e: KeyboardEvent<HTMLElement>, buttons: HTMLButtonElement[]) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  e.stopPropagation();
  if (buttons.length === 0) return;
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const step = e.key === "ArrowDown" ? 1 : -1;
  const next = at === -1 ? (step === 1 ? 0 : buttons.length - 1) : (at + step + buttons.length) % buttons.length;
  buttons[next].focus();
}

// The menu's own buttons, outside any open cascade.
const mainButtons = (menu: HTMLElement) =>
  [...menu.querySelectorAll<HTMLButtonElement>("button")].filter((b) => !b.closest(".xp-start-submenu"));

const levelButtons = (list: HTMLElement) => [...list.querySelectorAll<HTMLButtonElement>(":scope > li > button")];

const Arrow = () => (
  <svg viewBox="0 0 8 8" width={8} height={8} aria-hidden focusable="false" className="ml-auto flex-none">
    <path d="M2 0l4 4-4 4z" className="fill-current" />
  </svg>
);

interface CascadeProps {
  id: string;
  label: string;
  anchor: DOMRect;
  focus: boolean;
  onClose: () => void;
  children: ReactNode;
}

// XP's cascading menu: fixed to the right of its row so the scrolling menu
// can't clip it, nudged up to stay clear of the taskbar, flipped left if the
// screen runs out on the right.
function Cascade({ id, label, anchor, focus, onClose, children }: CascadeProps) {
  const ref = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const floor = window.innerHeight - TASKBAR_HEIGHT;
    el.style.top = `${Math.max(0, Math.min(anchor.top, floor - el.offsetHeight))}px`;
    const right = anchor.right - 2;
    el.style.left = `${right + el.offsetWidth > window.innerWidth ? Math.max(0, anchor.left - el.offsetWidth + 2) : right}px`;
    if (focus) levelButtons(el)[0]?.focus();
  }, [anchor, focus]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowLeft" || e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    moveFocus(e, levelButtons(e.currentTarget));
  };

  return (
    <ul ref={ref} id={id} aria-label={label} className="xp-start-submenu" style={{ top: anchor.top, left: anchor.right }} onKeyDown={onKeyDown}>
      {children}
    </ul>
  );
}

interface Open {
  rect: DOMRect;
  focus: boolean;
}

interface CascadeRowProps {
  id: string;
  label: string;
  Icon: IconType;
  open: Open | null;
  onShow: (open: Open) => void;
  onHide: () => void;
  className?: string;
  children: ReactNode;
}

// Opens on mouse hover, on a click or tap, or on Right from the keyboard. Only
// the keyboard toggles it shut: a mouse click always follows a hover, and a
// tap's pointerleave fires the moment the finger lifts.
function CascadeRow({ id, label, Icon, open, onShow, onHide, className = "", children }: CascadeRowProps) {
  const button = useRef<HTMLButtonElement>(null);
  const show = (el: Element, focus: boolean) => onShow({ rect: el.getBoundingClientRect(), focus });
  return (
    <li
      onPointerEnter={(e) => e.pointerType === "mouse" && show(e.currentTarget, false)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHide()}
    >
      <button
        ref={button}
        type="button"
        className={`xp-start-menu-link w-full ${className}`}
        aria-expanded={open !== null}
        aria-controls={open ? id : undefined}
        onClick={(e) => (e.detail === 0 && open ? onHide() : show(e.currentTarget, e.detail === 0))}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight") return;
          e.preventDefault();
          e.stopPropagation();
          show(e.currentTarget, true);
        }}
      >
        <Icon width={24} height={24} className="flex-none" />
        {label}
        <Arrow />
      </button>
      {open && (
        <Cascade
          id={id}
          label={label}
          anchor={open.rect}
          focus={open.focus}
          onClose={() => {
            onHide();
            button.current?.focus();
          }}
        >
          {children}
        </Cascade>
      )}
    </li>
  );
}

interface ProgramProps {
  launcher: Launcher;
  onOpen: (kind: WindowKind) => void;
  size?: number;
  className?: string;
}

function Program({ launcher: { kind, label, Icon }, onOpen, size = 24, className = "" }: ProgramProps) {
  return (
    <li>
      <button type="button" className={`xp-start-menu-link w-full ${className}`} onClick={() => onOpen(kind)}>
        <Icon width={size} height={size} className="flex-none" />
        {label}
      </button>
    </li>
  );
}

function AllPrograms({ onOpen }: { onOpen: (kind: WindowKind) => void }) {
  const { pinned, groups } = useLauncherGroups();
  const [programs, setPrograms] = useState<Open | null>(null);
  const [group, setGroup] = useState<{ id: string; open: Open } | null>(null);

  return (
    <ul className="xp-start-all">
      <CascadeRow
        id="start-all-programs"
        label="All Programs"
        Icon={FolderIcon}
        className="xp-start-all-link"
        open={programs}
        onShow={setPrograms}
        onHide={() => {
          setPrograms(null);
          setGroup(null);
        }}
      >
        {pinned.map((l) => (
          <Program key={l.kind} launcher={l} onOpen={onOpen} />
        ))}
        {groups.map((g) => (
          <CascadeRow
            key={g.id}
            id={`start-group-${g.id}`}
            label={g.label}
            Icon={FolderIcon}
            open={group?.id === g.id ? group.open : null}
            onShow={(open) => setGroup({ id: g.id, open })}
            onHide={() => setGroup((cur) => (cur?.id === g.id ? null : cur))}
          >
            {g.items.map((l) => (
              <Program key={l.kind} launcher={l} onOpen={onOpen} />
            ))}
          </CascadeRow>
        ))}
      </CascadeRow>
    </ul>
  );
}

interface StartMenuProps {
  id: string;
  name: string;
  // Opened from the keyboard: focus lands on the first program.
  autoFocus: boolean;
  onOpen: (kind: WindowKind) => void;
  onReset: () => void;
  onUptown: () => void;
  onSignOut: () => void;
}

export function StartMenu({ id, name, autoFocus, onOpen, onReset, onUptown, onSignOut }: StartMenuProps) {
  const launchers = useLaunchers();
  const [recentKinds] = useState(readRecent);
  const ref = useRef<HTMLElement>(null);
  const pick = (kinds: string[]) => kinds.flatMap((k) => launchers.filter((l) => l.kind === k));
  const recent = pick(recentKinds.filter((k) => !START_PINNED.includes(k))).slice(0, 3);

  useLayoutEffect(() => {
    if (autoFocus && ref.current) mainButtons(ref.current)[0]?.focus();
  }, [autoFocus]);

  return (
    <nav
      ref={ref}
      id={id}
      className="xp-start-menu"
      aria-label="Start menu"
      onKeyDown={(e) => moveFocus(e, mainButtons(e.currentTarget))}
    >
      <div className="xp-start-menu-header">
        <span className="xp-start-menu-avatar">
          <CrownIcon width={36} height={36} />
        </span>
        <span className="truncate">{name}</span>
      </div>
      <div className="xp-start-columns">
        <div className="xp-start-programs">
          <ul aria-label="Pinned">
            {pick(START_PINNED).map((l) => (
              <Program key={l.kind} launcher={l} onOpen={onOpen} size={32} className="xp-start-pinned" />
            ))}
          </ul>
          {recent.length > 0 && (
            <ul aria-label="Recent" className="xp-start-recent">
              {recent.map((l) => (
                <Program key={l.kind} launcher={l} onOpen={onOpen} />
              ))}
            </ul>
          )}
          <AllPrograms onOpen={onOpen} />
        </div>
        <ul aria-label="Places" className="xp-start-places">
          {pick(START_PLACES).map((l) => (
            <Program key={l.kind} launcher={l} onOpen={onOpen} />
          ))}
          <li className="xp-start-places-rule">
            <button type="button" className="xp-start-menu-link w-full" onClick={onReset}>
              <DesktopIcon width={24} height={24} className="flex-none" />
              Reset desktop
            </button>
          </li>
          <li>
            <button type="button" className="xp-start-menu-link w-full" onClick={onUptown}>
              <UptownIcon width={24} height={24} className="flex-none" />
              Uptown theme
            </button>
          </li>
        </ul>
      </div>
      <div className="xp-start-menu-footer">
        <span className="mr-auto">CLT Dynasty League</span>
        <button type="button" className="xp-log-off" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
