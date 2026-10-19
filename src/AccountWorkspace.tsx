import { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest, errorMessage, getProfile } from "./api";
import type { Profile, Session } from "./api";
import JoinCompany from "./JoinCompany";
import LiveWorkspace from "./LiveWorkspace";
import { Icon } from "./Icon";

export default function AccountWorkspace({
  session,
  onExpired,
  onExit,
}: {
  session: Session;
  onExpired: () => void;
  onExit: () => void;
}) {
  const createLock = useRef(false);
  const [creating, setCreating] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingError, setCreatingError] = useState("");
  const [createUncertain, setCreateUncertain] = useState(false);
  const [joining, setJoining] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [chooseExplicitly, setChooseExplicitly] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setProfile(null);
    setCompany(null);
    void getProfile(session.token, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (!value.user?.displayName || !Array.isArray(value.memberships))
          throw new ApiError(502, "Your account details could not be loaded.");
        setProfile(value);
        if (!chooseExplicitly && value.memberships.length === 1)
          setCompany(value.memberships[0].organization.id);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          if (failure instanceof ApiError && failure.status === 401)
            onExpired();
          else setError(errorMessage(failure));
        }
      });
    return () => controller.abort();
  }, [session, revision, chooseExplicitly, onExpired]);
  const membership = profile?.memberships.find(
    (m) => m.organization.id === company,
  );
  if (joining)
    return (
      <JoinCompany
        sessionToken={session.token}
        onBack={() => setJoining(false)}
        onJoined={() => {
          setJoining(false);
          setChooseExplicitly(true);
          setRevision((r) => r + 1);
        }}
      />
    );
  if (profile && membership)
    return (
      <LiveWorkspace
        key={`${profile.user.id}:${membership.organization.id}`}
        session={session}
        membership={membership}
        displayName={profile.user.displayName}
        onExpired={onExpired}
        onExit={onExit}
        onSwitchCompany={() => {
          setCompany(null);
          setProfile(null);
          setChooseExplicitly(true);
          setRevision((r) => r + 1);
        }}
      />
    );
  return (
    <div className="auth-page">
      <main className="auth-card company-card">
        <span className="eyebrow">YOUR WORKSPACE</span>
        <h1>
          {profile ? "Choose your company" : "Welcome back"}
          <span>.</span>
        </h1>
        {error ? (
          <div className="auth-error" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => setRevision((r) => r + 1)}
            >
              Try again
            </button>
          </div>
        ) : !profile ? (
          <p className="auth-intro" role="status">
            Loading your account…
          </p>
        ) : profile.memberships.length === 0 ? (
          <p className="auth-intro">
            You’re signed in, but you don’t have an active company membership
            yet. Ask your company administrator for an invitation.
          </p>
        ) : (
          <>
            <p className="auth-intro">
              Signed in as {profile.user.displayName}. Select the company you
              want to open.
            </p>
            <div className="company-list">
              {profile.memberships.map((m) => (
                <button
                  className="company-option"
                  key={m.id}
                  disabled={saving}
                  onClick={() => setCompany(m.organization.id)}
                >
                  <Icon name="building" />
                  <span>{m.organization.name}</span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          </>
        )}
        {profile && (
          <div className="company-setup-options">
            <button
              className="secondary-button"
              disabled={saving}
              onClick={() => setJoining(true)}
            >
              Join a company
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => setCreating(!creating)}
            >
              Create a company
            </button>
            {creating && (
              <form
                className="setup-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (createLock.current || createUncertain) return;
                  createLock.current = true;
                  setSaving(true);
                  setCreatingError("");
                  try {
                    await apiRequest("/organizations", {
                      token: session.token,
                      method: "POST",
                      body: { name: companyName.trim() },
                    });
                    setCreating(false);
                    setCompanyName("");
                    setChooseExplicitly(true);
                    setRevision((r) => r + 1);
                  } catch (failure) {
                    if (failure instanceof ApiError && failure.status === 401)
                      onExpired();
                    else if (
                      !(failure instanceof ApiError) ||
                      failure.status === 0 ||
                      failure.status >= 500
                    ) {
                      setCreateUncertain(true);
                      setCreatingError(
                        "We couldn’t confirm whether the company was created. Reload and sign in again to check your companies before trying again.",
                      );
                    } else setCreatingError(errorMessage(failure));
                  } finally {
                    createLock.current = false;
                    setSaving(false);
                  }
                }}
              >
                <label htmlFor="company-name">New company name</label>
                <input
                  id="company-name"
                  required
                  maxLength={120}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={saving || createUncertain}
                />
                <p className="setup-note">
                  You’ll be the owner of this separate company.
                </p>
                {creatingError && (
                  <p className="auth-error" role="alert">
                    {creatingError}
                  </p>
                )}
                <button
                  className="primary-button"
                  disabled={saving || createUncertain || !companyName.trim()}
                >
                  {saving ? "Creating…" : "Create company"}
                </button>
              </form>
            )}
          </div>
        )}
        <button className="text-button" onClick={onExit}>
          Sign out
        </button>
      </main>
    </div>
  );
}
