import { request } from "@/lib/api/client";
import { sharedResource } from "@/lib/shared-resource";

// A row of Supabase league_announcements as Xomper's GET /announcements/list
// (api_announcements) returns it: active and unexpired, critical first, then
// by display_order.
export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "critical" | "info";
  expires_at: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// The Lambda caches for five minutes itself, so re-reading sooner gains nothing.
export const announcements = sharedResource(async () => {
  const { rows } = await request<{ Success: boolean; count: number; rows: Announcement[] }>("/announcements/list");
  return { status: "ok" as const, rows };
}, 5 * 60_000);
