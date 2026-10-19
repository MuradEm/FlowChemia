import { useCallback, useEffect, useState } from "react";
import AccountWorkspace from "./AccountWorkspace";
import DemoWorkspace from "./DemoWorkspace";
import Login from "./Login";
import { ApiError, logout } from "./api";
import type { Session } from "./api";

export default function App() {
  // The bearer token and all real company data stay in memory, never browser storage.
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const expired = useCallback(() => {
    setSession(null);
    setMessage("Your session has expired. Please sign in again.");
  }, []);
  useEffect(() => {
    if (!session) return;
    const remaining = Date.parse(session.expiresAt) - Date.now();
    if (remaining <= 0) {
      expired();
      return;
    }
    const timer = window.setTimeout(expired, remaining);
    return () => window.clearTimeout(timer);
  }, [session, expired]);

  async function signOut() {
    if (!session || signingOut) return;
    setSigningOut(true);
    // Clear all real data immediately, even if the server cannot confirm revocation.
    const token = session.token;
    setSession(null);
    setMessage("Signing out…");
    try {
      await logout(token);
      setMessage("You’ve been signed out.");
    } catch (failure) {
      setMessage(
        failure instanceof ApiError && failure.status === 401
          ? "You’ve been signed out."
          : "You’re signed out on this browser. Server sign-out could not be confirmed; the previous session may remain valid until it expires.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (demo) return <DemoWorkspace onExit={() => setDemo(false)} />;
  if (session)
    return (
      <AccountWorkspace
        key={session.user.id}
        session={session}
        onExpired={expired}
        onExit={() => void signOut()}
      />
    );
  if (signingOut)
    return (
      <div className="auth-page">
        <main className="auth-card">
          <h1>
            Signing out<span>…</span>
          </h1>
          <p role="status">Closing your session.</p>
        </main>
      </div>
    );
  return (
    <Login
      message={message}
      onLogin={(value) => {
        setMessage("");
        setSession(value);
      }}
      onDemo={() => {
        setMessage("");
        setDemo(true);
      }}
    />
  );
}
