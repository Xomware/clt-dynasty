"use client";

import { Component, type PointerEvent, type ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  BackArrowIcon,
  CloseGlyph,
  ForwardArrowIcon,
  LinkGlyph,
  MaximizeGlyph,
  MinimizeGlyph,
  RestoreGlyph,
} from "@/components/xp/icons";
import { useAlerts } from "@/lib/alerts/alerts";
import { type WindowLink, windowUrl } from "@/lib/desktop/deep-link";
import { useDesktop } from "@/lib/desktop/desktop-context";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useWindowTitle } from "@/lib/desktop/registry";
import { backTarget, historyOf, TASKBAR_HEIGHT, viewKey, type WindowState, type WindowView } from "@/lib/desktop/windows";
import { crumbLabel, ViewLabelContext } from "@/lib/nav/label";
import { useOpeners } from "@/lib/nav/openers";
import { ViewParamsContext } from "@/lib/view-params";

const MIN_W = 240;
const MIN_H = 140;

interface Drag {
  mode: "move" | "resize";
  px: number;
  py: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// One window's render error must not take the whole desktop down with it.
// Closing and reopening the window remounts it and tries again.
export class WindowBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p role="alert" className="window-error">
        This window hit an error. Close it and open it again.
      </p>
    );
  }
}

// Pages kept mounted either side of the current one in a window's history.
const KEEP = 3;

// A page behind or ahead of the current one never changes its own link.
const ignore = () => {};

const bodyKey = (i: number, view: WindowView) => `${i}:${viewKey(view.kind, view.params)}`;

function WindowLabel({ at, set, children }: { at: number; set: (at: number, label: string | null) => void; children: ReactNode }) {
  const label = useCallback((l: string | null) => set(at, l), [at, set]);
  return <ViewLabelContext value={label}>{children}</ViewLabelContext>;
}

interface DesktopWindowProps {
  win: WindowState;
}

export function DesktopWindow({ win }: DesktopWindowProps) {
  const { windows, active, dispatch, open } = useDesktop();
  const { notify } = useAlerts();
  const { Icon } = REGISTRY[win.kind];
  const titleOf = useWindowTitle();
  const title = titleOf(win);
  const { id } = win;
  const isActive = active?.id === id;
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<Drag | null>(null);
  const focusOnMount = useRef(isActive);
  const { views, at } = historyOf(win);
  const openers = useOpeners(ref);
  // Each page's scroll, by its body's key, so Back finds it where it was.
  const scrolls = useRef(new Map<string, number>());
  const bodies = useRef(new Map<string, HTMLDivElement>());
  const [labels, setLabels] = useState<Record<number, string | null>>({});
  const labelAt = (i: number) => labels[i] ?? crumbLabel(views[i]);
  const setLabel = useCallback((i: number, label: string | null) => setLabels((l) => (l[i] === label ? l : { ...l, [i]: label })), []);
  const target = backTarget(windows, win);
  const origin = win.from ? windows.find((w) => w.id === win.from) : undefined;
  const backLabel = !target ? null : "at" in target ? labelAt(target.at) : titleOf(target.window);
  const kept = views.map((view, i) => ({ view, i, key: bodyKey(i, view) })).filter(({ i }) => Math.abs(i - at) <= KEEP);
  const currentKey = bodyKey(at, views[at]);

  // The clicked link unmounts with the old view, so hand focus to the window
  // rather than letting it fall to <body>.
  const navigate = ({ kind, params }: WindowLink) => {
    openers.leave(at);
    dispatch({ type: "navigate", id, kind, params });
    ref.current?.focus({ preventScroll: true });
  };
  // A drill that opens a new window remembers this one, for that window's Back.
  const drill = ({ kind, params }: WindowLink) => open(kind, params, id);

  // A layout effect, not a passive one: focusing dispatches a focus action,
  // and a deferred one could land after the user opens another window and
  // raise this one back over it.
  useLayoutEffect(() => {
    if (focusOnMount.current) ref.current?.focus({ preventScroll: true });
  }, []);

  // Each page comes back scrolled where it was left; Back also hands focus to
  // the link that left it.
  const shownAt = useRef(at);
  useLayoutEffect(() => {
    const body = bodies.current.get(currentKey);
    if (body) body.scrollTop = scrolls.current.get(currentKey) ?? 0;
    if (shownAt.current === at) return;
    const back = at < shownAt.current;
    shownAt.current = at;
    if (back) openers.focus(at, ref.current);
    else ref.current?.focus({ preventScroll: true });
  }, [currentKey, at, openers]);

  // A window raised by anything but a click inside it (Back to the window it
  // opened, its taskbar button) takes the keyboard with it.
  useLayoutEffect(() => {
    if (isActive && !ref.current?.contains(document.activeElement)) ref.current?.focus({ preventScroll: true });
  }, [isActive]);

  const start = (mode: Drag["mode"], e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || win.maximized || (e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_HEIGHT;
    if (d.mode === "move") {
      dispatch({ type: "move", id, x: clamp(d.x + dx, 0, vw - d.w), y: clamp(d.y + dy, 0, vh - d.h) });
    } else {
      dispatch({ type: "resize", id, w: clamp(d.w + dx, MIN_W, vw - d.x), h: clamp(d.h + dy, MIN_H, vh - d.y) });
    }
  };

  const copyLink = async () => {
    const url = windowUrl(win);
    await navigator.clipboard.writeText(url);
    notify({ title: "Link copied", body: url, icon: "info" });
  };

  const end = () => {
    drag.current = null;
  };
  const dragHandlers = { onPointerMove, onPointerUp: end, onPointerCancel: end };

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={title}
      className="xp-window xp-desktop-window"
      data-active={isActive || undefined}
      data-maximized={win.maximized || undefined}
      hidden={win.minimized}
      style={win.maximized ? { zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDown={() => dispatch({ type: "focus", id })}
      onFocus={() => dispatch({ type: "focus", id })}
    >
      <header
        className="xp-titlebar"
        onPointerDown={(e) => start("move", e)}
        onDoubleClick={() => dispatch({ type: "toggleMaximize", id })}
        {...dragHandlers}
      >
        <Icon />
        <h2 className="xp-titlebar-text">{title}</h2>
        <span className="xp-titlebar-controls">
          <button type="button" className="xp-control" aria-label="Copy link" title="Copy link" onClick={() => void copyLink()}>
            <LinkGlyph />
          </button>
          <button type="button" className="xp-control" aria-label="Minimize" onClick={() => dispatch({ type: "minimize", id })}>
            <MinimizeGlyph />
          </button>
          <button
            type="button"
            className="xp-control"
            aria-label={win.maximized ? "Restore" : "Maximize"}
            onClick={() => dispatch({ type: "toggleMaximize", id })}
          >
            {win.maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </button>
          <button
            type="button"
            className="xp-control xp-control-close"
            aria-label="Close"
            onClick={() => dispatch({ type: "close", id })}
          >
            <CloseGlyph />
          </button>
        </span>
      </header>
      {/* Only once the window has somewhere to go back to, like Explorer's Back and Forward. */}
      {(views.length > 1 || origin) && (
        <div className="xp-toolbar">
          <button
            type="button"
            className="xp-nav"
            aria-label={backLabel ? `Back to ${backLabel}` : "Back"}
            title={backLabel ? `Back to ${backLabel} (Alt+Left)` : undefined}
            disabled={!target}
            onClick={() => dispatch({ type: "back", id })}
          >
            <BackArrowIcon width={24} height={24} />
            <span aria-hidden>Back</span>
          </button>
          <button
            type="button"
            className="xp-nav"
            aria-label={at < views.length - 1 ? `Forward to ${labelAt(at + 1)}` : "Forward"}
            title={at < views.length - 1 ? `Forward to ${labelAt(at + 1)} (Alt+Right)` : undefined}
            disabled={at === views.length - 1}
            onClick={() => dispatch({ type: "forward", id })}
          >
            <ForwardArrowIcon width={24} height={24} />
          </button>
          <nav aria-label="Address" className="xp-trail">
            <span aria-hidden className="xp-trail-label">
              Address
            </span>
            <ol className="xp-trail-field">
              {origin && (
                <li>
                  <button type="button" onClick={() => dispatch({ type: "focus", id: origin.id })}>
                    {titleOf(origin)}
                  </button>
                </li>
              )}
              {views.slice(0, at + 1).map((v, i) => (
                <li key={i} aria-current={i === at ? "page" : undefined}>
                  {i === at ? (
                    <span>{labelAt(i)}</span>
                  ) : (
                    <button type="button" onClick={() => dispatch({ type: "go", id, at: i })}>
                      {labelAt(i)}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
      {/* The pages either side of the current one stay mounted but hidden, so
          Back and Forward find them as they were left. */}
      <DrillContext value={drill}>
        {kept.map(({ view, i, key }) => {
          const { component: Body } = REGISTRY[view.kind];
          return (
            <div
              key={key}
              ref={(el) => {
                if (el) bodies.current.set(key, el);
                else bodies.current.delete(key);
              }}
              className="xp-window-body"
              hidden={i !== at}
              onScroll={(e) => scrolls.current.set(key, e.currentTarget.scrollTop)}
            >
              <WindowBoundary>
                <NavigateContext value={navigate}>
                  <ViewParamsContext value={i === at ? (params) => dispatch({ type: "patch", id, params }) : ignore}>
                    <WindowLabel at={i} set={setLabel}>
                      <Body params={view.params} />
                    </WindowLabel>
                  </ViewParamsContext>
                </NavigateContext>
              </WindowBoundary>
            </div>
          );
        })}
      </DrillContext>
      {!win.maximized && <div className="xp-resize" aria-hidden onPointerDown={(e) => start("resize", e)} {...dragHandlers} />}
    </section>
  );
}
