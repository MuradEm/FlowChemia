import type { EmployeeInsight, InsightIndicator } from "./api";
import { initials } from "./workspace";

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
}: {
  employee: EmployeeInsight;
  expanded?: boolean;
}) {
  return (
    <>
      <div className="employee-identity">
        <span className="avatar employee-avatar">
          {initials(employee.displayName)}
        </span>
        <div>
          <h3>
            {employee.displayName}
            {employee.isYou && <span className="you-label">You</span>}
          </h3>
          <p>
            {employee.role === "MANAGER"
              ? "Manager"
              : employee.role === "TEAM_LEADER"
                ? "Team leader"
                : "Team participant"}
          </p>
        </div>
      </div>
      {employee.skills && (
        <div className="employee-skills">
          {employee.skills.length === 0 ? (
            <p className="setup-note">No skills have been configured yet.</p>
          ) : (
            employee.skills.slice(0, expanded ? undefined : 3).map((skill) => (
              <div className="employee-skill" key={skill.id}>
                <span>{skill.name}</span>
                <Indicator value={skill.indicator} />
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
        </div>
      )}
    </>
  );
}
export default function EmployeeCard({
  employee,
  onSelect,
}: {
  employee: EmployeeInsight;
  onSelect: () => void;
}) {
  return (
    <button
      className="employee-card"
      onClick={onSelect}
      aria-label={`View ${employee.displayName}`}
    >
      <EmployeeCardContent employee={employee} />
      <span className="employee-card-link">
        View employee <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}
