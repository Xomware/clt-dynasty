// None of these are secret: pool and client ids ship in every Cognito web app
// (the client has no secret), and the hosted-UI domain is in the redirect URL
// every visitor sees.

// One backend: CLT calls Xomper's API, which gates /clt/* to the roster.
export const API_BASE = "https://api.xomper.xomware.com";

// The shared xomware-users pool and its xomware-auth prefix domain. The pool's
// one custom-domain slot belongs to Smirnoff.
export const COGNITO_USER_POOL_ID = "us-east-1_ZrN8NaaIv";
export const COGNITO_DOMAIN = "xomware-auth.auth.us-east-1.amazoncognito.com";

// clt-client, from SSM /xomware/shared/cognito/clients/clt-id at build time.
export const COGNITO_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";

// Sleeper renews the league id each season.
export const LEAGUE_ID = "1317249551823814656";
