import CompanyTestBanner from "./CompanyTestBanner";
import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import { Icon } from "./Icon";
import {
  ApiError,
  errorMessage,
  getSurveySchedule,
  saveSurveySchedule,
  getSurveyQuestions,
  getSurveySkills,
  getStandardLibrary,
  importStandardQuestions,
  generateCompanySurveys,
  pauseAutomaticSurveys,
  setCompanyTestMode,
  generateTestSurveys,
} from "./api";
import type {
  Membership,
  Session,
  SurveySchedule,
  ScheduleChange,
  SurveyQuestion,
  SurveySkill,
  StandardLibrary,
} from "./api";
import {
  adaptiveReady,
  approvedPool,
  fixedReady,
  policyForm,
} from "./survey-settings";

const frequencies = {
  WEEKLY: "Every week",
  FORTNIGHTLY: "Every two weeks",
  MONTHLY: "Every month",
};
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const zones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
const category = (dimension: string) =>
  ({
    SKILL: "Skills",
    CHEMISTRY_ENJOYMENT: "Enjoyment",
    CHEMISTRY_EFFECTIVENESS: "Collaboration effectiveness",
  })[dimension] ?? dimension;
const dateTime = (value: string, zone: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zone,
  }).format(new Date(value));

type Props = {
  session: Session;
  membership: Membership;
  onExpired: () => void;
  onExit: () => void;
  onBack: () => void;
  onSwitchCompany: () => void;
  onCompanySetup: () => void;
  onQuestionManagement?: () => void;
};

export default function SurveySettings({
  session,
  membership,
  onExpired,
  onExit,
  onBack,
  onSwitchCompany,
  onCompanySetup,
  onQuestionManagement,
}: Props) {
  const [schedule, setSchedule] = useState<SurveySchedule | null>(null);
  const [form, setForm] = useState<ScheduleChange | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [skills, setSkills] = useState<SurveySkill[]>([]);
  const [library, setLibrary] = useState<StandardLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mustRefresh, setMustRefresh] = useState(false);
  const alive = useRef(false);
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const pendingTestRequest = useRef<string | null>(null);
  const org = membership.organization.id;

  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setSchedule(null);
    setForm(null);
    setQuestions([]);
    setSkills([]);
    setLibrary(null);
    try {
      const [settings, items, dimensions, standard] = await Promise.all([
        getSurveySchedule(session.token, org, controller.signal),
        getSurveyQuestions(session.token, org, controller.signal),
        getSurveySkills(session.token, org, controller.signal),
        getStandardLibrary(session.token, org, controller.signal),
      ]);
      if (
        !settings.policy ||
        !Array.isArray(items) ||
        !Array.isArray(dimensions) ||
        !Array.isArray(standard.questions)
      )
        throw new ApiError(502, "Survey settings could not be loaded.");
      if (!alive.current || controller.signal.aborted) return;
      setSchedule(settings);
      const initial = policyForm(settings.pending ?? settings.policy);
      // A fresh company has no fixed questions. Suggest adaptive selection without silently saving it.
      if (
        initial.questionSelection === "MANUAL" &&
        !initial.questionVersionIds.length
      )
        initial.questionSelection = "ADAPTIVE";
      setForm(initial);
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
    // This screen unmounts when changing company or account.
  }, []);

  async function perform<T>(
    label: string,
    action: () => Promise<T>,
    success: (value: T) => string,
  ) {
    if (lock.current || loading || mustRefresh) return;
    lock.current = true;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const value = await action();
      if (!alive.current) return;
      setNotice(success(value));
      await load();
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else {
        const unknown =
          !(failure instanceof ApiError) ||
          failure.status === 0 ||
          failure.status >= 500;
        setMustRefresh(
          unknown ||
            (failure instanceof ApiError &&
              [403, 404, 409].includes(failure.status)),
        );
        setError(
          unknown
            ? "We couldn’t confirm the result. Refresh and inspect the saved settings and last generation before trying again. Your request will not be retried automatically."
            : failure instanceof ApiError && failure.status === 400
              ? "The settings or questions could not be accepted. Check the timezone, approved question library and five-question format, then refresh before trying again."
              : errorMessage(failure),
        );
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy("");
    }
  }
  const pool = approvedPool(questions, skills);
  const ready = adaptiveReady(pool);
  const dirty =
    !!schedule &&
    !!form &&
    JSON.stringify(form) !==
      JSON.stringify(policyForm(schedule.pending ?? schedule.policy));
  const periodProcessed = !!schedule?.currentPeriodProcessed;
  const currentReady =
    !!schedule &&
    (schedule.policy.questionSelection === "ADAPTIVE"
      ? ready
      : fixedReady(schedule.policy.questionVersionIds, pool));
  const disabled = loading || !!busy || mustRefresh || !schedule;
  const formReady =
    !!form &&
    (form.questionSelection === "ADAPTIVE"
      ? ready
      : fixedReady(form.questionVersionIds, pool));
  function update<K extends keyof ScheduleChange>(
    key: K,
    value: ScheduleChange[K],
  ) {
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  }
  async function generateManual() {
    if (schedule?.testMode || pendingTestRequest.current) {
      const requestId = pendingTestRequest.current ?? crypto.randomUUID();
      pendingTestRequest.current = requestId;
      try {
        return await generateTestSurveys(session.token, org, requestId);
      } catch (failure) {
        if (
          failure instanceof ApiError &&
          failure.status >= 400 &&
          failure.status < 500
        )
          pendingTestRequest.current = null;
        throw failure;
      }
    }
    return generateCompanySurveys(session.token, org);
  }
  const zone = schedule?.policy.timeZone ?? "UTC";

  return (
    <div className="setup-page">
      <a className="skip-link" href="#survey-settings-content">
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
          <button className="text-button" onClick={onCompanySetup}>
            Company setup
          </button>
          <button className="text-button" onClick={onSwitchCompany}>
            Switch company
          </button>
          <button className="text-button" onClick={onExit}>
            Sign out
          </button>
        </nav>
      </header>
      <main id="survey-settings-content" className="setup-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {membership.organization.name} · COMPANY CHECK-INS
            </p>
            <h1>
              Survey settings<span>.</span>
            </h1>
            <p>A little feedback, at a pace that fits your company.</p>
          </div>
          <button
            className="secondary-button"
            disabled={loading || !!busy}
            onClick={() => void load()}
          >
            <Icon name="refresh" /> Refresh settings
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
            Loading survey settings…
          </p>
        )}
        {busy && (
          <p className="loading-copy" role="status">
            {busy}…
          </p>
        )}
        {schedule?.testMode && <CompanyTestBanner />}
        {schedule && (
          <section
            className="setup-panel test-mode-settings"
            aria-labelledby="test-mode-heading"
          >
            <div>
              <span className="eyebrow">COMPANY SETTING</span>
              <h2 id="test-mode-heading">
                Test mode · {schedule.testMode ? "Enabled" : "Off"}
              </h2>
              <p>
                Allow extra manual batches in the same period. Employees must
                still resolve every unanswered survey before receiving another
                batch. Automatic generation keeps its normal schedule.
              </p>
              <p className="setup-note">
                Test surveys use this company’s real records: answers,
                participation and employee insights update normally. Turning
                test mode off keeps all test surveys and feedback.
              </p>
              {dirty && (
                <p className="setup-note">
                  Save or refresh to discard unsaved schedule changes before
                  switching test mode.
                </p>
              )}
              {pendingTestRequest.current && (
                <p className="setup-note">
                  Confirm the previous test request before changing test mode.
                </p>
              )}
            </div>
            <button
              className="secondary-button"
              disabled={disabled || dirty || !!pendingTestRequest.current}
              onClick={() =>
                void perform(
                  "Updating company test mode",
                  () =>
                    setCompanyTestMode(session.token, org, !schedule.testMode),
                  (result) =>
                    result.testMode
                      ? "Company test mode enabled. Use the manual button for additional test batches."
                      : "Company test mode disabled. Normal period limits apply again; existing test records are preserved.",
                )
              }
            >
              {schedule.testMode ? "Disable test mode" : "Enable test mode"}
            </button>
          </section>
        )}
        {schedule && (
          <section
            className="setup-panel schedule-summary"
            aria-labelledby="current-schedule-heading"
          >
            <div>
              <span className="eyebrow">CURRENT SCHEDULE</span>
              <h2 id="current-schedule-heading">
                {frequencies[schedule.policy.frequency]} ·{" "}
                {schedule.policy.colleaguesPerPeriod}{" "}
                {schedule.policy.colleaguesPerPeriod === 1
                  ? "colleague"
                  : "colleagues"}
              </h2>
              <p>
                {schedule.policy.automaticEnabled
                  ? "Automatic generation enabled"
                  : "Automatic generation paused"}{" "}
                · {zone}
              </p>
              <p>
                Current period: {dateTime(schedule.opensAt, zone)} →{" "}
                {dateTime(schedule.closesAt, zone)}.
              </p>
              <p>
                Next automatic generation:{" "}
                {schedule.nextGenerationAt
                  ? dateTime(schedule.nextGenerationAt, zone)
                  : "Not scheduled"}
                .
              </p>
              <p className="setup-note">
                Period boundaries control new batches. Existing periodic surveys
                do not expire. The backend must stay running for automatic
                generation.
              </p>
            </div>
            {schedule.pending && (
              <div className="pending-schedule">
                <strong>Change scheduled</strong>
                <p>
                  From{" "}
                  {dateTime(
                    schedule.pending.effectiveFrom,
                    schedule.pending.timeZone,
                  )}{" "}
                  ({schedule.pending.timeZone}):{" "}
                  {frequencies[schedule.pending.frequency].toLowerCase()},{" "}
                  {schedule.pending.colleaguesPerPeriod} colleague(s), automatic{" "}
                  {schedule.pending.automaticEnabled ? "enabled" : "paused"}.
                </p>
                <p className="setup-note">
                  The form below edits these pending settings.
                </p>
              </div>
            )}
          </section>
        )}
        {schedule &&
          (schedule.policy.automaticEnabled ||
            schedule.pending?.automaticEnabled) && (
            <div className="pause-schedule">
              <button
                className="secondary-button"
                disabled={disabled}
                onClick={() =>
                  void perform(
                    "Pausing automatic generation",
                    () => pauseAutomaticSurveys(session.token, org),
                    () =>
                      "Automatic generation paused immediately. Pending schedule changes were cancelled. Outstanding surveys remain available.",
                  )
                }
              >
                Pause automatic generation now
              </button>
              <p className="setup-note">
                Pausing also cancels pending schedule changes. Existing surveys
                stay available.
              </p>
            </div>
          )}
        <div className="setup-grid">
          <section className="setup-panel" aria-labelledby="schedule-heading">
            <span className="round-icon teal">
              <Icon name="clock" />
            </span>
            <h2 id="schedule-heading">Set the rhythm</h2>
            <p>
              Each colleague survey has five rating questions and a two-minute
              target.
            </p>
            {form && (
              <form
                className="setup-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    if (/^[+-]/.test(form.timeZone)) throw new Error();
                    new Intl.DateTimeFormat("en", {
                      timeZone: form.timeZone,
                    }).format();
                  } catch {
                    setError(
                      "Enter a valid timezone, for example Europe/Berlin.",
                    );
                    return;
                  }
                  void perform(
                    "Saving settings",
                    () =>
                      saveSurveySchedule(session.token, org, {
                        ...form,
                        questionVersionIds:
                          form.questionSelection === "ADAPTIVE"
                            ? []
                            : form.questionVersionIds,
                      }),
                    (policy) => {
                      return `Settings saved${Date.parse(policy.effectiveFrom) > Date.now() ? "; the change takes effect next period" : ""}. ${policy.automaticEnabled ? "Automatic generation starts at the next configured boundary. Use the manual button for the current period." : "Automatic generation is paused. Manual generation remains available."}`;
                    },
                  );
                }}
              >
                <label htmlFor="survey-frequency">Frequency</label>
                <select
                  id="survey-frequency"
                  value={form.frequency}
                  onChange={(e) =>
                    update(
                      "frequency",
                      e.target.value as ScheduleChange["frequency"],
                    )
                  }
                  disabled={disabled}
                >
                  {Object.entries(frequencies).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label htmlFor="survey-count">
                  Colleague surveys per employee per period
                </label>
                <select
                  id="survey-count"
                  value={form.colleaguesPerPeriod}
                  onChange={(e) =>
                    update("colleaguesPerPeriod", Number(e.target.value))
                  }
                  disabled={disabled}
                >
                  <option value={1}>1 colleague</option>
                  <option value={2}>2 colleagues</option>
                </select>
                <label htmlFor="survey-timezone">Company timezone</label>
                <input
                  id="survey-timezone"
                  list="company-timezones"
                  required
                  maxLength={100}
                  value={form.timeZone}
                  onChange={(e) => update("timeZone", e.target.value)}
                  disabled={disabled}
                />
                <datalist id="company-timezones">
                  {zones.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className="text-button timezone-button"
                  disabled={disabled}
                  onClick={() =>
                    update(
                      "timeZone",
                      Intl.DateTimeFormat().resolvedOptions().timeZone,
                    )
                  }
                >
                  Use my timezone
                </button>
                {form.frequency === "MONTHLY" ? (
                  <>
                    <label htmlFor="survey-monthday">Day of month</label>
                    <select
                      id="survey-monthday"
                      value={form.monthDay}
                      onChange={(e) =>
                        update("monthDay", Number(e.target.value))
                      }
                      disabled={disabled}
                    >
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <p className="setup-note">
                      If that day is missing in a shorter month, generation uses
                      the last day.
                    </p>
                  </>
                ) : (
                  <>
                    <label htmlFor="survey-weekday">Day of week</label>
                    <select
                      id="survey-weekday"
                      value={form.weekday}
                      onChange={(e) =>
                        update("weekday", Number(e.target.value))
                      }
                      disabled={disabled}
                    >
                      {weekdays.map((day, i) => (
                        <option key={day} value={i + 1}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <label htmlFor="survey-time">
                  Generation time (company timezone)
                </label>
                <input
                  id="survey-time"
                  type="time"
                  required
                  value={form.generationTime}
                  onChange={(e) => update("generationTime", e.target.value)}
                  disabled={disabled}
                />
                <label htmlFor="survey-selection">Question selection</label>
                <select
                  id="survey-selection"
                  value={form.questionSelection}
                  onChange={(e) =>
                    update(
                      "questionSelection",
                      e.target.value as ScheduleChange["questionSelection"],
                    )
                  }
                  disabled={disabled}
                >
                  <option value="ADAPTIVE">
                    Adaptive · approved company questions
                  </option>
                  {form.questionVersionIds.length > 0 && (
                    <option value="MANUAL">Existing fixed question set</option>
                  )}
                </select>
                <p className="setup-note">
                  Adaptive selection considers missing evidence and questions
                  already assigned in unanswered surveys.
                </p>
                <label className="schedule-checkbox">
                  <input
                    type="checkbox"
                    checked={form.automaticEnabled}
                    onChange={(e) =>
                      update("automaticEnabled", e.target.checked)
                    }
                    disabled={disabled}
                  />
                  Enable automatic generation
                </label>
                {!formReady && (
                  <p className="auth-message">
                    Approved questions are needed before saving this
                    configuration.{" "}
                    {membership.role === "HR_ADMIN"
                      ? "Review and add the standard library below."
                      : "Ask an HR administrator to review and add the standard library below."}
                  </p>
                )}
                {dirty && (
                  <p className="setup-note" role="status">
                    You have unsaved settings. Saving after a batch has been
                    issued applies changes next period. Pausing automatic
                    generation takes effect immediately.
                  </p>
                )}
                <button
                  className="primary-button"
                  disabled={disabled || !formReady || !dirty}
                >
                  Save survey settings <Icon name="check" />
                </button>
              </form>
            )}
          </section>
          <div>
            <section
              className="setup-panel"
              aria-labelledby="manual-generation-heading"
            >
              <span className="round-icon teal">
                <Icon name="survey" />
              </span>
              <h2 id="manual-generation-heading">
                Generate surveys for everyone
              </h2>
              <p>
                {schedule?.testMode
                  ? "Generate an additional manual test batch now, even if this period has already been processed."
                  : "Run the company’s batch for the current period, including when automatic generation is paused."}
              </p>
              <ul className="survey-rules">
                <li>
                  Only active participants in active teams are eligible. HR
                  administrators stay independent.
                </li>
                <li>
                  Any outstanding survey blocks new surveys for that employee
                  across all their teams.
                </li>
                <li>
                  {schedule?.testMode
                    ? "Test mode: after all outstanding surveys are finished, another manual batch can be generated immediately."
                    : "One batch per period. Finishing a survey does not create an extra batch in the same period."}
                </li>
                <li>
                  Colleagues are distinct. Employees with too few teammates
                  receive fewer surveys.
                </li>
              </ul>
              {periodProcessed &&
                !schedule?.testMode &&
                !pendingTestRequest.current && (
                  <p className="auth-message" role="status">
                    This period’s batch has already been processed. New batches
                    can be generated from{" "}
                    {schedule
                      ? dateTime(schedule.closesAt, zone)
                      : "the next period"}{" "}
                    ({zone}).
                  </p>
                )}
              {dirty && (
                <p className="setup-note">
                  Save or refresh to discard unsaved settings before generating.
                </p>
              )}
              {!currentReady && !loading && (
                <p className="setup-note">
                  Save a valid question selection before generating surveys.
                  Pending settings apply only when their effective date arrives.
                </p>
              )}
              <button
                className="primary-button manual-generation-button"
                disabled={
                  disabled ||
                  (!pendingTestRequest.current &&
                    (dirty ||
                      !currentReady ||
                      (periodProcessed && !schedule?.testMode)))
                }
                onClick={() =>
                  void perform(
                    "Generating surveys",
                    () => generateManual(),
                    (result) => {
                      pendingTestRequest.current = null;
                      if (result.alreadyProcessed)
                        return result.isTest
                          ? "The earlier test request was already processed. No duplicate was created. You can request a new test batch after outstanding surveys are resolved."
                          : "This period’s batch was already processed. No additional surveys were created.";
                      return result.isTest
                        ? `${result.createdAssignments} test surveys created. ${result.blockedEmployees} employees currently have outstanding surveys. ${result.employeesWithLimitedPeers} eligible employees had fewer colleagues than requested.`
                        : `${result.createdAssignments} surveys created. ${result.blockedEmployees} employees blocked by outstanding surveys at this period’s boundary or now. ${result.employeesWithLimitedPeers} eligible employees had fewer colleagues than requested.`;
                    },
                  )
                }
              >
                {pendingTestRequest.current
                  ? "Confirm previous test request"
                  : schedule?.testMode
                    ? "Generate test surveys for everyone"
                    : "Generate surveys for everyone"}{" "}
                <Icon name="arrow" />
              </button>
              <p className="setup-note">
                {schedule?.testMode
                  ? "Only the manual test button bypasses period timing. Question approval, five-question format, distinct peers and unanswered-survey blocking remain in force."
                  : "The same period limit and unanswered-survey rules apply to manual and automatic generation. People who finished an older survey during this period wait until the next period."}
              </p>
            </section>
            {schedule?.lastGeneration && (
              <section
                className="setup-panel"
                aria-labelledby="last-generation-heading"
              >
                <h2 id="last-generation-heading">
                  Last generation
                  {schedule.lastGeneration.isTest ? " · Test batch" : ""}
                </h2>
                <dl className="generation-results">
                  <div>
                    <dt>Period starting</dt>
                    <dd>
                      {dateTime(schedule.lastGeneration.scheduledFor, zone)}
                    </dd>
                  </div>
                  <div>
                    <dt>Processed at</dt>
                    <dd>{dateTime(schedule.lastGeneration.createdAt, zone)}</dd>
                  </div>
                  <div>
                    <dt>Surveys created</dt>
                    <dd>{schedule.lastGeneration.createdAssignments}</dd>
                  </div>
                  <div>
                    <dt>Employees blocked</dt>
                    <dd>{schedule.lastGeneration.blockedEmployees}</dd>
                  </div>
                  <div>
                    <dt>Employees with limited colleagues</dt>
                    <dd>{schedule.lastGeneration.employeesWithLimitedPeers}</dd>
                  </div>
                </dl>
                <p className="setup-note">
                  Times shown in {zone}. These are survey counts, not employee
                  ratings.
                </p>
              </section>
            )}
          </div>
        </div>
        <section
          className="setup-panel"
          aria-labelledby="question-library-heading"
        >
          <h2 id="question-library-heading">Approved question library</h2>
          {onQuestionManagement && (
            <button className="text-button" onClick={onQuestionManagement}>
              Manage custom questions <Icon name="arrow" />
            </button>
          )}
          <p>
            {pool.filter((q) => q.dimension === "SKILL").length} skill questions
            · {pool.filter((q) => q.dimension === "CHEMISTRY_ENJOYMENT").length}{" "}
            enjoyment questions ·{" "}
            {
              pool.filter((q) => q.dimension === "CHEMISTRY_EFFECTIVENESS")
                .length
            }{" "}
            effectiveness questions ready.
          </p>
          <p className="setup-note">
            Adaptive surveys require at least three approved active skill
            questions and both chemistry dimensions. Skills must also be active.
            Questions allow 1–5 or “Not observed,” with no written answers.
          </p>
          {library && (
            <details className="standard-library">
              <summary>
                Review the standard questions ({library.questions.length})
              </summary>
              <p>{library.context}</p>
              <ul>
                {library.questions.map((q) => (
                  <li key={q.templateKey}>
                    <span>{q.skillName ?? category(q.dimension)}</span>
                    <p>{q.text}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {membership.role === "HR_ADMIN" ? (
            <>
              <p className="setup-note">
                Adding this library records your HR approval and adds any
                missing standard questions and skills. Existing questions and
                past surveys stay unchanged.
              </p>
              <button
                className="secondary-button"
                disabled={disabled}
                onClick={() =>
                  void perform(
                    "Adding approved questions",
                    () => importStandardQuestions(session.token, org),
                    (result) =>
                      `${result.createdQuestions} standard questions added with your HR approval. Existing standard questions were preserved.`,
                  )
                }
              >
                Approve and add standard questions
              </button>
            </>
          ) : (
            <p className="auth-message">
              {ready
                ? "The approved library is ready. HR administrators manage approval of additional questions."
                : "An HR administrator must approve and add standard questions. Invite HR through Company setup, then ask them to open this screen."}
            </p>
          )}
          {questions.length > 0 && (
            <details className="standard-library">
              <summary>
                View approved available questions ({pool.length})
              </summary>
              <ul>
                {pool.map((q) => (
                  <li key={q.id}>
                    <span>{category(q.dimension)}</span>
                    <p>{q.text}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </main>
    </div>
  );
}
