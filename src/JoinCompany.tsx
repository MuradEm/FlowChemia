import { useRef, useState } from "react";
import { acceptInvitation, ApiError, errorMessage } from "./api";

export default function JoinCompany({
  sessionToken,
  onJoined,
  onBack,
}: {
  sessionToken?: string;
  onJoined: () => void;
  onBack: () => void;
}) {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  return (
    <div className="auth-page">
      <main className="auth-card">
        <span className="eyebrow">YOUR NEXT TEAM</span>
        <h1>
          {done ? "You’re invited in" : "Join a company"}
          <span>.</span>
        </h1>
        {done ? (
          <>
            <p className="auth-intro" role="status">
              {sessionToken
                ? "Your company membership is ready."
                : "Your account has been created. Sign in using the email address your invitation was sent to and your new password."}
            </p>
            <button className="primary-button" onClick={onJoined}>
              {sessionToken ? "Choose your company" : "Go to sign in"}
            </button>
          </>
        ) : (
          <>
            <p className="auth-intro">
              {sessionToken
                ? "Accept an invitation for the account you’re signed in to. The invitation must match your account’s email."
                : "Create your account using the token shared by your administrator. Already have an account? Sign in first, then choose Switch company → Join a company."}
            </p>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <form
              className="setup-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (lock.current || uncertain) return;
                if (!sessionToken && password !== confirmation) {
                  setError("The passwords do not match.");
                  return;
                }
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  await acceptInvitation(
                    token,
                    sessionToken
                      ? undefined
                      : { displayName: name.trim(), password },
                    sessionToken,
                  );
                  setToken("");
                  setPassword("");
                  setConfirmation("");
                  setDone(true);
                } catch (failure) {
                  const status =
                    failure instanceof ApiError ? failure.status : 0;
                  if (status === 0 || status >= 500) {
                    setUncertain(true);
                    setError(
                      "We couldn’t confirm whether you joined. Try signing in and checking your companies before using the invitation again. Your administrator can also check the colleague list.",
                    );
                  } else if (status === 401)
                    setError(
                      sessionToken
                        ? "Sign in to the account matching the invitation email. If your session has expired, sign out and sign in again."
                        : "This invitation belongs to an existing account. Go back and sign in first.",
                    );
                  else if (status === 400)
                    setError(
                      "The invitation could not be accepted. Check the token and account details. The token may have expired or already been used.",
                    );
                  else setError(errorMessage(failure));
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="join-token">Invitation token</label>
              <input
                id="join-token"
                required
                pattern="[A-Za-z0-9_-]{43}"
                maxLength={43}
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                disabled={busy || uncertain}
              />
              {!sessionToken && (
                <>
                  <label htmlFor="join-name">Your name</label>
                  <input
                    id="join-name"
                    required
                    maxLength={120}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy || uncertain}
                  />
                  <label htmlFor="join-password">Create a password</label>
                  <input
                    id="join-password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy || uncertain}
                    aria-describedby="password-hint"
                  />
                  <p className="setup-note" id="password-hint">
                    Use 12–128 characters.
                  </p>
                  <label htmlFor="join-confirm">Confirm password</label>
                  <input
                    id="join-confirm"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    disabled={busy || uncertain}
                  />
                </>
              )}
              <button className="primary-button" disabled={busy || uncertain}>
                {busy ? "Joining…" : "Accept invitation"}
              </button>
            </form>
            <button
              className="text-button join-back"
              onClick={onBack}
              disabled={busy}
            >
              {sessionToken ? "Back to companies" : "Back to sign in"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
