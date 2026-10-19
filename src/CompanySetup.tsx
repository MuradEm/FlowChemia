import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import { Icon } from "./Icon";
import {
  ApiError,
  errorMessage,
  getCompanyMembers,
  getTeams,
  getTeam,
  inviteColleague,
  createTeam,
  addTeamMember,
  removeTeamMember,
  grantTeamRole,
  revokeTeamRole,
} from "./api";
import type {
  CompanyMember,
  InvitationDelivery,
  Membership,
  Session,
  TeamDetail,
  TeamRole,
  TeamSummary,
} from "./api";
import { formatDate } from "./workspace";

const roleLabel = (role: string) =>
  ({
    OWNER: "Company owner",
    HR_ADMIN: "HR administrator",
    EMPLOYEE: "Employee",
    MANAGER: "Manager",
    TEAM_LEADER: "Team leader",
  })[role] ?? role;

type Props = {
  session: Session;
  membership: Membership;
  onExpired: () => void;
  onExit: () => void;
  onBack: () => void;
  onSwitchCompany: () => void;
};

export default function CompanySetup({
  session,
  membership,
  onExpired,
  onExit,
  onBack,
  onSwitchCompany,
}: Props) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDelivery | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EMPLOYEE" | "HR_ADMIN">(
    "EMPLOYEE",
  );
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [addId, setAddId] = useState("");
  const [grantId, setGrantId] = useState("");
  const [grantRole, setGrantRole] = useState<TeamRole>("MANAGER");
  const alive = useRef(false);
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const org = membership.organization.id;

  async function load(teamId = selected) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError("");
    setTeam(null);
    setMembers([]);
    setTeams([]);
    setAddId("");
    setGrantId("");
    try {
      const [people, groups] = await Promise.all([
        getCompanyMembers(session.token, org, request.signal),
        getTeams(session.token, org, request.signal),
      ]);
      if (!Array.isArray(people) || !Array.isArray(groups))
        throw new ApiError(502, "Company details could not be loaded.");
      const id = groups.some((t) => t.id === teamId)
        ? teamId
        : (groups[0]?.id ?? "");
      const detail = id
        ? await getTeam(session.token, org, id, request.signal)
        : null;
      if (!alive.current || request.signal.aborted) return;
      setMembers(people);
      setTeams(groups);
      setSelected(id);
      setTeam(detail);
      setUncertain(false);
    } catch (failure) {
      if (!alive.current || request.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally {
      if (alive.current && !request.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
    // The parent keys this workspace by user and company.
  }, []);

  async function perform<T>(
    action: () => Promise<T>,
    success: (value: T) => string | void,
  ) {
    if (locked.current || loading || uncertain) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await action();
      if (!alive.current) return;
      const newTeam = success(result);
      setNotice("Changes saved.");
      await load(newTeam || selected);
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else {
        const unknown =
          !(failure instanceof ApiError) ||
          failure.status === 0 ||
          failure.status >= 500;
        setUncertain(
          unknown ||
            (failure instanceof ApiError &&
              [403, 404, 409].includes(failure.status)),
        );
        setError(
          unknown
            ? "We couldn’t confirm whether the change was saved. Refresh and check before trying again. If an invitation token was not received, it cannot be recovered; a new invitation may be needed."
            : errorMessage(failure),
        );
      }
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const disabled = loading || busy || uncertain;
  const eligible = members.filter((m) => m.active && m.role !== "HR_ADMIN");
  const available = eligible.filter(
    (m) => !team?.members.some((t) => t.membershipId === m.id),
  );
  const roleCandidates = eligible.filter(
    (m) =>
      grantRole === "MANAGER" ||
      team?.members.some((t) => t.membershipId === m.id),
  );
  const ended = Boolean(team?.endsAt && Date.parse(team.endsAt) <= Date.now());
  const person = (id: string) =>
    members.find((m) => m.id === id)?.user.displayName ??
    team?.members.find((m) => m.membershipId === id)?.displayName ??
    "Company member";

  return (
    <div className="setup-page">
      <a className="skip-link" href="#setup-content">
        Skip to content
      </a>
      <header className="setup-header">
        <button className="brand setup-brand" onClick={onBack}>
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </button>
        <nav aria-label="Workspace navigation">
          <button className="text-button" onClick={onBack}>
            My workspace
          </button>
          <button className="text-button" onClick={onSwitchCompany}>
            Switch company
          </button>
          <button className="text-button" onClick={onExit}>
            Sign out
          </button>
        </nav>
      </header>
      <main id="setup-content" className="setup-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · {roleLabel(membership.role)}
            </p>
            <h1>
              Company setup<span>.</span>
            </h1>
            <p>Bring your colleagues together. Build teams around the work.</p>
          </div>
          <button
            className="secondary-button"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <Icon name="refresh" /> Refresh
          </button>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className="loading-copy" role="status">
            Loading company details…
          </p>
        )}
        <div className="setup-grid">
          <section className="setup-panel" aria-labelledby="invite-heading">
            <span className="round-icon teal">
              <Icon name="people" />
            </span>
            <h2 id="invite-heading">Invite a colleague</h2>
            <p>
              Employees can belong to several teams. HR administrators stay
              independent of team participation.
            </p>
            <form
              className="setup-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (invitation) return;
                void perform(
                  () => inviteColleague(session.token, org, email, inviteRole),
                  (result) => {
                    setInvitation(result);
                    setCopyNotice("");
                    setEmail("");
                    setInviteRole("EMPLOYEE");
                  },
                );
              }}
            >
              <label htmlFor="invite-email">Work email</label>
              <input
                id="invite-email"
                type="email"
                maxLength={254}
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled || !!invitation}
              />
              <label htmlFor="invite-role">Company role</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as typeof inviteRole)
                }
                disabled={disabled || !!invitation}
              >
                <option value="EMPLOYEE">Employee</option>
                {membership.role === "OWNER" && (
                  <option value="HR_ADMIN">HR administrator</option>
                )}
              </select>
              <button
                className="primary-button"
                disabled={disabled || !!invitation}
              >
                Create invitation <Icon name="arrow" />
              </button>
            </form>
            <p className="setup-note">
              No email is sent. Share the invitation token privately with the
              invited colleague. It expires after 48 hours.
            </p>
            {invitation && (
              <div className="invitation-delivery">
                <h3>Invitation ready</h3>
                <p>
                  For <strong>{invitation.invitation.email}</strong> ·{" "}
                  {roleLabel(invitation.invitation.role)}
                </p>
                <p>
                  Expires {formatDate(invitation.invitation.expiresAt)}. The
                  token appears only here and is cleared when you leave this
                  screen.
                </p>
                <label htmlFor="delivery-token">Invitation token</label>
                <input
                  id="delivery-token"
                  readOnly
                  value={invitation.token}
                  autoComplete="off"
                  spellCheck={false}
                  onFocus={(e) => e.target.select()}
                />
                <div className="setup-actions">
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invitation.token);
                        setCopyNotice("Token copied. Share it privately.");
                      } catch {
                        setCopyNotice(
                          "Copy is unavailable. Select and copy the token above.",
                        );
                      }
                    }}
                  >
                    Copy token
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      setInvitation(null);
                      setCopyNotice("");
                    }}
                  >
                    I’ve saved the token
                  </button>
                </div>
                <p>
                  New colleagues choose “Accept an invitation” on the sign-in
                  screen. Existing users sign in, choose “Switch company,” then
                  “Join a company.”
                </p>
                {copyNotice && <p role="status">{copyNotice}</p>}
              </div>
            )}
          </section>
          <section className="setup-panel" aria-labelledby="create-heading">
            <span className="round-icon teal">
              <Icon name="building" />
            </span>
            <h2 id="create-heading">Create a team</h2>
            <p>
              A team records who works together during a project. Employee
              history continues across teams.
            </p>
            <form
              className="setup-form"
              onSubmit={(event) => {
                event.preventDefault();
                const startsAt = start
                  ? new Date(start).toISOString()
                  : undefined;
                const endsAt = end ? new Date(end).toISOString() : undefined;
                if (
                  endsAt &&
                  Date.parse(endsAt) <=
                    (startsAt ? Date.parse(startsAt) : Date.now())
                ) {
                  setError("The team end must be after its start.");
                  return;
                }
                void perform(
                  () =>
                    createTeam(session.token, org, {
                      name: name.trim(),
                      ...(startsAt ? { startsAt } : {}),
                      ...(endsAt ? { endsAt } : {}),
                    }),
                  (result) => {
                    setName("");
                    setStart("");
                    setEnd("");
                    return result.id;
                  },
                );
              }}
            >
              <label htmlFor="team-name">Team name</label>
              <input
                id="team-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={disabled}
              />
              <div className="setup-date-fields">
                <div>
                  <label htmlFor="team-start">Start (optional)</label>
                  <input
                    id="team-start"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label htmlFor="team-end">End (optional)</label>
                  <input
                    id="team-end"
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
              <p className="setup-note">
                Dates use your local time. Leave start blank to begin now, and
                end blank for an ongoing team.
              </p>
              <button
                className="primary-button"
                disabled={disabled || !name.trim()}
              >
                Create team <Icon name="arrow" />
              </button>
            </form>
          </section>
        </div>
        <section
          className="setup-panel setup-teams"
          aria-labelledby="teams-heading"
        >
          <div className="section-heading">
            <div>
              <h2 id="teams-heading">Your teams</h2>
              <p>
                Select a team to manage its participants and responsibilities.
              </p>
            </div>
            <Icon name="people" />
          </div>
          {!loading && teams.length === 0 && !error && (
            <div className="empty-state">
              <h3>Your first team starts here.</h3>
              <p>
                Create a team, then add colleagues after they accept their
                invitations.
              </p>
            </div>
          )}
          {teams.length > 0 && (
            <div className="team-management">
              <nav className="team-picker" aria-label="Teams">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    className={`team-option ${selected === t.id ? "selected" : ""}`}
                    aria-pressed={selected === t.id}
                    disabled={busy || loading}
                    onClick={() => void load(t.id)}
                  >
                    <strong>{t.name}</strong>
                    <span>
                      {t.endsAt && Date.parse(t.endsAt) <= Date.now()
                        ? "Ended"
                        : Date.parse(t.startsAt) > Date.now()
                          ? "Upcoming"
                          : "Active"}
                    </span>
                  </button>
                ))}
              </nav>
              {team && (
                <div className="team-detail">
                  <h3>{team.name}</h3>
                  <p className="setup-note">
                    {formatDate(team.startsAt)} →{" "}
                    {team.endsAt ? formatDate(team.endsAt) : "Ongoing"}
                  </p>
                  {ended && (
                    <p className="auth-message">
                      This team has ended. New participants cannot be added.
                    </p>
                  )}
                  <h4>Participants</h4>
                  {team.members.length === 0 && (
                    <p>No participants yet. Add colleagues below.</p>
                  )}
                  <ul className="setup-roster">
                    {team.members.map((m) => (
                      <li key={m.id}>
                        <div>
                          <strong>{m.displayName}</strong>
                          <span>
                            {roleLabel(
                              team.access.find(
                                (a) => a.membershipId === m.membershipId,
                              )?.role ?? "EMPLOYEE",
                            )}
                          </span>
                        </div>
                        <button
                          className="text-button danger-text"
                          disabled={disabled}
                          aria-label={`Remove ${m.displayName} from team`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${m.displayName} from ${team.name}? Their history is preserved. Team leader access will be removed; a separate manager role stays until revoked.`,
                              )
                            )
                              void perform(
                                () =>
                                  removeTeamMember(
                                    session.token,
                                    org,
                                    team.id,
                                    m.membershipId,
                                  ),
                                () => {},
                              );
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="setup-inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (addId)
                        void perform(
                          () =>
                            addTeamMember(session.token, org, team.id, addId),
                          () => {},
                        );
                    }}
                  >
                    <label htmlFor="add-member">Add participant</label>
                    <div>
                      <select
                        id="add-member"
                        required
                        value={addId}
                        onChange={(e) => setAddId(e.target.value)}
                        disabled={disabled || ended}
                      >
                        <option value="">Choose a colleague</option>
                        {available.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.user.displayName} · {m.user.email}
                          </option>
                        ))}
                      </select>
                      <button
                        className="secondary-button"
                        disabled={disabled || ended || !addId}
                      >
                        Add
                      </button>
                    </div>
                  </form>
                  <h4>Team responsibilities</h4>
                  <p>
                    Managers can manage this team’s roster. Team leaders
                    participate in the team. Each colleague can hold one
                    responsibility per team.
                  </p>
                  <ul className="setup-roster">
                    {team.access.map((a) => (
                      <li key={a.membershipId}>
                        <div>
                          <strong>{person(a.membershipId)}</strong>
                          <span>{roleLabel(a.role)}</span>
                        </div>
                        <button
                          className="text-button danger-text"
                          disabled={disabled}
                          aria-label={`Revoke ${roleLabel(a.role)} for ${person(a.membershipId)}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Revoke ${roleLabel(a.role)} access for ${person(a.membershipId)}? Their team participation stays unchanged.`,
                              )
                            )
                              void perform(
                                () =>
                                  revokeTeamRole(
                                    session.token,
                                    org,
                                    team.id,
                                    a.membershipId,
                                  ),
                                () => {},
                              );
                          }}
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="setup-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (grantId)
                        void perform(
                          () =>
                            grantTeamRole(
                              session.token,
                              org,
                              team.id,
                              grantId,
                              grantRole,
                            ),
                          () => {},
                        );
                    }}
                  >
                    <label htmlFor="team-role">Responsibility</label>
                    <select
                      id="team-role"
                      value={grantRole}
                      onChange={(e) => {
                        setGrantRole(e.target.value as TeamRole);
                        setGrantId("");
                      }}
                      disabled={disabled}
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="TEAM_LEADER">Team leader</option>
                    </select>
                    <label htmlFor="role-member">Colleague</label>
                    <select
                      id="role-member"
                      required
                      value={grantId}
                      onChange={(e) => setGrantId(e.target.value)}
                      disabled={disabled}
                    >
                      <option value="">Choose a colleague</option>
                      {roleCandidates.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user.displayName} · {m.user.email}
                        </option>
                      ))}
                    </select>
                    <p className="setup-note">
                      Assigning a responsibility replaces any previous
                      responsibility for this colleague in this team. HR
                      administrators are excluded.
                    </p>
                    <button
                      className="secondary-button"
                      disabled={disabled || !grantId}
                    >
                      Assign responsibility
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
          <p className="setup-note">
            Creating a team does not issue check-ins. Survey scheduling will be
            configured separately.
          </p>
        </section>
        <section className="setup-panel" aria-labelledby="directory-heading">
          <h2 id="directory-heading">Company colleagues</h2>
          <p>
            Accepted invitations appear here. Refresh after a colleague joins.
          </p>
          <ul className="setup-roster directory">
            {members.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.user.displayName}</strong>
                  <span>{m.user.email}</span>
                </div>
                <span className="member-role">
                  {roleLabel(m.role)}
                  {!m.active && " · Inactive"}
                </span>
              </li>
            ))}
          </ul>
          {(members.length >= 200 || teams.length >= 200) && (
            <p className="auth-message">
              The API returns up to 200 colleagues and 200 teams. Some records
              may not be shown.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
