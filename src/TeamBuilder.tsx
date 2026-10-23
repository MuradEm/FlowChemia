import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  errorMessage,
  getBuilderCatalog,
  previewBuilder,
  saveBuilder,
} from "./api";
import type {
  BuilderCatalog,
  BuilderSave,
  EmployeeInsight,
  Membership,
  Session,
  RelationshipInsight,
} from "./api";
import { EmployeeCardContent, Indicator, SkillDisplay } from "./EmployeeCard";
import TeamChemistry from "./TeamChemistry";
import type { BuilderPreview } from "./api";
import type { DragEvent } from "react";
import ProfilePhoto from "./ProfilePhoto";
import FocusConnections from "./FocusConnections";
import { Icon } from "./Icon";
import { useWorkspaceGuard } from "./WorkspaceContext";
const localDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
type Draft = {
  name: string;
  start: string;
  end: string;
  selected: string[];
  managers: string[];
  leaders: string[];
};
const empty = (): Draft => ({
  name: "",
  start: localDate(new Date().toISOString()),
  end: "",
  selected: [],
  managers: [],
  leaders: [],
});
const signature = (d: Draft) =>
  JSON.stringify({
    ...d,
    selected: [...d.selected].sort(),
    managers: [...d.managers].sort(),
    leaders: [...d.leaders].sort(),
  });
function Experience({
  name,
  value,
}: {
  name: string;
  value: RelationshipInsight["firstToSecond"];
}) {
  return value ? (
    <div className="builder-experience">
      <strong>{name}’s experience</strong>
      <div>
        <span>Enjoyment</span>
        <Indicator value={value.enjoyment} />
      </div>
      <div>
        <span>Working together</span>
        <Indicator value={value.effectiveness} />
      </div>
    </div>
  ) : null;
}
export default function TeamBuilder({
  session,
  membership,
  onExpired,
  onSaved,
  initialTeamId,
}: {
  initialTeamId?: string;
  session: Session;
  membership: Membership;
  onExpired: () => void;
  onSaved: (id: string) => void;
}) {
  const [catalog, setCatalog] = useState<BuilderCatalog | null>(null),
    [draft, setDraft] = useState<Draft>(empty),
    [initial, setInitial] = useState("");
  const [teamId, setTeamId] = useState(""),
    [search, setSearch] = useState(""),
    [department, setDepartment] = useState(""),
    [skillFilter, setSkillFilter] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const [focus, setFocus] = useState<string>(),
    [preview, setPreview] = useState<BuilderPreview | null>(null),
    [previewLoading, setPreviewLoading] = useState(false),
    [previewError, setPreviewError] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const alive = useRef(false),
    request = useRef<AbortController | null>(null),
    lock = useRef(false),
    pending = useRef<BuilderSave | null>(null),
    layout = useRef<HTMLDivElement>(null);
  const org = membership.organization.id,
    scope = { token: session.token, org };
  const dirty = !!initial && signature(draft) !== initial;
  useWorkspaceGuard(
    () =>
      !busy &&
      (!(dirty || uncertain) ||
        window.confirm(
          "Leave this team draft? Unsaved changes and any unconfirmed save request will be discarded.",
        )),
  );
  async function load(id?: string) {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setLoading(true);
    setError("");
    setPreview(null);
    setFocus(undefined);
    pending.current = null;
    setUncertain(false);
    try {
      let result = await getBuilderCatalog(session.token, org, id, c.signal);
      if (!result.canCreate && !id && result.teams[0])
        result = await getBuilderCatalog(
          session.token,
          org,
          result.teams[0].id,
          c.signal,
        );
      if (c.signal.aborted || !alive.current) return;
      const next = result.draft
        ? {
            name: result.draft.name,
            start: localDate(result.draft.startsAt),
            end: result.draft.endsAt ? localDate(result.draft.endsAt) : "",
            selected: result.draft.membershipIds,
            managers: result.draft.managerIds,
            leaders: result.draft.leaderIds,
          }
        : empty();
      setCatalog(result);
      setTeamId(result.draft?.id ?? "");
      setDraft(next);
      setInitial(signature(next));
    } catch (f) {
      if (!c.signal.aborted && alive.current) {
        if (f instanceof ApiError && f.status === 401) onExpired();
        else setError(errorMessage(f));
      }
    } finally {
      if (!c.signal.aborted && alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load(initialTeamId);
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const selectionKey = [...draft.selected].sort().join(",");
  const previewSelection = useRef("");
  useEffect(() => {
    if (previewSelection.current !== selectionKey) setPreview(null);
    else
      setPreview((previous) =>
        previous ? { ...previous, relationships: [] } : null,
      );
    previewSelection.current = selectionKey;
    setPreviewError("");
    if (!catalog) {
      setPreviewLoading(false);
      return;
    }
    const c = new AbortController();
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      void previewBuilder(session.token, org, draft.selected, focus, c.signal)
        .then((p) => {
          if (!c.signal.aborted && alive.current) setPreview(p);
        })
        .catch((f) => {
          if (!c.signal.aborted && alive.current) {
            if (f instanceof ApiError && f.status === 401) onExpired();
            else setPreviewError(errorMessage(f));
          }
        })
        .finally(() => {
          if (!c.signal.aborted && alive.current) setPreviewLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [selectionKey, focus, catalog]);
  function move(id: string, inTeam: boolean) {
    if (
      busy ||
      uncertain ||
      loading ||
      !catalog?.employees.some((e) => e.membershipId === id)
    )
      return;
    if (
      (inTeam &&
        (draft.selected.includes(id) || draft.selected.length >= 100)) ||
      (!inTeam && !draft.selected.includes(id))
    )
      return;
    setPreview(null);
    setPreviewError("");
    setNotice("");
    setDraft((d) => {
      if (inTeam) {
        if (d.selected.includes(id) || d.selected.length >= 100) return d;
        return { ...d, selected: [...d.selected, id] };
      }
      return {
        ...d,
        selected: d.selected.filter((x) => x !== id),
        leaders: d.leaders.filter((x) => x !== id),
      };
    });
    if (!inTeam && focus === id) setFocus(undefined);
  }
  function toggle(id: string) {
    move(id, !draft.selected.includes(id));
  }
  function dragCard(event: DragEvent<HTMLElement>, id: string) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("application/x-flowchemia-employee", id);
    event.dataTransfer.effectAllowed = "move";
    setDragging(id);
  }
  function allowDrop(event: DragEvent<HTMLElement>) {
    if (
      !disabled &&
      event.dataTransfer.types.includes("application/x-flowchemia-employee")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }
  function drop(event: DragEvent<HTMLElement>, inTeam: boolean) {
    if (!event.dataTransfer.types.includes("application/x-flowchemia-employee"))
      return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("application/x-flowchemia-employee");
    move(id, inTeam);
    setDragging(null);
  }
  const disabled = loading || busy || uncertain;
  const employees = catalog?.employees ?? [];
  const selected = draft.selected
    .map(
      (id) =>
        preview?.employees.find((e) => e.membershipId === id) ??
        employees.find((e) => e.membershipId === id),
    )
    .filter((e): e is EmployeeInsight => !!e);
  const recommendationOrder = new Map(
    (preview?.recommendations ?? []).map((r, i) => [r.membershipId, i]),
  );
  const recommendations = new Map(
    (preview?.recommendations ?? []).map((r) => [r.membershipId, r]),
  );
  const filtered = employees.filter(
    (e) =>
      !draft.selected.includes(e.membershipId) &&
      `${e.displayName} ${e.profile?.jobTitle ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (!department || e.profile?.department === department) &&
      (!skillFilter ||
        e.skills?.some((s) => s.id === skillFilter && s.indicator.band)),
  );
  filtered.sort(
    (a, b) =>
      (recommendationOrder.get(a.membershipId) ?? 1000) -
        (recommendationOrder.get(b.membershipId) ?? 1000) ||
      a.displayName.localeCompare(b.displayName),
  );
  const skills = [
    ...new Map(
      employees
        .flatMap((e) => e.skills ?? [])
        .map((s) => [s.id, { id: s.id, name: s.name }]),
    ).values(),
  ];
  const selectedPerson = selected.find((e) => e.membershipId === focus);
  function switchTeam(id: string) {
    if (disabled) return;
    if (dirty && !window.confirm("Discard changes to the current team draft?"))
      return;
    void load(id || undefined);
  }
  async function save() {
    if (lock.current || loading || catalog?.hasHiddenParticipants) return;
    if (!pending.current) {
      if (!draft.name.trim() || !draft.start) {
        setError("Enter a team name and start date.");
        return;
      }
      const start = new Date(draft.start),
        end = draft.end ? new Date(draft.end) : null;
      if (
        !Number.isFinite(start.getTime()) ||
        (end &&
          (!Number.isFinite(end.getTime()) ||
            end <= start ||
            end.getTime() <= Date.now()))
      ) {
        setError("Choose a valid start and a future end after the start.");
        return;
      }
      pending.current = {
        requestId: crypto.randomUUID(),
        ...(teamId ? { teamId, revision: catalog!.draft!.revision } : {}),
        name: draft.name.trim(),
        startsAt:
          catalog?.draft && draft.start === localDate(catalog.draft.startsAt)
            ? catalog.draft.startsAt
            : start.toISOString(),
        endsAt:
          catalog?.draft?.endsAt &&
          draft.end === localDate(catalog.draft.endsAt)
            ? catalog.draft.endsAt
            : (end?.toISOString() ?? null),
        membershipIds: [...draft.selected],
        ...(catalog?.canAssignRoles
          ? { managerIds: draft.managers, leaderIds: draft.leaders }
          : {}),
      };
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await saveBuilder(session.token, org, pending.current);
      if (!alive.current) return;
      pending.current = null;
      setUncertain(false);
      setInitial(signature(draft));
      onSaved(result.teamId);
    } catch (f) {
      if (!alive.current) return;
      if (f instanceof ApiError && f.status === 401) onExpired();
      else if (f instanceof ApiError && f.status >= 400 && f.status < 500) {
        pending.current = null;
        setUncertain(false);
        setError(
          f.status === 409
            ? "This team changed while you were editing. Reload the team before trying again."
            : errorMessage(f),
        );
      } else {
        setUncertain(true);
        setError(
          "The save result is not confirmed. Use “Confirm previous save” to check the same request safely.",
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="setup-page">
      <main className="setup-content builder-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · BUILD WITH UNDERSTANDING
            </p>
            <h1>
              Team builder<span>.</span>
            </h1>
            <p>
              Choose people, review their experience, and shape the next team.
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={busy || loading}
            onClick={() => {
              if (
                (!dirty && !uncertain) ||
                window.confirm("Discard the current draft and reload?")
              )
                void load(teamId || undefined);
            }}
          >
            <Icon name="refresh" />
            Reload draft
          </button>
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading && <p role="status">Loading team builder…</p>}
        {catalog && (
          <>
            {catalog.hasHiddenParticipants && (
              <p className="auth-error" role="alert">
                This team includes unavailable participants. Resolve its roster
                in Company setup before saving it here.
              </p>
            )}
            <div
              className="builder-view-switch"
              role="group"
              aria-label="Team view"
            >
              <button
                className={!focus ? "active" : ""}
                aria-pressed={!focus}
                onClick={() => setFocus(undefined)}
              >
                <Icon name="people" />
                Team overview
              </button>
              <button
                className={focus ? "active" : ""}
                aria-pressed={!!focus}
                disabled={!selected.length}
                onClick={() => setFocus(focus ?? selected[0]?.membershipId)}
              >
                <Icon name="spark" />
                Focus employee
              </button>
            </div>
            <div className="builder-workspace">
              <section
                className={`builder-selection ${dragging ? "drop-ready" : ""}`}
                onDragOver={allowDrop}
                onDrop={(e) => drop(e, true)}
                aria-labelledby="builder-selected"
              >
                <div className="section-heading">
                  <div>
                    <h2 id="builder-selected">
                      Team chemistry view{" "}
                      <span className="count-pill">{selected.length}</span>
                    </h2>
                    <p>
                      {focus
                        ? "Only connections involving the selected employee are shown."
                        : "Choose a card to review that employee’s chemistry."}
                    </p>
                  </div>
                </div>
                {previewLoading && (
                  <p className="setup-note" role="status">
                    Updating draft insights…
                  </p>
                )}
                {previewError && (
                  <p className="auth-error" role="alert">
                    {previewError}
                  </p>
                )}
                {selected.length === 0 ? (
                  <div className="setup-panel empty-state lineup-empty">
                    <Icon name="people" />
                    <h3>Build your lineup</h3>
                    <p>
                      Select employees from the list. Nothing is saved until you
                      save the team.
                    </p>
                  </div>
                ) : selectedPerson ? (
                  <div className="employee-focus" ref={layout}>
                    <FocusConnections
                      container={layout}
                      from={selectedPerson.membershipId}
                    />
                    <article
                      className="employee-card selected-employee"
                      draggable={!disabled}
                      onDragStart={(event) =>
                        dragCard(event, selectedPerson.membershipId)
                      }
                      onDragEnd={() => setDragging(null)}
                      data-selected-id={selectedPerson.membershipId}
                    >
                      <span className="focus-employee-badge">
                        <Icon name="spark" />
                        Focus employee
                      </span>
                      <EmployeeCardContent
                        employee={selectedPerson}
                        photoScope={scope}
                        expanded
                      />
                      <button
                        className="text-button"
                        disabled={disabled}
                        onClick={() => toggle(selectedPerson.membershipId)}
                      >
                        Remove from draft
                      </button>
                    </article>
                    <div className="focused-colleagues">
                      {selected
                        .filter((e) => e.membershipId !== focus)
                        .map((e) => {
                          const pair = preview?.relationships.find(
                            (p) =>
                              [
                                p.firstMembershipId,
                                p.secondMembershipId,
                              ].includes(e.membershipId) &&
                              [
                                p.firstMembershipId,
                                p.secondMembershipId,
                              ].includes(focus!),
                          );
                          const name = (id: string) =>
                            selected.find((x) => x.membershipId === id)
                              ?.displayName ?? "Colleague";
                          return (
                            <div
                              className="connected-colleague"
                              key={e.membershipId}
                            >
                              <article
                                className="relationship-card"
                                data-relationship-to={
                                  pair ? e.membershipId : undefined
                                }
                                data-relationship-state={
                                  pair?.combined?.tone ??
                                  pair?.combined?.state ??
                                  "UNKNOWN"
                                }
                              >
                                <div className="relationship-person">
                                  <ProfilePhoto
                                    name={e.displayName}
                                    membershipId={e.membershipId}
                                    scope={scope}
                                    version={e.profile?.photoUpdatedAt}
                                    className="relationship-photo"
                                  />
                                  <div>
                                    <button
                                      className="colleague-focus-button"
                                      onClick={() => setFocus(e.membershipId)}
                                    >
                                      {e.displayName} →
                                    </button>
                                    <p>
                                      {e.profile?.jobTitle ||
                                        "Team participant"}
                                    </p>
                                    {e.profile?.department && (
                                      <small>{e.profile.department}</small>
                                    )}
                                  </div>
                                  <button
                                    className="icon-button"
                                    aria-label={`Remove ${e.displayName} from draft`}
                                    disabled={disabled}
                                    onClick={() => toggle(e.membershipId)}
                                  >
                                    <Icon name="close" />
                                  </button>
                                </div>
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
                                    <details className="relationship-directions">
                                      <summary>Individual experiences</summary>
                                      <Experience
                                        name={name(pair.firstMembershipId)}
                                        value={pair.firstToSecond}
                                      />
                                      <Experience
                                        name={name(pair.secondMembershipId)}
                                        value={pair.secondToFirst}
                                      />
                                    </details>
                                  </>
                                ) : (
                                  <p className="setup-note">
                                    {previewLoading
                                      ? "Loading relationship…"
                                      : "Relationship details are outside your current access for this pair."}
                                  </p>
                                )}
                                {e.skills && (
                                  <div className="relationship-skills">
                                    {e.skills.slice(0, 2).map((skill) => (
                                      <div key={skill.id}>
                                        <span>{skill.name}</span>
                                        <SkillDisplay
                                          value={skill.indicator}
                                          summary={
                                            e.skillPresentation === "SUMMARY"
                                          }
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="employee-grid builder-lineup">
                    {selected.map((e) => (
                      <article
                        className="employee-card lineup-player-card"
                        key={e.membershipId}
                        draggable={!disabled}
                        onDragStart={(event) => dragCard(event, e.membershipId)}
                        onDragEnd={() => setDragging(null)}
                        data-selected-id={e.membershipId}
                      >
                        <EmployeeCardContent employee={e} photoScope={scope} />
                        {!e.skills && (
                          <p className="setup-note">
                            Skill feedback is outside your current access.
                          </p>
                        )}
                        <div className="builder-card-actions">
                          <button
                            className="text-button"
                            onClick={() => setFocus(e.membershipId)}
                          >
                            Focus on {e.displayName}
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Remove ${e.displayName} from draft`}
                            disabled={disabled}
                            onClick={() => toggle(e.membershipId)}
                          >
                            <Icon name="close" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <div className="builder-sidebar">
                <div className="builder-insights-heading">
                  <Icon name="activity" />
                  <div>
                    <h2>Team chemistry analysis</h2>
                    <p>Insights for the selected team.</p>
                  </div>
                </div>
                <TeamChemistry
                  value={preview?.teamAnalysis}
                  loading={
                    !preview?.teamAnalysis &&
                    (previewLoading ||
                      (selected.length > 0 && !preview && !previewError))
                  }
                  error={previewError}
                />
                <aside
                  onDragOver={allowDrop}
                  onDrop={(e) => drop(e, false)}
                  className={`setup-panel builder-candidates ${dragging ? "drop-ready" : ""}`}
                  aria-labelledby="builder-find"
                >
                  <h2 id="builder-find">Suggested employees</h2>
                  <p className="candidate-ranking-note">
                    Best fit first · feedback-based guidance
                  </p>
                  <details className="candidate-filters">
                    <summary>Search & filters</summary>
                    <label htmlFor="builder-search">Name or job title</label>
                    <input
                      id="builder-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Find a colleague"
                    />
                    <label htmlFor="builder-department">Department</label>
                    <select
                      id="builder-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="">All departments</option>
                      {[
                        ...new Set(
                          employees
                            .map((e) => e.profile?.department)
                            .filter((d): d is string => !!d),
                        ),
                      ]
                        .sort()
                        .map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                    </select>
                    <label htmlFor="builder-skill">
                      Has current skill feedback
                    </label>
                    <select
                      id="builder-skill"
                      value={skillFilter}
                      onChange={(e) => setSkillFilter(e.target.value)}
                    >
                      <option value="">Any skill</option>
                      {skills.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </details>
                  <p className="candidate-drag-hint">
                    Drag a card onto the lineup, or use Add. Drag a selected
                    player back here to remove them.
                  </p>
                  <div className="builder-candidate-list">
                    {filtered.map((e) => {
                      const fit = recommendations.get(e.membershipId);
                      return (
                        <article
                          className="candidate-player-card"
                          key={e.membershipId}
                          draggable={!disabled}
                          onDragStart={(event) =>
                            dragCard(event, e.membershipId)
                          }
                          onDragEnd={() => setDragging(null)}
                          data-candidate-id={e.membershipId}
                        >
                          <div className="candidate-player-identity">
                            <ProfilePhoto
                              name={e.displayName}
                              membershipId={e.membershipId}
                              scope={scope}
                              version={e.profile?.photoUpdatedAt}
                              className="builder-candidate-photo"
                            />
                            <div>
                              <strong>{e.displayName}</strong>
                              <small>{e.profile?.jobTitle || "Employee"}</small>
                            </div>
                            <span className="drag-grip" aria-hidden="true">
                              ⠿
                            </span>
                          </div>
                          <div className="candidate-player-footer">
                            <span
                              className={`fit-chip fit-${fit?.fit.toLowerCase() ?? "unknown"}`}
                              title={fit?.reasons.join(" ")}
                            >
                              {previewLoading && !fit
                                ? "Checking fit…"
                                : (fit?.label ?? "Not enough evidence")}
                            </span>
                            {fit?.limitedEvidence && (
                              <span
                                className="evidence-hint"
                                tabIndex={0}
                                role="img"
                                aria-label="Limited feedback: this fit suggestion is provisional."
                              >
                                <span aria-hidden="true">ⓘ</span>
                                <span
                                  className="evidence-tooltip"
                                  aria-hidden="true"
                                >
                                  Limited feedback: this fit suggestion is
                                  provisional.
                                </span>
                              </span>
                            )}
                            <button
                              className="candidate-add-button"
                              disabled={
                                disabled || draft.selected.length >= 100
                              }
                              aria-label={`Add ${e.displayName} to team`}
                              onClick={() => move(e.membershipId, true)}
                            >
                              Add <span aria-hidden="true">+</span>
                            </button>
                          </div>
                          <small className="candidate-evidence">
                            {fit?.possibleLinks
                              ? `${fit.knownLinks} of ${fit.possibleLinks} reported connections`
                              : "Select teammates to compare chemistry"}
                          </small>
                        </article>
                      );
                    })}
                    {filtered.length === 0 && (
                      <p className="setup-note">
                        No employees match these filters.
                      </p>
                    )}
                  </div>
                  <p className="setup-note">
                    HR stays independent. People can belong to several teams.
                  </p>
                  {employees.length === 200 && (
                    <p className="setup-note">
                      Showing the first 200 eligible employees.
                    </p>
                  )}
                </aside>
              </div>
              <details className="setup-panel builder-analysis">
                <summary>Skill coverage & evidence</summary>
                <p>
                  Feedback is a starting point. Use your knowledge of the people
                  and the project alongside it.
                </p>
                <h3>Skill evidence</h3>
                {skills.map((s) => {
                  const known = selected
                    .map((e) => e.skills?.find((x) => x.id === s.id)?.indicator)
                    .filter((x) => x?.band);
                  const positive = known.filter(
                    (x) => x?.band === "GREEN" || x?.band === "LIGHT_GREEN",
                  ).length;
                  return (
                    <div className="builder-skill-context" key={s.id}>
                      <strong>{s.name}</strong>
                      <span>
                        {positive
                          ? `${positive} with positive feedback`
                          : known.length
                            ? "Mixed or developing feedback"
                            : "No feedback in your view"}
                      </span>
                    </div>
                  );
                })}
                {skills.length === 0 && (
                  <p className="setup-note">
                    No skill feedback is visible in your current role.
                  </p>
                )}
                <p className="setup-note">
                  Unknown chemistry is neutral. Draft selections do not grant
                  access to additional feedback. Your own relationships show
                  only your experience.
                </p>
              </details>
            </div>
            <div className="builder-project-heading">
              <Icon name="building" />
              <div>
                <h2>Team setup</h2>
                <p>Define the team details and responsibilities.</p>
              </div>
            </div>
            <section
              className="setup-panel builder-details"
              aria-label="Team details"
            >
              <div>
                <label htmlFor="builder-team">Build or edit</label>
                <select
                  id="builder-team"
                  value={teamId}
                  disabled={disabled}
                  onChange={(e) => switchTeam(e.target.value)}
                >
                  {catalog.canCreate && <option value="">New team</option>}
                  {catalog.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="builder-name">Team name</label>
                <input
                  id="builder-name"
                  maxLength={120}
                  value={draft.name}
                  disabled={disabled}
                  placeholder="e.g. PLC commissioning"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="builder-start">Starts (local time)</label>
                <input
                  id="builder-start"
                  type="datetime-local"
                  value={draft.start}
                  disabled={disabled}
                  onChange={(e) =>
                    setDraft({ ...draft, start: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="builder-end">Ends (optional)</label>
                <input
                  id="builder-end"
                  type="datetime-local"
                  value={draft.end}
                  disabled={disabled}
                  onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                />
              </div>
            </section>
            <section className="setup-panel builder-roles">
              <h2>Team responsibilities</h2>
              <p>
                {catalog.canAssignRoles
                  ? "Managers can be outside the participating team. Team leaders must be selected participants."
                  : "HR or the company owner assigns responsibilities. Existing manager access is preserved; removing a leader from participation removes that leader role."}
              </p>
              {catalog.canAssignRoles && (
                <div className="builder-role-columns">
                  <details>
                    <summary>Managers ({draft.managers.length})</summary>
                    {employees
                      .filter((e) => !draft.leaders.includes(e.membershipId))
                      .map((e) => (
                        <label key={e.membershipId}>
                          <input
                            type="checkbox"
                            checked={draft.managers.includes(e.membershipId)}
                            disabled={disabled}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                managers: d.managers.includes(e.membershipId)
                                  ? d.managers.filter(
                                      (x) => x !== e.membershipId,
                                    )
                                  : [...d.managers, e.membershipId],
                              }))
                            }
                          />
                          {e.displayName}
                        </label>
                      ))}
                  </details>
                  <details>
                    <summary>Team leaders ({draft.leaders.length})</summary>
                    {selected
                      .filter((e) => !draft.managers.includes(e.membershipId))
                      .map((e) => (
                        <label key={e.membershipId}>
                          <input
                            type="checkbox"
                            checked={draft.leaders.includes(e.membershipId)}
                            disabled={disabled}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                leaders: d.leaders.includes(e.membershipId)
                                  ? d.leaders.filter(
                                      (x) => x !== e.membershipId,
                                    )
                                  : [...d.leaders, e.membershipId],
                              }))
                            }
                          />
                          {e.displayName}
                        </label>
                      ))}
                  </details>
                </div>
              )}
            </section>
            <div className="builder-save-bar">
              <span>
                {selected.length} participants ·{" "}
                {teamId ? "Update existing team" : "New team"}
                {dirty ? " · Unsaved changes" : ""}
                <small>
                  Employee history is preserved. Saving does not generate
                  surveys.
                </small>
              </span>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  loading ||
                  catalog.hasHiddenParticipants ||
                  (!uncertain && (!draft.name.trim() || (!!teamId && !dirty)))
                }
                onClick={() => void save()}
              >
                {busy
                  ? "Saving…"
                  : uncertain
                    ? "Confirm previous save"
                    : teamId
                      ? "Save team changes"
                      : "Create team"}
                <Icon name="arrow" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
