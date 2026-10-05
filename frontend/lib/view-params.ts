"use client";

import { createContext } from "react";

// A view's link state: its window kind's params, like a picked tab.
export type ViewParams = Record<string, string | number>;

// Set by the window or page a view sits in, so a picked tab lands in the
// view's params and its link without a history step. Outside one it is null
// and the view keeps its own state.
export const ViewParamsContext = createContext<((params: ViewParams) => void) | null>(null);
