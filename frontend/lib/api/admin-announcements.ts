import type { Announcement } from "@/lib/announcements";

import { request } from "./client";

export type AnnouncementFields = Pick<Announcement, "title" | "body" | "priority" | "expires_at" | "is_active" | "display_order">;

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

// Every row, inactive and expired included.
export const listAllAnnouncements = () =>
  request<{ rows: Announcement[] }>("/admin/announcements-list");

export const createAnnouncement = (fields: AnnouncementFields) =>
  post<{ row: Announcement }>("/admin/announcements-create", fields).then((r) => r.row);

export const updateAnnouncement = (id: string, fields: Partial<AnnouncementFields>) =>
  post<{ row: Announcement }>("/admin/announcements-update", { id, fields }).then((r) => r.row);

// A soft delete: the row stays, with is_active false.
export const deleteAnnouncement = (id: string) =>
  post<{ row: Announcement }>("/admin/announcements-delete", { id }).then((r) => r.row);
