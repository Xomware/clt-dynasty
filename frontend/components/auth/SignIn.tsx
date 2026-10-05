import { LogonScreen } from "./LogonScreen";

interface SignInProps {
  // Absent when this build has no Cognito client id, which leaves the tile disabled.
  onSignIn?: () => void;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width={32} height={32} aria-hidden="true" focusable="false">
      <path fill="#ea4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285f4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#fbbc05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34a853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function SignIn({ onSignIn }: SignInProps) {
  return (
    <LogonScreen footer={<span>A private league site. Members sign in with Google.</span>}>
      <h1>To begin, sign in</h1>
      <button type="button" className="xp-user-tile" onClick={onSignIn} disabled={!onSignIn}>
        <span className="xp-user-tile-picture">
          <GoogleMark />
        </span>
        Sign in with Google
      </button>
      {!onSignIn && <p role="alert">Sign-in isn&rsquo;t set up in this build.</p>}
    </LogonScreen>
  );
}
