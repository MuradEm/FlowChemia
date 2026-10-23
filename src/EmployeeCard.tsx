import type {
  EmployeeInsight,
  InsightIndicator,
  PhotoScope,
  SkillBand,
} from "./api";
import ProfilePhoto from "./ProfilePhoto";
import { Icon } from "./Icon";

const bands: SkillBand[] = ["RED", "ORANGE", "YELLOW", "LIGHT_GREEN", "GREEN"];
export function SkillDisplay({
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
          <EvidenceHint value={value} />
        </span>
      )}
    </div>
  );
}
export function EvidenceHint({
  value,
}: {
  value: Pick<InsightIndicator, "state" | "reports" | "reviewers">;
}) {
  if (!["EARLY", "OLDER"].includes(value.state)) return null;
  const text =
    value.state === "OLDER"
      ? "Older feedback: this colour may no longer reflect recent experience."
      : `Limited feedback: ${value.reports} weekly observation${value.reports === 1 ? "" : "s"} from ${value.reviewers} colleague${value.reviewers === 1 ? "" : "s"}. This colour is provisional.`;
  return (
    <span className="evidence-hint" tabIndex={0} role="img" aria-label={text}>
      <span aria-hidden="true">ⓘ</span>
      <span className="evidence-tooltip" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
export function Indicator({ value }: { value: InsightIndicator }) {
  const tone = value.tone ?? value.state;
  return (
    <span className={`insight-indicator insight-${tone.toLowerCase()}`}>
      <span aria-hidden="true" className="insight-symbol">
        {
          {
            POSITIVE: "✓",
            MIXED: "≈",
            DIFFICULT: "!",
            UNKNOWN: "?",
            EARLY: "◷",
            OLDER: "◷",
          }[tone]
        }
      </span>
      {value.label}
      <EvidenceHint value={value} />
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
    employee.role === "HR_ADMIN"
      ? "HR administrator"
      : employee.role === "OWNER"
        ? "Company owner"
        : employee.role === "MANAGER"
          ? "Manager"
          : employee.role === "TEAM_LEADER"
            ? "Team leader"
            : employee.isYou
              ? "Employee"
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
            <div className="employee-skill-grid">
              {employee.skills.map((skill) => (
                <div
                  className={`employee-skill skill-state-${skill.indicator.state.toLowerCase()}`}
                  key={skill.id}
                  title={
                    expanded
                      ? `${skill.indicator.reports} weekly observations · ${skill.indicator.reviewers} colleagues`
                      : undefined
                  }
                >
                  <div className="skill-caption">
                    <span>{skill.name}</span>
                  </div>
                  <SkillDisplay
                    value={skill.indicator}
                    summary={employee.skillPresentation === "SUMMARY"}
                  />
                </div>
              ))}
            </div>
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
