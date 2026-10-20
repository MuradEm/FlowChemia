import { useEffect, useState } from "react";
import { ApiError, errorMessage, getPeople } from "./api";
import type { Membership, PersonSummary, Session } from "./api";
import ProfilePhoto from "./ProfilePhoto";
import { Icon } from "./Icon";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
export default function PeoplePage({
  session,
  membership,
  onBack,
  onOpen,
  onExpired,
  onExit,
}: {
  session: Session;
  membership: Membership;
  onBack: () => void;
  onOpen: (id: string) => void;
  onExpired: () => void;
  onExit: () => void;
}) {
  const [people, setPeople] = useState<PersonSummary[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void getPeople(session.token, membership.organization.id, controller.signal)
      .then((p) => {
        if (!controller.signal.aborted) setPeople(p);
      })
      .catch((f) => {
        if (!controller.signal.aborted) {
          if (f instanceof ApiError && f.status === 401) onExpired();
          else setError(errorMessage(f));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const visible = people.filter((p) =>
    `${p.displayName} ${p.jobTitle ?? ""} ${p.department ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <div className="setup-page">
      <a className="skip-link" href="#people-content">
        Skip to content
      </a>
      <header className="setup-header">
        <button className="brand setup-brand" onClick={onBack}>
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </button>
        <nav aria-label="People navigation">
          <button className="text-button" onClick={onBack}>
            My workspace
          </button>
          <button className="text-button" onClick={onExit}>
            Sign out
          </button>
        </nav>
      </header>
      <main id="people-content" className="setup-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · THE PEOPLE BEHIND THE WORK
            </p>
            <h1>
              People<span>.</span>
            </h1>
            <p>
              {membership.role === "EMPLOYEE"
                ? "Your profile and colleagues in your current teams."
                : "Employee profiles across your company."}
            </p>
          </div>
        </div>
        <div className="people-search">
          <label htmlFor="people-search">Find a colleague</label>
          <input
            id="people-search"
            type="search"
            placeholder="Search by name, job title or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
        {loading && <p role="status">Loading people…</p>}
        {!loading && !error && (
          <>
            <p className="people-count" role="status">
              {visible.length} {visible.length === 1 ? "person" : "people"}
            </p>
            <div className="people-grid">
              {visible.map((p) => (
                <button
                  className="employee-card person-directory-card"
                  key={p.membershipId}
                  onClick={() => onOpen(p.membershipId)}
                  aria-label={`View profile for ${p.displayName}`}
                >
                  <div className="employee-card-accent" aria-hidden="true" />
                  <ProfilePhoto
                    name={p.displayName}
                    membershipId={p.membershipId}
                    version={p.photoUpdatedAt}
                    scope={{
                      token: session.token,
                      org: membership.organization.id,
                    }}
                    className="directory-portrait"
                  />
                  <h2>
                    {p.displayName}
                    {p.membershipId === membership.id && (
                      <span className="you-label">You</span>
                    )}
                  </h2>
                  <p>{p.jobTitle || "Job title not added"}</p>
                  {p.department && (
                    <span className="department-chip">{p.department}</span>
                  )}
                  {p.location && (
                    <small>
                      <Icon name="location" />
                      {p.location}
                    </small>
                  )}
                  <span className="employee-card-link">
                    View profile
                    <Icon name="arrow" />
                  </span>
                </button>
              ))}
            </div>
            {visible.length === 0 && (
              <div className="setup-panel empty-state">
                <h2>No matching colleagues</h2>
                <p>Try a different name, job title or department.</p>
              </div>
            )}
            {people.length === 200 && (
              <p className="setup-note">Showing the first 200 people.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
