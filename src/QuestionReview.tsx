import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";
import type { CompanySkill, ManagedQuestion } from "./api";
import {
  initialAllocations,
  proposalWeights,
  questionCategory,
} from "./question-management";
import { Icon } from "./Icon";

export default function QuestionReview({
  question,
  skills,
  blocked,
  onClose,
  onReview,
}: {
  question: ManagedQuestion;
  skills: CompanySkill[];
  blocked: boolean;
  onClose: () => void;
  onReview: (decision: "APPROVED" | "REJECTED", note: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    lock = useRef(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const valid =
    question.active &&
    question.kind === "RATING" &&
    (question.dimension === "SKILL"
      ? !!proposalWeights(initialAllocations(question), skills)
      : ["CHEMISTRY_ENJOYMENT", "CHEMISTRY_EFFECTIVENESS"].includes(
          question.dimension,
        ) && !question.QuestionSkill_question.length);
  async function decide(decision: "APPROVED" | "REJECTED") {
    if (lock.current || blocked) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onReview(decision, note);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="help-dialog question-dialog"
      aria-labelledby="question-review-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-topline">
        <span className="eyebrow">HR REVIEW · VERSION {question.version}</span>
        <button
          className="icon-button"
          aria-label="Close question review"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <h2 id="question-review-title">Review this proposal</h2>
      <p>{questionCategory(question.dimension)} · Rating 1–5 or Not observed</p>
      <blockquote className="review-wording">{question.text}</blockquote>
      {question.QuestionSkill_question.length > 0 && (
        <ul className="question-mapping-list">
          {question.QuestionSkill_question.map((w) => (
            <li key={w.skillId}>
              {skills.find((s) => s.id === w.skillId)?.name ??
                "Unavailable skill"}{" "}
              ·{" "}
              {(Number(w.weight) * 100).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              %
              {skills.some((s) => s.id === w.skillId && s.active)
                ? ""
                : " · Inactive"}
            </li>
          ))}
        </ul>
      )}
      <p>
        Approve only if the wording and skill mappings are suitable for recent
        shared work. Your decision is recorded once and cannot be edited.
        Changes need a new version.
      </p>
      {!valid && (
        <p className="auth-message">
          This version is not ready for new surveys. Check the category, active
          skills and weight total. You can reject it and request a corrected
          version.
        </p>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="setup-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void decide("APPROVED");
        }}
      >
        <label htmlFor="question-review-note">Review note (optional)</label>
        <textarea
          id="question-review-note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy || blocked}
        />
        <div className="question-dialog-actions">
          <button
            className="primary-button"
            disabled={busy || blocked || !valid}
          >
            {busy ? "Saving decision…" : "Approve question"}
            <Icon name="check" />
          </button>
          <button
            type="button"
            className="secondary-button danger-text"
            disabled={busy || blocked}
            onClick={() => void decide("REJECTED")}
          >
            Reject question
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
