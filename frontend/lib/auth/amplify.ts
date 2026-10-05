"use client";

import { Amplify } from "aws-amplify";

import { COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_USER_POOL_ID } from "@/lib/config";

// Configured at module scope rather than in an effect: API calls fetch the
// session outside React, and an effect-based config would race a request
// fired during the first render.

// Google is the only way in, so a build without the client id cannot sign anyone in.
export const authConfigured = Boolean(COGNITO_CLIENT_ID);

export const CALLBACK_PATH = "/auth/callback";

if (authConfigured) {
  // Built from the live origin so one bundle works on localhost and in
  // production; both are registered on the app client.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: COGNITO_USER_POOL_ID,
        userPoolClientId: COGNITO_CLIENT_ID,
        loginWith: {
          oauth: {
            domain: COGNITO_DOMAIN,
            scopes: ["email", "openid", "profile"],
            redirectSignIn: [`${origin}${CALLBACK_PATH}`],
            redirectSignOut: [origin],
            responseType: "code",
          },
        },
      },
    },
  });
}
