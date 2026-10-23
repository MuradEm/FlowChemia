import type { CSSProperties } from "react";
import type { TeamAnalysis } from "./api";
export default function TeamChemistry({
  value,
  loading,
  error,
}: {
  value?: TeamAnalysis;
  loading: boolean;
  error?: string;
}) {
  const score = value?.chemistry;
  const state =
    score == null
      ? "unknown"
      : score >= 80
        ? "positive"
        : score >= 60
          ? "mixed"
          : "difficult";
  const evidence =
    value?.evidence === "LIMITED"
      ? "Limited feedback: the team colour and number are provisional and may change as more feedback arrives."
      : value?.evidence === "RESTRICTED"
        ? "Some relationships are private in this view. The team rating is withheld."
        : value?.evidence === "NONE"
          ? "No two-way chemistry feedback is available yet."
          : "Reported experience is a guide, not a measured probability of success.";
  return (
    <section
      className={`team-chemistry-panel chemistry-${state}`}
      aria-label="Team chemistry"
    >
      <div className="team-chemistry-headline">
        <div
          className="team-chemistry-number"
          style={{ "--chemistry-progress": `${score ?? 0}%` } as CSSProperties}
        >
          <span className="sr-only">TEAM CHEMISTRY</span>
          <strong>{loading ? "…" : (score ?? "—")}</strong>
          <small>{score != null && !loading ? "/ 100" : ""}</small>
        </div>
        <div>
          <h2>
            {loading
              ? "Reviewing your lineup…"
              : error
                ? "Team analysis unavailable"
                : (value?.label ?? "Start building your team")}
          </h2>
          <span className="team-chemistry-subtitle">
            Overall team chemistry
          </span>
          {value && !loading && (
            <span
              className="evidence-hint"
              tabIndex={0}
              role="img"
              aria-label={evidence}
            >
              <span aria-hidden="true">ⓘ</span>
              <span className="evidence-tooltip" aria-hidden="true">
                {evidence}
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="team-chemistry-copy">
        <p>
          {(!loading && (error || value?.teamwork)) ||
            "Drag employees onto the lineup or use their Add button."}
        </p>
        {value && !loading && (
          <small>
            {value.knownPairs} of {value.totalPairs} connections with feedback
            {value.evidence === "LIMITED" ? " · provisional" : ""}.
          </small>
        )}
      </div>
    </section>
  );
}
