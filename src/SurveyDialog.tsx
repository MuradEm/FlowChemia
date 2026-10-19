import { useEffect, useRef, useState } from "react";
import { colleagues, questions } from "./demo";
import type { DemoAssignment } from "./demo";
import { Icon } from "./Icon";

type Props = {
  assignment: DemoAssignment;
  onClose: () => void;
  onFinish: (status: "COMPLETED" | "SKIPPED") => void;
  onReplace: () => void;
};

export default function SurveyDialog({
  assignment,
  onClose,
  onFinish,
  onReplace,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [confirmSkip, setConfirmSkip] = useState(false);
  const colleague = colleagues.find((p) => p.id === assignment.subjectId)!;
  const answered = Object.keys(answers).length;

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

  return (
    <dialog
      ref={dialog}
      className="survey-dialog"
      aria-labelledby="survey-title"
      onCancel={onClose}
    >
      <div className="dialog-topline">
        <span className="eyebrow">DEMO CHECK-IN</span>
        <button
          className="icon-button"
          aria-label="Close survey"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
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
            This is a demo. No company points or rewards are awarded.
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setConfirmSkip(false)}
            >
              Go back
            </button>
            <button
              className="primary-button"
              onClick={() => onFinish("SKIPPED")}
            >
              Skip check-in
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="survey-person">
            <span className={`avatar ${colleague.color}`}>
              {colleague.initials}
            </span>
            <div>
              <h2 id="survey-title">
                Your experience with {colleague.name.split(" ")[0]}
              </h2>
              <p>
                {colleague.name} · {colleague.role}
              </p>
            </div>
          </div>
          <p className="survey-intro">
            Think about your recent work together. Choose what best reflects
            your experience, or select <strong>Not observed</strong>.
          </p>
          <div className="survey-progress">
            <span>{answered} of 5 answered</span>
            <span>
              <Icon name="clock" /> About 2 minutes
            </span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${answered * 20}%` }} />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (answered === 5) onFinish("COMPLETED");
            }}
          >
            <p className="rating-legend">
              1 · Very low <span>3 · Satisfactory</span> 5 · Excellent
            </p>
            {questions.map((question, index) => (
              <fieldset className="rating-question" key={question.id}>
                <legend>
                  <span className="question-category">
                    {index + 1}. {question.category}
                  </span>
                  <span>{question.text}</span>
                </legend>
                <div className="rating-options">
                  {[1, 2, 3, 4, 5, null].map((value) => (
                    <label
                      className={`rating-option ${answers[question.id] === value ? "selected" : ""} ${value === null ? "not-observed" : ""}`}
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
              <Icon name="shield" /> Demo only. Your ratings are not stored or
              sent to the backend.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => setConfirmSkip(true)}
              >
                Skip this survey
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={answered !== 5}
              >
                Complete check-in <Icon name="check" />
              </button>
            </div>
          </form>
          <div className="replacement-action">
            <span>Haven’t worked together enough?</span>
            <button className="text-button" onClick={onReplace}>
              Try another colleague <Icon name="refresh" />
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
