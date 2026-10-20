import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import { Icon } from "./Icon";
import QuestionComposer from "./QuestionComposer";
import QuestionReview from "./QuestionReview";
import {
  ApiError,
  errorMessage,
  getQuestionCapabilities,
  getManagedQuestions,
  getCompanySkills,
  getStandardLibrary,
  proposeQuestion,
  reviewQuestion,
  createCompanySkill,
  importStandardQuestions,
} from "./api";
import type {
  Membership,
  Session,
  QuestionCapabilities,
  ManagedQuestion,
  CompanySkill,
  StandardLibrary,
} from "./api";
import { questionCategory } from "./question-management";
import { formatDate } from "./workspace";

type Props = {
  session: Session;
  membership: Membership;
  onExpired: () => void;
  onExit: () => void;
  onBack: () => void;
  onSwitchCompany: () => void;
};
export default function QuestionManagement({
  session,
  membership,
  onExpired,
  onExit,
  onBack,
  onSwitchCompany,
}: Props) {
  const [capabilities, setCapabilities] = useState<QuestionCapabilities | null>(
    null,
  );
  const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
  const [skills, setSkills] = useState<CompanySkill[]>([]);
  const [library, setLibrary] = useState<StandardLibrary | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [mustRefresh, setMustRefresh] = useState(false);
  const [composer, setComposer] = useState<{
    source: ManagedQuestion | null;
  } | null>(null);
  const [reviewing, setReviewing] = useState<ManagedQuestion | null>(null);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [category, setCategory] = useState("ALL");
  const [skillName, setSkillName] = useState("");
  const alive = useRef(false),
    locked = useRef(false),
    request = useRef<AbortController | null>(null);
  const org = membership.organization.id;
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setCapabilities(null);
    setQuestions([]);
    setSkills([]);
    setLibrary(null);
    try {
      const rights = await getQuestionCapabilities(
        session.token,
        org,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      if (!rights.canPropose && !rights.canReview) {
        setCapabilities(rights);
        setMustRefresh(false);
        return;
      }
      const [items, dimensions, standard] = await Promise.all([
        getManagedQuestions(session.token, org, controller.signal),
        getCompanySkills(session.token, org, controller.signal),
        getStandardLibrary(session.token, org, controller.signal),
      ]);
      if (
        !Array.isArray(items) ||
        !Array.isArray(dimensions) ||
        !Array.isArray(standard.questions)
      )
        throw new ApiError(502, "Question management could not be loaded.");
      if (!alive.current || controller.signal.aborted) return;
      setCapabilities(rights);
      setQuestions(items);
      setSkills(dimensions);
      setLibrary(standard);
      setMustRefresh(false);
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally {
      if (alive.current && !controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  async function perform<T>(
    label: string,
    action: () => Promise<T>,
    success: (value: T) => string,
  ) {
    if (locked.current || loading || mustRefresh)
      throw new ApiError(
        409,
        "Refresh the question library before continuing.",
      );
    locked.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const value = await action();
      if (!alive.current) return;
      setNotice(success(value));
      setComposer(null);
      setReviewing(null);
      await load();
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof ApiError && failure.status === 401) {
        onExpired();
        return;
      }
      const unknown =
        !(failure instanceof ApiError) ||
        failure.status === 0 ||
        failure.status >= 500;
      setMustRefresh(
        unknown ||
          (failure instanceof ApiError &&
            [403, 404, 409].includes(failure.status)),
      );
      if (failure instanceof ApiError && failure.status === 403)
        setCapabilities(null);
      const message = unknown
        ? "We couldn’t confirm whether the change was saved. Close this dialog, refresh, and inspect the library before trying again. The request will not be retried automatically."
        : failure instanceof ApiError && failure.status === 400
          ? "The proposal or decision could not be accepted. Check the wording, category, active skills and total influence; refresh if the library has changed."
          : errorMessage(failure);
      setError(message);
      throw new ApiError(
        failure instanceof ApiError ? failure.status : 0,
        message,
      );
    } finally {
      locked.current = false;
      if (alive.current) setBusy("");
    }
  }
  const allowed =
    !!capabilities && (capabilities.canPropose || capabilities.canReview);
  const disabled = loading || !!busy || mustRefresh;
  const term = search.trim().toLowerCase();
  const filtered = questions.filter(
    (q) =>
      (status === "ALL" || q.approvalStatus === status) &&
      (category === "ALL" || q.dimension === category) &&
      (!term ||
        [
          q.text,
          ...q.QuestionSkill_question.map(
            (w) => skills.find((s) => s.id === w.skillId)?.name ?? "",
          ),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)),
  );
  const latest = new Map<string, number>();
  questions.forEach((q) =>
    latest.set(
      q.questionKey,
      Math.max(latest.get(q.questionKey) ?? 0, q.version),
    ),
  );
  const canConfigure =
    membership.role === "OWNER" || membership.role === "HR_ADMIN";
  return (
    <div className="setup-page">
      <a className="skip-link" href="#questions-content">
        Skip to content
      </a>
      <header className="setup-header">
        <button className="brand setup-brand" onClick={onBack}>
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </button>
        <nav aria-label="Workspace navigation">
          <button className="text-button" onClick={onBack}>
            My workspace
          </button>
          <button className="text-button" onClick={onSwitchCompany}>
            Switch company
          </button>
          <button className="text-button" onClick={onExit}>
            Sign out
          </button>
        </nav>
      </header>
      <main id="questions-content" className="setup-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · MEANINGFUL FEEDBACK
            </p>
            <h1>
              Question management<span>.</span>
            </h1>
            <p>
              Propose useful questions. Keep every version and HR decision
              clear.
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={loading || !!busy}
            onClick={() => {
              setComposer(null);
              setReviewing(null);
              void load();
            }}
          >
            <Icon name="refresh" /> Refresh library
          </button>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {loading && (
          <p className="loading-copy" role="status">
            Loading question library…
          </p>
        )}
        {busy && (
          <p className="loading-copy" role="status">
            {busy}…
          </p>
        )}
        {!loading && capabilities && !allowed && (
          <section className="setup-panel">
            <h2>Question management is unavailable for your role</h2>
            <p>
              Current team managers and participating team leaders can propose
              questions. Owners and HR can also propose questions; only HR can
              approve or reject them.
            </p>
            <button className="secondary-button" onClick={onBack}>
              Back to my workspace
            </button>
          </section>
        )}
        {allowed && (
          <>
            <section
              className="setup-panel question-workflow"
              aria-labelledby="question-workflow-heading"
            >
              <div>
                <h2 id="question-workflow-heading">From proposal to survey</h2>
                <p>Propose → HR review → Approved library → Future surveys</p>
                <p className="setup-note">
                  Approved questions become eligible for future adaptive
                  surveys. Fixed question sets and already issued surveys keep
                  their assigned versions. Proposals never change existing
                  answers.
                </p>
              </div>
              <div className="question-workflow-actions">
                {capabilities.canPropose && (
                  <button
                    className="primary-button"
                    disabled={disabled}
                    onClick={() => setComposer({ source: null })}
                  >
                    Propose question
                    <Icon name="arrow" />
                  </button>
                )}
                {capabilities.canReview && (
                  <button
                    className="secondary-button"
                    disabled={disabled}
                    onClick={() => setStatus("DRAFT")}
                  >
                    Review drafts (
                    {
                      questions.filter((q) => q.approvalStatus === "DRAFT")
                        .length
                    }
                    )
                  </button>
                )}
              </div>
            </section>
            <div className="question-filters">
              <div>
                <label htmlFor="question-search">
                  Search questions or skills
                </label>
                <input
                  id="question-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="question-status">Status</label>
                <select
                  id="question-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Awaiting HR review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div>
                <label htmlFor="question-category-filter">Category</label>
                <select
                  id="question-category-filter"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="ALL">All categories</option>
                  <option value="SKILL">Skills</option>
                  <option value="CHEMISTRY_ENJOYMENT">Enjoyment</option>
                  <option value="CHEMISTRY_EFFECTIVENESS">
                    Collaboration effectiveness
                  </option>
                  <option value="UNSPECIFIED">Legacy / unspecified</option>
                </select>
              </div>
            </div>
            <p className="question-results-count" role="status">
              {filtered.length} question version
              {filtered.length === 1 ? "" : "s"} shown. All versions stay
              available for their historical surveys.
            </p>
            {filtered.length === 0 && (
              <section className="setup-panel empty-state">
                <h2>
                  {questions.length
                    ? "No matching questions"
                    : "Build your question library"}
                </h2>
                <p>
                  {questions.length
                    ? "Change the search or filters to see other versions."
                    : "Propose a question or ask HR to review and add the standard library below."}
                </p>
              </section>
            )}
            <div className="question-library-grid">
              {filtered.map((question) => (
                <article
                  className="setup-panel question-library-card"
                  key={question.id}
                  aria-labelledby={`question-${question.id}`}
                >
                  <div className="question-card-meta">
                    <span
                      className={`question-status status-${question.approvalStatus.toLowerCase()}`}
                    >
                      {question.approvalStatus === "DRAFT"
                        ? "Awaiting HR review"
                        : question.approvalStatus === "APPROVED"
                          ? "Approved"
                          : "Rejected"}
                    </span>
                    <span>
                      Version {question.version}
                      {question.version < latest.get(question.questionKey)!
                        ? " · Earlier version"
                        : ""}
                      {!question.active ? " · Inactive" : ""}
                    </span>
                  </div>
                  <p className="question-category-label">
                    {questionCategory(question.dimension)}
                    {question.createdByMembershipId === membership.id
                      ? " · Your proposal"
                      : ""}
                  </p>
                  <h2 id={`question-${question.id}`}>{question.text}</h2>
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
                  {question.reviewedAt && (
                    <p className="setup-note">
                      {question.approvalOrigin === "STANDARD"
                        ? "Standard library adopted by HR"
                        : question.approvalStatus === "REJECTED"
                          ? "Rejected by HR"
                          : "Approved by HR"}{" "}
                      · {formatDate(question.reviewedAt)}
                    </p>
                  )}
                  {question.approvalOrigin === "LEGACY" && (
                    <p className="setup-note">Preserved legacy approval</p>
                  )}
                  {question.reviewNote && (
                    <div className="question-review-note">
                      <strong>HR review note</strong>
                      <p>{question.reviewNote}</p>
                    </div>
                  )}
                  <div className="question-card-actions">
                    {capabilities.canReview &&
                      question.approvalStatus === "DRAFT" && (
                        <button
                          className="primary-button"
                          disabled={disabled}
                          onClick={() => setReviewing(question)}
                        >
                          Review question
                        </button>
                      )}
                    {capabilities.canPropose && (
                      <button
                        className="text-button"
                        disabled={disabled}
                        onClick={() => setComposer({ source: question })}
                      >
                        Propose new version <Icon name="arrow" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <section
              className="setup-panel"
              aria-labelledby="company-skills-heading"
            >
              <h2 id="company-skills-heading">Company skills</h2>
              <p>
                Skill questions can affect one or more active skills.
                Relationship questions affect enjoyment or effectiveness
                separately.
              </p>
              <ul className="company-skill-tags">
                {skills.map((skill) => (
                  <li key={skill.id}>
                    {skill.name}
                    {!skill.active ? " · Inactive" : ""}
                  </li>
                ))}
              </ul>
              {capabilities.canManageSkills ? (
                <details>
                  <summary className="question-details-summary">
                    Add a company skill
                  </summary>
                  <form
                    className="setup-form"
                    aria-label="Add company skill"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void perform(
                        "Adding skill",
                        () => createCompanySkill(session.token, org, skillName),
                        (result) => {
                          setSkillName("");
                          return `${result.name} added. It can now be mapped to proposed questions.`;
                        },
                      ).catch(() => {});
                    }}
                  >
                    <label htmlFor="company-skill-name">New skill name</label>
                    <input
                      id="company-skill-name"
                      required
                      maxLength={120}
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      disabled={disabled}
                    />
                    <button
                      className="secondary-button"
                      disabled={disabled || !skillName.trim()}
                    >
                      Add skill
                    </button>
                  </form>
                </details>
              ) : (
                skills.every((s) => !s.active) && (
                  <p className="setup-note">
                    Ask the owner or HR to add an active company skill.
                  </p>
                )
              )}
            </section>
            {library && (
              <section
                className="setup-panel"
                aria-labelledby="standard-question-heading"
              >
                <h2 id="standard-question-heading">Standard questions</h2>
                <p>
                  A starting library for skills, enjoyment and collaboration
                  effectiveness.
                </p>
                <details className="standard-library">
                  <summary>
                    Review standard questions ({library.questions.length})
                  </summary>
                  <p>{library.context}</p>
                  <ul>
                    {library.questions.map((q) => (
                      <li key={q.templateKey}>
                        <span>
                          {q.skillName ?? questionCategory(q.dimension)}
                        </span>
                        <p>{q.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
                {capabilities.canImportStandard ? (
                  <>
                    <p className="setup-note">
                      Adding records your HR approval and imports only missing
                      standard questions and skills. Existing versions stay
                      unchanged.
                    </p>
                    <button
                      className="secondary-button"
                      disabled={disabled}
                      onClick={() =>
                        void perform(
                          "Adding standard questions",
                          () => importStandardQuestions(session.token, org),
                          (result) =>
                            `${result.createdQuestions} standard questions added with your HR approval. Existing questions were preserved.`,
                        ).catch(() => {})
                      }
                    >
                      Approve and add standard questions
                    </button>
                  </>
                ) : (
                  <p className="setup-note">
                    Only HR can approve and add the standard library.
                  </p>
                )}
              </section>
            )}
            {!canConfigure && (
              <p className="setup-note">
                HR can review proposals in this company. Survey timing and
                generation remain with the owner and HR.
              </p>
            )}
          </>
        )}
        {composer && capabilities?.canPropose && (
          <QuestionComposer
            key={composer.source?.id ?? "new"}
            source={composer.source}
            skills={skills}
            blocked={mustRefresh}
            onClose={() => setComposer(null)}
            onSubmit={(proposal) =>
              perform(
                "Submitting proposal",
                () => proposeQuestion(session.token, org, proposal),
                (q) =>
                  `Version ${q.version} submitted for HR review. It will not enter new surveys until approved.`,
              )
            }
          />
        )}
        {reviewing && capabilities?.canReview && (
          <QuestionReview
            key={reviewing.id}
            question={reviewing}
            skills={skills}
            blocked={mustRefresh}
            onClose={() => setReviewing(null)}
            onReview={(decision, note) =>
              perform(
                "Saving HR decision",
                () =>
                  reviewQuestion(
                    session.token,
                    org,
                    reviewing.id,
                    decision,
                    note,
                  ),
                (q) =>
                  `Version ${q.version} ${decision === "APPROVED" ? "approved" : "rejected"}. Existing surveys and answers remain unchanged.`,
              )
            }
          />
        )}
      </main>
    </div>
  );
}
