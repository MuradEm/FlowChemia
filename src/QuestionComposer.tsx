import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";
import type { CompanySkill, ManagedQuestion, QuestionProposal } from "./api";
import {
  initialAllocations,
  percentageUnits,
  proposalWeights,
} from "./question-management";
import type { SkillAllocation } from "./question-management";
import { Icon } from "./Icon";

type Props = {
  source: ManagedQuestion | null;
  skills: CompanySkill[];
  blocked: boolean;
  onClose: () => void;
  onSubmit: (proposal: QuestionProposal) => Promise<void>;
};
export default function QuestionComposer({
  source,
  skills,
  blocked,
  onClose,
  onSubmit,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [key] = useState(
    () => source?.questionKey ?? `custom-${crypto.randomUUID()}`,
  );
  const [text, setText] = useState(source?.text ?? "");
  const [dimension, setDimension] = useState<QuestionProposal["dimension"]>(
    source?.dimension === "CHEMISTRY_ENJOYMENT" ||
      source?.dimension === "CHEMISTRY_EFFECTIVENESS"
      ? source.dimension
      : "SKILL",
  );
  const [allocations, setAllocations] = useState<SkillAllocation[]>(
    initialAllocations(source),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const weights = proposalWeights(allocations, skills);
  const total =
    allocations.reduce(
      (sum, a) => sum + (percentageUnits(a.percentage) ?? 0),
      0,
    ) / 100;
  const activeSkills = skills.filter(
    (s) => s.active || allocations.some((a) => a.skillId === s.id),
  );
  const disabled = busy || blocked;
  return (
    <dialog
      ref={dialog}
      className="help-dialog question-dialog"
      aria-labelledby="question-composer-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-topline">
        <span className="eyebrow">COMPANY QUESTION</span>
        <button
          className="icon-button"
          aria-label="Close question proposal"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="question-composer-title">
        {source ? "Propose a new version" : "Propose a question"}
      </h2>
      <p>
        {source
          ? `Version ${source.version} stays unchanged. This proposal creates a separate version for fresh HR review.`
          : "New questions stay in draft until HR approves them."}{" "}
        Employees answer with a rating from 1–5 or “Not observed.”
      </p>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="setup-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            lock.current ||
            blocked ||
            !text.trim() ||
            (dimension === "SKILL" && !weights)
          )
            return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            await onSubmit({
              questionKey: key,
              text: text.trim(),
              dimension,
              skillWeights: dimension === "SKILL" ? weights! : [],
            });
          } catch (failure) {
            setError(errorMessage(failure));
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <label htmlFor="question-wording">Question wording</label>
        <textarea
          id="question-wording"
          required
          maxLength={1000}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          aria-describedby="question-wording-help"
        />
        <p className="setup-note" id="question-wording-help">
          Ask about behaviour observed during recent work together. This wording
          appears in the employee’s survey; no written response is requested.
        </p>
        <label htmlFor="question-dimension">
          What does this question measure?
        </label>
        <select
          id="question-dimension"
          value={dimension}
          onChange={(e) =>
            setDimension(e.target.value as QuestionProposal["dimension"])
          }
          disabled={disabled}
        >
          <option value="SKILL">Skills</option>
          <option value="CHEMISTRY_ENJOYMENT">
            Enjoyment of working together
          </option>
          <option value="CHEMISTRY_EFFECTIVENESS">
            Collaboration effectiveness
          </option>
        </select>
        {dimension === "SKILL" ? (
          <fieldset className="question-skill-options" disabled={disabled}>
            <legend>Affected skills and influence</legend>
            <p className="setup-note">
              Select up to ten active skills. Percentages must add up to 100%.
              These weights configure the question; they are not employee
              scores.
            </p>
            {activeSkills.length === 0 && (
              <p className="auth-message">
                No active skills yet. Ask the owner or HR to add company skills
                or approve the standard library.
              </p>
            )}
            {activeSkills.map((skill) => {
              const selected = allocations.find((a) => a.skillId === skill.id);
              return (
                <div className="question-skill-option" key={skill.id}>
                  <label className="question-skill-choice">
                    <input
                      type="checkbox"
                      checked={!!selected}
                      disabled={
                        (!skill.active && !selected) ||
                        (!selected && allocations.length >= 10)
                      }
                      onChange={(e) =>
                        setAllocations((previous) =>
                          e.target.checked
                            ? [
                                ...previous,
                                {
                                  skillId: skill.id,
                                  percentage: previous.length ? "" : "100",
                                },
                              ]
                            : previous.filter((a) => a.skillId !== skill.id),
                        )
                      }
                    />
                    <span>
                      {skill.name}
                      {!skill.active && " · Inactive"}
                    </span>
                  </label>
                  {selected && (
                    <div className="question-weight">
                      <label htmlFor={`skill-weight-${skill.id}`}>
                        Influence for {skill.name} (%)
                      </label>
                      <input
                        id={`skill-weight-${skill.id}`}
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        required
                        value={selected.percentage}
                        onChange={(e) =>
                          setAllocations((previous) =>
                            previous.map((a) =>
                              a.skillId === skill.id
                                ? { ...a, percentage: e.target.value }
                                : a,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <p
              className={`allocation-total ${weights ? "allocation-valid" : ""}`}
              role="status"
            >
              Total influence:{" "}
              {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}%
              {weights
                ? " · Ready"
                : " · Use active skills with positive percentages totalling 100%"}
            </p>
          </fieldset>
        ) : (
          <p className="auth-message">
            This is a directional relationship question about the respondent’s
            experience with one colleague. It does not affect skill estimates.
          </p>
        )}
        {text.trim() && (
          <div className="question-preview">
            <span className="eyebrow">EMPLOYEE PREVIEW</span>
            <p>During your recent work together</p>
            <strong>{text.trim()}</strong>
            <p>1 · 2 · 3 · 4 · 5 · Not observed</p>
          </div>
        )}
        <div className="question-dialog-actions">
          <button
            className="primary-button"
            disabled={
              disabled || !text.trim() || (dimension === "SKILL" && !weights)
            }
          >
            {busy ? "Submitting…" : "Submit for HR review"}
            <Icon name="arrow" />
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
