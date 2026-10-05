import { request } from "./client";

// A steal request as api_clt_taxi shapes it; `requestedBy` is a display name.
export interface TaxiRequest {
  playerId: string;
  rosterId: number;
  requestedBy: string;
  isMine: boolean;
  createdAt: string;
}

export const listTaxiRequests = () =>
  request<{ leagueId: string; requests: TaxiRequest[] }>("/clt/taxi-list").then((r) => r.requests);

// 400 when the player isn't on a taxi squad or sits on the caller's own; 409 when already requested.
export const requestSteal = (playerId: string) =>
  request<{ request: TaxiRequest }>("/clt/taxi-request", { method: "POST", body: JSON.stringify({ playerId }) }).then(
    (r) => r.request,
  );
