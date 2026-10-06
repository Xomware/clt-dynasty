import { request } from "./client";

// CLT's own emails (new proposal, decision, steal request) go out only while this is on.
export const getEmailNotifications = () =>
  request<{ emailNotifications: boolean }>("/clt/settings").then((r) => r.emailNotifications);

export const setEmailNotifications = (on: boolean) =>
  request<{ emailNotifications: boolean }>("/clt/settings-update", {
    method: "POST",
    body: JSON.stringify({ emailNotifications: on }),
  }).then((r) => r.emailNotifications);
