import { useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "./api";
import type { RatingAnswer, SurveyView } from "./workspace";
import { formatDate } from "./workspace";
import { Icon } from "./Icon";

type Props = {
  survey: SurveyView;
  mode: "demo" | "live";
  onClose: () => void;
  onSubmit: (answers: RatingAnswer[]) => Promise<void>;
  onSkip: () => Promise<void>;
  onReplace: () => Promise<void>;
  onRefresh: () => void;
};

export default function SurveyDialog({
  survey,
  mode,
  onClose,
  onSubmit,
  onSkip,
  onReplace,
  onRefresh,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const actionLock = useRef(false);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mustRefresh, setMustRefresh] = useState(false);
  const answered = survey.questions.filter((q) =>
    Object.hasOwn(answers, q.id),
  ).length;
  const questionCount = survey.questions.length;
  const disabled = busy || mustRefresh || !survey.actionable;
  const demo = mode === "demo";

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function perform(action: () => Promise<void>) {
    if (actionLock.current || disabled) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        (failure.status === 0 || failure.status >= 500)
      ) {
        setMustRefresh(true);
        setError(
          "We couldn’t confirm whether your action completed. Refresh your check-ins to check the result before trying again.",
        );
      } else if (
        failure instanceof ApiError &&
        [404, 409].includes(failure.status)
      ) {
        setMustRefresh(true);
        setError(errorMessage(failure));
      } else setError(errorMessage(failure));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="survey-dialog"
      aria-labelledby="survey-title"
      aria-busy={busy}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-topline">
        <span className="eyebrow">
          {demo ? "DEMO CHECK-IN" : "YOUR CHECK-IN"}
        </span>
        <button
          className="icon-button"
          aria-label="Close survey"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      {error && (
        <div className="auth-error" role="alert">
          <p>{error}</p>
          {mustRefresh && (
            <button className="secondary-button" onClick={onRefresh}>
              Refresh my check-ins
            </button>
          )}
        </div>
      )}
      {!survey.actionable && (
        <p className="auth-error" role="status">
          This check-in is no longer open. Refresh your list to see your current
          assignments.
        </p>
      )}
      {confirmSkip ? (
        <div className="skip-confirmation">
          <span className="round-icon amber">
            <Icon name="survey" />
          </span>
          <h2 id="survey-title">Skip this check-in?</h2>
          <p>
            You can skip without giving ratings. A skipped survey earns 60%
            participation credit, compared with 100% for a completed survey.
          </p>
          <p className="muted">
            {demo
              ? "This is a demo. No company points or rewards are awarded."
              : "This will close this check-in. Your company defines the value of participation rewards."}
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => setConfirmSkip(false)}
            >
              Go back
            </button>
            <button
              className="primary-button"
              disabled={disabled}
              onClick={() => void perform(onSkip)}
            >
              {busy ? "Saving…" : "Skip check-in"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="survey-person">
            <span className={`avatar ${survey.color}`}>{survey.initials}</span>
            <div>
              <h2 id="survey-title">
                Your experience with {survey.subjectName.trim().split(/\s+/)[0]}
              </h2>
              <p>
                {survey.subjectName} · {survey.subtitle}
              </p>
            </div>
          </div>
          {survey.closesAt && (
            <p className="deadline-label">
              Available until {formatDate(survey.closesAt)}
            </p>
          )}
          {survey.requiresReplacement ? (
            <div className="replacement-notice">
              <h3>This colleague is no longer active</h3>
              <p>
                Choose another colleague so you can give feedback about someone
                available in your company.
              </p>
              <button
                className="primary-button"
                disabled={disabled}
                onClick={() => void perform(onReplace)}
              >
                {busy ? "Finding a colleague…" : "Try another colleague"}{" "}
                <Icon name="refresh" />
              </button>
            </div>
          ) : (
            <>
              <p className="survey-intro">
                Think about your recent work together. Choose what best reflects
                your experience, or select <strong>Not observed</strong>.
              </p>
              <div className="survey-progress">
                <span>
                  {answered} of {questionCount} answered
                </span>
                <span>
                  <Icon name="clock" /> About 2 minutes
                </span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${questionCount ? (answered / questionCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (answered === questionCount && questionCount > 0)
                    void perform(() =>
                      onSubmit(
                        survey.questions.map((q) => ({
                          questionVersionId: q.id,
                          rating: answers[q.id],
                        })),
                      ),
                    );
                }}
              >
                <p className="rating-legend">
                  1 · Very low <span>3 · Satisfactory</span> 5 · Excellent
                </p>
                {survey.questions.map((question, index) => (
                  <fieldset
                    className="rating-question"
                    key={question.id}
                    disabled={disabled}
                  >
                    <legend>
                      <span className="question-category">
                        {index + 1}. {question.category}
                      </span>
                      <span>{question.text}</span>
                    </legend>
                    <div className="rating-options">
                      {[1, 2, 3, 4, 5, null].map((value) => (
                        <label
                          className={`rating-option ${Object.hasOwn(answers, question.id) && answers[question.id] === value ? "selected" : ""} ${value === null ? "not-observed" : ""}`}
                          key={String(value)}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={value ?? "unobserved"}
                            checked={
                              Object.hasOwn(answers, question.id) &&
                              answers[question.id] === value
                            }
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.id]: value,
                              }))
                            }
                            required
                          />
                          <span>{value ?? "Not observed"}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <p className="demo-disclaimer">
                  <Icon name="shield" />{" "}
                  {demo
                    ? "Demo only. Your ratings are not stored or sent to the backend."
                    : "Completing this check-in saves your answers to your company’s backend."}
                </p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={disabled}
                    onClick={() => setConfirmSkip(true)}
                  >
                    Skip this survey
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      disabled ||
                      answered !== questionCount ||
                      questionCount === 0
                    }
                  >
                    {busy ? "Saving…" : "Complete check-in"}{" "}
                    <Icon name="check" />
                  </button>
                </div>
              </form>
              <div className="replacement-action">
                <span>Haven’t worked together enough?</span>
                <button
                  className="text-button"
                  disabled={disabled}
                  onClick={() => void perform(onReplace)}
                >
                  {busy ? "Please wait…" : "Try another colleague"}{" "}
                  <Icon name="refresh" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
