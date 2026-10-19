import JoinCompany from "./JoinCompany";
import { useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import { errorMessage, login } from "./api";
import type { Session } from "./api";
import { Icon } from "./Icon";

export default function Login({
  message,
  onLogin,
  onDemo,
}: {
  message: string;
  onLogin: (session: Session) => void;
  onDemo: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await login(email, password);
      setPassword("");
      onLogin(session);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  if (joining)
    return (
      <JoinCompany
        onBack={() => setJoining(false)}
        onJoined={() => {
          setJoining(false);
          setJoined(true);
        }}
      />
    );
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img src={brandIcon} alt="" />
        <span>FlowChemia</span>
      </div>
      <main className="auth-card">
        <span className="eyebrow">BETTER TEAMS START HERE</span>
        <h1>
          Welcome to FlowChemia<span>.</span>
        </h1>
        <p className="auth-intro">
          Sign in to share your experience and see your check-ins.
        </p>
        {joined && (
          <p className="auth-message" role="status">
            Your account is ready. Sign in with the invited email and your new
            password.
          </p>
        )}
        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={submit} aria-label="Sign in">
          <label htmlFor="login-email">Work email</label>
          <input
            id="login-email"
            type="email"
            name="username"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={busy || !email.trim() || !password}
          >
            {busy ? "Signing in…" : "Sign in"} <Icon name="arrow" />
          </button>
        </form>
        <p className="auth-note">
          Use the account provided by your company. New colleagues join by
          invitation.
        </p>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setJoining(true)}
        >
          Accept an invitation
        </button>
        <div className="auth-divider">
          <span>Just looking around?</span>
        </div>
        <button
          className="secondary-button auth-demo"
          onClick={onDemo}
          disabled={busy}
        >
          Explore the demo <Icon name="spark" />
        </button>
      </main>
      <p className="auth-footer">The chemistry of how teams work together.</p>
    </div>
  );
}
