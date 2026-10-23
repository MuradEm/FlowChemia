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
  const state =
    value?.chemistry === null || value?.chemistry === undefined
      ? "unknown"
      : value.chemistry >= 80
        ? "positive"
        : value.chemistry >= 60
          ? "mixed"
          : "difficult";
  return (
    <section
      className={`team-chemistry-panel chemistry-${state}`}
      aria-label="Team chemistry"
    >
      <div className="team-chemistry-number">
        <span>TEAM CHEMISTRY</span>
        <strong>{loading ? "…" : (value?.chemistry ?? "—")}</strong>
        <small>
          {value?.chemistry != null && !loading
            ? "approx. / 100"
            : "No team rating yet"}
        </small>
      </div>
      <div className="team-chemistry-copy">
        <h2>
          {loading
            ? "Reviewing your lineup…"
            : error
              ? "Team analysis unavailable"
              : (value?.label ?? "Start building your team")}
        </h2>
        <p>
          {(!loading && (error || value?.teamwork)) ||
            "Drag employees onto the lineup or use their Add button."}
        </p>
        {value && !loading && (
          <>
            <span className="chemistry-evidence">
              {value.evidence === "ESTABLISHED"
                ? "Established feedback"
                : value.evidence === "LIMITED"
                  ? "Provisional · partial feedback"
                  : value.evidence === "RESTRICTED"
                    ? "Feedback access is limited"
                    : "Not enough established feedback"}
            </span>
            <small>
              {value.knownPairs} of {value.totalPairs} connections have
              established feedback in your view. Reported experience is a guide,
              not a measured probability of success.
            </small>
          </>
        )}
      </div>
    </section>
  );
}
