import type {
  EmployeeInsight,
  InsightIndicator,
  PhotoScope,
  SkillBand,
} from "./api";
import ProfilePhoto from "./ProfilePhoto";
import { Icon } from "./Icon";

const bands: SkillBand[] = ["RED", "ORANGE", "YELLOW", "LIGHT_GREEN", "GREEN"];
function SkillDisplay({
  value,
  summary,
}: {
  value: InsightIndicator;
  summary: boolean;
}) {
  const active = value.band ? bands.indexOf(value.band) : -1;

  return (
    <div
      className={`skill-display band-${value.band?.toLowerCase() ?? "unknown"}`}
    >
      {!summary && (
        <span className="skill-band-bar" aria-hidden="true">
          {bands.map((band, i) => (
            <i
              key={band}
              className={`band-segment segment-${band.toLowerCase()} ${i <= active ? "active" : ""}`}
            />
          ))}
        </span>
      )}
      {active < 0 ? (
        <Indicator value={value} />
      ) : (
        <span className="skill-band-label">
          <span className="skill-band-dot" aria-hidden="true" />
          {value.label}
        </span>
      )}
    </div>
  );
}
export function Indicator({ value }: { value: InsightIndicator }) {
  return (
    <span className={`insight-indicator insight-${value.state.toLowerCase()}`}>
      <span aria-hidden="true" className="insight-symbol">
        {
          {
            POSITIVE: "✓",
            MIXED: "≈",
            DIFFICULT: "!",
            UNKNOWN: "?",
            EARLY: "◷",
            OLDER: "◷",
          }[value.state]
        }
      </span>
      {value.label}
    </span>
  );
}
export function EmployeeCardContent({
  employee,
  expanded = false,
  photoScope,
}: {
  employee: EmployeeInsight;
  expanded?: boolean;
  photoScope?: PhotoScope;
}) {
  const role =
    employee.role === "MANAGER"
      ? "Manager"
      : employee.role === "TEAM_LEADER"
        ? "Team leader"
        : "Team participant";
  const observed =
    employee.skills?.filter((s) => s.indicator.reports > 0) ?? [];
  return (
    <>
      <div className="employee-card-accent" aria-hidden="true" />
      <div className="employee-identity">
        <ProfilePhoto
          name={employee.displayName}
          membershipId={employee.membershipId}
          version={employee.profile?.photoUpdatedAt}
          scope={photoScope}
          className="employee-portrait"
        />
        <div>
          <div className="employee-role-label">
            {role}
            {employee.isYou && <span className="you-label">You</span>}
          </div>
          <h3>{employee.displayName}</h3>
          <p className="employee-job-title">
            {employee.profile?.jobTitle || "Job title not added"}
          </p>
          {employee.profile?.department && (
            <span className="department-chip">
              {employee.profile.department}
            </span>
          )}
          {employee.profile?.location && (
            <p className="employee-location">{employee.profile.location}</p>
          )}
        </div>
      </div>
      {employee.skills && (
        <div className="employee-skills">
          <div className="employee-section-label">
            <Icon name="spark" />
            <h4>Skills & experience</h4>
          </div>
          {employee.skills.length === 0 ? (
            <p className="setup-note">No skills have been configured yet.</p>
          ) : (
            employee.skills.map((skill) => (
              <div
                className={`employee-skill skill-state-${skill.indicator.state.toLowerCase()}`}
                key={skill.id}
              >
                <div className="skill-caption">
                  <span>{skill.name}</span>
                </div>
                <SkillDisplay
                  value={skill.indicator}
                  summary={employee.skillPresentation === "SUMMARY"}
                />
                {expanded && (
                  <small>
                    {skill.indicator.reports
                      ? `${skill.indicator.reports} weekly observation${skill.indicator.reports === 1 ? "" : "s"} · ${skill.indicator.reviewers} colleague${skill.indicator.reviewers === 1 ? "" : "s"}`
                      : "No observed feedback yet"}
                  </small>
                )}
              </div>
            ))
          )}
          <div className="employee-evidence-note">
            <Icon name={observed.length ? "shield" : "clock"} />
            <span>
              {observed.length
                ? "Read each skill with its evidence context."
                : "Getting to know this colleague. Insights appear as feedback arrives."}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
export default function EmployeeCard({
  employee,
  onSelect,
  photoScope,
}: {
  employee: EmployeeInsight;
  onSelect: () => void;
  photoScope?: PhotoScope;
}) {
  return (
    <button
      className="employee-card"
      onClick={onSelect}
      aria-label={`View ${employee.displayName}`}
    >
      <EmployeeCardContent employee={employee} photoScope={photoScope} />
      <span className="employee-card-link">
        View employee <Icon name="arrow" />
      </span>
    </button>
  );
}
