import CompanyTestBanner from "./CompanyTestBanner";
import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import FocusConnections from "./FocusConnections";
import EmployeeCard, { EmployeeCardContent, Indicator } from "./EmployeeCard";
import { Icon } from "./Icon";
import { ApiError, errorMessage, getTeams, getTeamInsights } from "./api";
import type {
  Membership,
  Session,
  TeamSummary,
  TeamInsights,
  RelationshipInsight,
} from "./api";

type Props = {
  session: Session;
  membership: Membership;
  onExpired: () => void;
  onExit: () => void;
  onBack: () => void;
  onSwitchCompany: () => void;
  onCompanySetup?: () => void;
};
function Direction({
  name,
  value,
}: {
  name: string;
  value: NonNullable<RelationshipInsight["firstToSecond"]> | null;
}) {
  if (!value) return null;
  return (
    <div className="direction-summary">
      <strong>{name}’s reported experience</strong>
      <div>
        <span>Enjoyment</span>
        <Indicator value={value.enjoyment} />
      </div>
      <div>
        <span>Working together</span>
        <Indicator value={value.effectiveness} />
      </div>
    </div>
  );
}
export default function TeamView({
  session,
  membership,
  onExpired,
  onExit,
  onBack,
  onSwitchCompany,
  onCompanySetup,
}: Props) {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamId, setTeamId] = useState("");
  const [focus, setFocus] = useState<string>();
  const [data, setData] = useState<TeamInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(false),
    request = useRef<AbortController | null>(null);
  const focusLayout = useRef<HTMLDivElement>(null);
  const org = membership.organization.id;
  async function load(id = teamId, person?: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setData(null);
    setFocus(person);
    try {
      const groups = await getTeams(session.token, org, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      if (!Array.isArray(groups))
        throw new ApiError(502, "Your teams could not be loaded.");
      const chosen = groups.some((g) => g.id === id)
        ? id
        : (groups[0]?.id ?? "");
      setTeams(groups);
      setTeamId(chosen);
      const result = chosen
        ? await getTeamInsights(
            session.token,
            org,
            chosen,
            person,
            controller.signal,
          )
        : null;
      if (!alive.current || controller.signal.aborted) return;
      if (
        result &&
        (!Array.isArray(result.employees) ||
          !Array.isArray(result.relationships))
      )
        throw new ApiError(502, "Team insights could not be loaded.");
      setData(result);
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally {
      if (alive.current && !controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const selected = data?.employees.find((e) => e.membershipId === focus);
  const name = (id: string) =>
    data?.employees.find((e) => e.membershipId === id)?.displayName ??
    "Colleague";
  const unknownCount =
    data?.employees.filter((e) =>
      e.skills?.some(
        (s) => s.indicator.state === "UNKNOWN" || s.indicator.state === "EARLY",
      ),
    ).length ?? 0;
  return (
    <div className="setup-page">
      <a className="skip-link" href="#teams-content">
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
          {onCompanySetup && (
            <button className="text-button" onClick={onCompanySetup}>
              Company setup
            </button>
          )}
          <button className="text-button" onClick={onSwitchCompany}>
            Switch company
          </button>
          <button className="text-button" onClick={onExit}>
            Sign out
          </button>
        </nav>
      </header>
      <main id="teams-content" className="setup-content teams-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · WORKING TOGETHER
            </p>
            <h1>
              Your teams<span>.</span>
            </h1>
            <p>Understand the people behind the project.</p>
          </div>
          <button
            className="secondary-button"
            disabled={loading}
            onClick={() => void load(teamId, focus)}
          >
            <Icon name="refresh" /> Refresh team
          </button>
        </div>
        {data?.testMode && <CompanyTestBanner />}
        {teams.length > 0 && (
          <div className="team-toolbar">
            <div>
              <label htmlFor="insight-team">Team</label>
              <select
                id="insight-team"
                value={teamId}
                onChange={(e) => void load(e.target.value)}
                disabled={loading}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <button
                className="secondary-button"
                onClick={() => void load(teamId)}
              >
                <Icon name="people" /> Team overview
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className="loading-copy" role="status">
            Loading your team…
          </p>
        )}
        {!loading && !error && teams.length === 0 && (
          <div className="setup-panel empty-state">
            <h2>No teams yet</h2>
            <p>
              Your teams will appear when you join a team or receive a manager
              role.
            </p>
          </div>
        )}
        {data && (
          <div className="team-workspace">
            <section
              className="team-canvas"
              aria-labelledby="team-view-heading"
            >
              <div className="section-heading">
                <div>
                  <h2 id="team-view-heading">
                    {selected ? selected.displayName : data.team.name}
                  </h2>
                  <p>
                    {selected
                      ? "Connections from the selected employee only."
                      : data.mode === "ROSTER"
                        ? "Current participants and team responsibilities."
                        : "Select an employee to explore their working relationships."}
                  </p>
                </div>
                <span className="team-size">
                  {data.employees.length} participants
                </span>
              </div>
              {data.employees.length === 0 && (
                <div className="empty-state">
                  <h3>No current participants</h3>
                  <p>Accepted colleagues can be added through Company setup.</p>
                </div>
              )}
              {!selected ? (
                <div className="employee-grid">
                  {data.employees.map((e) =>
                    data.mode === "ROSTER" ? (
                      <article className="employee-card" key={e.membershipId}>
                        <EmployeeCardContent employee={e} />
                      </article>
                    ) : (
                      <EmployeeCard
                        key={e.membershipId}
                        employee={e}
                        onSelect={() => void load(teamId, e.membershipId)}
                      />
                    ),
                  )}
                </div>
              ) : (
                <div className="employee-focus" ref={focusLayout}>
                  <FocusConnections
                    key={selected.membershipId}
                    container={focusLayout}
                    from={selected.membershipId}
                  />
                  <article
                    className="employee-card selected-employee"
                    aria-label={`Selected employee ${selected.displayName}`}
                  >
                    <EmployeeCardContent employee={selected} expanded />
                    {!selected.skills && (
                      <p className="setup-note">
                        Skill insights are available in your personal view or to
                        this team’s manager, leader and independent HR.
                      </p>
                    )}
                  </article>
                  <div className="focused-colleagues">
                    {data.employees
                      .filter((e) => e.membershipId !== selected.membershipId)
                      .map((employee) => {
                        const pair = data.relationships.find(
                          (p) =>
                            [
                              p.firstMembershipId,
                              p.secondMembershipId,
                            ].includes(employee.membershipId) &&
                            [
                              p.firstMembershipId,
                              p.secondMembershipId,
                            ].includes(selected.membershipId),
                        );
                        const state = pair?.combined?.state ?? "UNKNOWN";
                        return (
                          <div
                            className="connected-colleague"
                            key={employee.membershipId}
                          >
                            <article
                              className="relationship-card"
                              data-relationship-to={
                                pair ? employee.membershipId : undefined
                              }
                              data-relationship-state={state}
                            >
                              <button
                                className="colleague-focus-button"
                                onClick={() =>
                                  void load(teamId, employee.membershipId)
                                }
                              >
                                {employee.displayName}
                                <span aria-hidden="true"> →</span>
                              </button>
                              {pair ? (
                                <>
                                  <div className="combined-summary">
                                    <span>Reported collaboration</span>
                                    {pair.combined ? (
                                      <Indicator value={pair.combined} />
                                    ) : (
                                      <span className="relationship-note">
                                        {pair.visibility === "OWN_EXPERIENCE"
                                          ? "Your experience only"
                                          : "Not observed in both directions"}
                                      </span>
                                    )}
                                  </div>
                                  {pair.visibility === "OWN_EXPERIENCE" && (
                                    <p className="setup-note">
                                      The colleague’s experience and combined
                                      result are private in your view.
                                    </p>
                                  )}
                                  <Direction
                                    name={name(pair.firstMembershipId)}
                                    value={pair.firstToSecond}
                                  />
                                  <Direction
                                    name={name(pair.secondMembershipId)}
                                    value={pair.secondToFirst}
                                  />
                                </>
                              ) : (
                                <p className="setup-note">
                                  Relationship details are outside your access
                                  for this pair.
                                </p>
                              )}
                            </article>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </section>
            <aside
              className="setup-panel team-analysis"
              aria-labelledby="team-analysis-heading"
            >
              <span className="round-icon teal">
                <Icon name="people" />
              </span>
              <h2 id="team-analysis-heading">Team context</h2>
              <p>{data.team.name}</p>
              <div className="analysis-note">
                <strong>
                  {data.mode === "TEAM"
                    ? "Team insights"
                    : data.mode === "PERSONAL"
                      ? "Your perspective"
                      : "Team roster"}
                </strong>
                <p>
                  {data.mode === "TEAM"
                    ? "Skills reflect feedback across projects in this company. Relationships involving you show only your own reported experience."
                    : data.mode === "PERSONAL"
                      ? "You can see your own skill summaries and the experiences you reported. Other colleagues’ feedback stays private."
                      : "Ownership provides administration, not automatic access to feedback. Team manager/leader roles or independent HR determine insight access."}
                </p>
              </div>
              {data.mode !== "ROSTER" && (
                <div className="analysis-note">
                  <strong>Evidence context</strong>
                  <p>
                    {unknownCount
                      ? `${unknownCount} employee cards include unobserved skills or early feedback.`
                      : "Evidence can differ between skills and relationships."}{" "}
                    Unknown connections are neutral, rather than positive or
                    negative.
                  </p>
                </div>
              )}
              {data.mode !== "ROSTER" && (
                <div className="connection-legend">
                  <h3>Reading the indicators</h3>
                  <p>
                    <span className="legend-dot positive" />
                    Positive experience
                  </p>
                  <p>
                    <span className="legend-dot mixed" />
                    Mixed observations
                  </p>
                  <p>
                    <span className="legend-dot difficult" />
                    May need attention
                  </p>
                  <p>
                    <span className="legend-dot unknown" />
                    Early, older or unobserved feedback
                  </p>
                </div>
              )}
              <p className="setup-note">
                These are reported experiences, not proof of productivity. Use
                them alongside your knowledge of the team.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
