"use client";

import { useState } from "react";

export interface SavedScenario {
  id: string;
  name: string;
  // The scenario's link fields, as the page writes them.
  v: string;
}

const KEY = "clt.players.scenarios";
export const MAX_SAVED = 6;

const isSaved = (x: unknown): x is SavedScenario =>
  typeof x === "object" && x !== null && typeof (x as SavedScenario).id === "string" && typeof (x as SavedScenario).name === "string" && typeof (x as SavedScenario).v === "string";

// Private browsing and full storage both throw; the page works without saving.
function read(): SavedScenario[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSaved).slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

function write(list: SavedScenario[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// Scenarios saved on this device, newest first. `save` reports false when the
// browser wouldn't store it.
export function useSavedScenarios() {
  const [list, setList] = useState(read);
  const commit = (next: SavedScenario[]) => {
    const ok = write(next);
    if (ok) setList(next);
    return ok;
  };
  return {
    list,
    save: (name: string, v: string) => commit([{ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, v }, ...list].slice(0, MAX_SAVED)),
    remove: (id: string) => commit(list.filter((s) => s.id !== id)),
  };
}
