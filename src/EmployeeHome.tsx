import { useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { initials, formatDate } from "./workspace";
import type { HomeAssignment, HistoryRecord } from "./workspace";

type Props = {
  mode: "demo" | "live";
  displayName: string;
  companyName: string;
  roleLabel: string;
  assignments: HomeAssignment[];
  history: HistoryRecord[];
  loading?: boolean;
  error?: string;
  notice: string;
  noticeTone?: "success" | "error";
  storageUnavailable?: boolean;
  onOpen: (id: string) => void;
  onDismissNotice: () => void;
  onReset?: () => void;
  onRefresh?: () => void;
  onSwitchCompany?: () => void;
  onCompanySetup?: () => void;
  onSurveySettings?: () => void;
  onTeams?: () => void;
  onQuestions?: () => void;
  onExit: () => void;
};

const navigation: { id: string; name: string; icon: IconName }[] = [
  { id: "home", name: "My overview", icon: "home" },
  { id: "surveys", name: "My check-ins", icon: "survey" },
  { id: "participation", name: "My participation", icon: "activity" },
];

function TeamIllustration() {
  return (
    <svg
      className="team-illustration"
      viewBox="0 0 340 210"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="173" cy="106" r="89" stroke="#c9e4de" strokeDasharray="4 7" />
      <path
        d="m85 120 85-64 85 64-85 44zM85 120h170M170 56v108"
        stroke="#a5ccc3"
        strokeWidth="2"
      />
      <circle cx="170" cy="56" r="28" fill="#fff" />
      <circle cx="85" cy="120" r="24" fill="#fff" />
      <circle cx="255" cy="120" r="24" fill="#fff" />
      <circle cx="170" cy="164" r="24" fill="#fff" />
      <circle cx="170" cy="51" r="8" fill="#0F4C5C" />
      <path d="M156 70a14 14 0 0 1 28 0" fill="#0F4C5C" />
      <circle cx="85" cy="115" r="7" fill="#4a9994" />
      <path d="M73 132a12 12 0 0 1 24 0" fill="#4a9994" />
      <circle cx="255" cy="115" r="7" fill="#d49a35" />
      <path d="M243 132a12 12 0 0 1 24 0" fill="#d49a35" />
      <circle cx="170" cy="159" r="7" fill="#5c82a0" />
      <path d="M158 176a12 12 0 0 1 24 0" fill="#5c82a0" />
      <rect x="136" y="97" width="68" height="32" rx="16" fill="#0F4C5C" />
      <path
        d="m159 113 7 6 15-14"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m281 53 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#e0b35a" />
      <circle cx="51" cy="66" r="4" fill="#90c5b7" />
    </svg>
  );
}

export default function EmployeeHome(props: Props) {
  const {
    mode,
    displayName,
    companyName,
    roleLabel,
    assignments: open,
    history: closed,
    loading = false,
    error,
    notice,
    noticeTone = "success",
    storageUnavailable,
    onOpen,
    onDismissNotice,
    onReset,
    onRefresh,
    onSwitchCompany,
    onCompanySetup,
    onSurveySettings,
    onTeams,
    onQuestions,
    onExit,
  } = props;
  const demo = mode === "demo";
  const [activeSection, setActiveSection] = useState("home");
  const helpDialog = useRef<HTMLDialogElement>(null);
  const completed = closed.filter((a) => a.outcome === "COMPLETED");
  const skipped = closed.filter((a) => a.outcome === "SKIPPED");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace sidebar">
        <a
          className="brand"
          href="#home"
          aria-label="FlowChemia home"
          onClick={() => setActiveSection("home")}
        >
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Icon name="building" />
          </span>
          <div>
            <strong>{companyName}</strong>
            <span>{demo ? "Demo workspace" : "Your company"}</span>
          </div>
        </div>
        <p className="sidebar-caption">MY WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a
              key={item.id}
              className={`nav-item ${activeSection === item.id ? "active" : ""}`}
              aria-current={activeSection === item.id ? "location" : undefined}
              href={`#${item.id}`}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.name}</span>
              {item.id === "surveys" && open.length > 0 && (
                <span className="nav-count">{open.length}</span>
              )}
            </a>
          ))}
          {onCompanySetup && (
            <button className="nav-item" onClick={onCompanySetup}>
              <Icon name="building" />
              <span>Company setup</span>
            </button>
          )}
          {onSurveySettings && (
            <button className="nav-item" onClick={onSurveySettings}>
              <Icon name="survey" />
              <span>Survey settings</span>
            </button>
          )}
          {onTeams && (
            <button className="nav-item" onClick={onTeams}>
              <Icon name="people" />
              <span>My teams</span>
            </button>
          )}
          {onQuestions && (
            <button className="nav-item" onClick={onQuestions}>
              <Icon name="survey" />
              <span>Question management</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="leaf" />
            <p>
              Better teams start with
              <br />
              <strong>understanding each other.</strong>
            </p>
          </div>
          <button
            className="help-button"
            onClick={() => helpDialog.current?.showModal()}
          >
            <Icon name="help" /> How FlowChemia works <Icon name="chevron" />
          </button>
        </div>
      </aside>

      <div className="workspace-main" id="home">
        <header className="topbar">
          <div className="breadcrumb">
            My workspace <span>/</span> <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            {demo ? (
              <span className="demo-badge">
                <span /> Demo data
              </span>
            ) : (
              <span className="live-badge">
                <Icon name="shield" /> Signed in
              </span>
            )}
            {onSwitchCompany && (
              <button className="text-button" onClick={onSwitchCompany}>
                Switch company
              </button>
            )}
            <button className="text-button" onClick={onExit}>
              {demo ? "Back to login" : "Sign out"}
            </button>
            <span className="topbar-divider" />
            <div className="user-profile">
              <span className="avatar small user-avatar">
                {initials(displayName)}
              </span>
              <div>
                <strong>{displayName}</strong>
                <span>{demo ? "Employee · sample profile" : roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR PEOPLE. YOUR EXPERIENCE.</p>
              <h1>
                Welcome back, {displayName.trim().split(/\s+/)[0]}
                <span>.</span>
              </h1>
              <p>Small check-ins. Stronger working relationships.</p>
            </div>
            {onReset && (
              <button className="text-button reset-button" onClick={onReset}>
                <Icon name="refresh" /> Reset demo
              </button>
            )}
            {onRefresh && (
              <button
                className="text-button reset-button"
                disabled={loading}
                onClick={onRefresh}
              >
                <Icon name="refresh" /> Refresh
              </button>
            )}
          </div>
          {demo && (
            <div className="demo-banner">
              <span>
                <strong>You’re exploring a demo.</strong> All people and
                projects shown here are sample data. Nothing is sent to your
                company.
              </span>
            </div>
          )}
          {error && (
            <div className="workspace-error" role="alert">
              <strong>We couldn’t load your latest check-ins.</strong>
              <p>{error}</p>
              <button className="secondary-button" onClick={onRefresh}>
                Try again
              </button>
            </div>
          )}
          {storageUnavailable && (
            <p className="storage-warning" role="status">
              Browser storage is unavailable. Demo progress will reset when you
              reload.
            </p>
          )}
          <div
            className={`notice ${notice ? "visible" : ""} ${noticeTone === "error" ? "notice-error" : ""}`}
            role={noticeTone === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {notice && (
              <>
                <Icon name={noticeTone === "error" ? "help" : "check"} />
                <span>{notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss message"
                  onClick={onDismissNotice}
                >
                  <Icon name="close" />
                </button>
              </>
            )}
          </div>

          <section className="welcome-banner" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <span className="subtle-pill">
                <Icon name="spark" /> A little feedback goes a long way
              </span>
              <h2 id="welcome-title">
                Help shape a team
                <br />
                you love working with.
              </h2>
              <p>
                Your experience matters. Share a few honest observations
                <br className="desktop-break" /> about the people you work
                alongside.
              </p>
              {loading ? (
                <span className="loading-copy" role="status">
                  Loading your check-ins…
                </span>
              ) : error ? (
                <span className="loading-copy">
                  Refresh to see your current check-ins.
                </span>
              ) : open.length > 0 ? (
                <button
                  className="primary-button"
                  onClick={() => onOpen(open[0].id)}
                >
                  Start a check-in <Icon name="arrow" />
                </button>
              ) : (
                <span className="caught-up-pill">
                  <Icon name="check" /> You’re all caught up
                </span>
              )}
            </div>
            <TeamIllustration />
          </section>

          <div className="dashboard-grid">
            <section
              className="check-ins-section"
              id="surveys"
              aria-labelledby="check-ins-title"
            >
              <div className="section-heading">
                <div>
                  <h2 id="check-ins-title">
                    Your next check-ins{" "}
                    <span className="count-pill">
                      {loading || error ? "—" : open.length}
                    </span>
                  </h2>
                  <p>
                    One colleague. A short check-in. Your honest perspective.
                  </p>
                </div>
                <span className="section-kicker">
                  {demo ? "THIS DEMO" : "OPEN CHECK-INS"}
                </span>
              </div>
              <div className="survey-cards">
                {!loading &&
                  !error &&
                  open.map((assignment) => {
                    const colleague = assignment.colleague;
                    return (
                      <article className="survey-card" key={assignment.id}>
                        <div className="survey-card-top">
                          <span className="ready-label">
                            <span />{" "}
                            {assignment.requiresReplacement
                              ? "Choose another colleague"
                              : "Ready when you are"}
                          </span>
                          <span className="small-icon">
                            <Icon name="survey" />
                          </span>
                        </div>
                        <div className="colleague-heading">
                          <span
                            className={`avatar colleague-avatar ${colleague.color}`}
                          >
                            {colleague.initials}
                          </span>
                          <div>
                            <h3>{colleague.name}</h3>
                            <p>{colleague.role}</p>
                          </div>
                        </div>
                        <div className="team-label">
                          <Icon name="people" /> {assignment.teamName}
                          {demo && (
                            <>
                              <span>·</span> Sample project
                            </>
                          )}
                        </div>
                        <div className="survey-meta">
                          <span>
                            <Icon name="clock" /> About 2 minutes
                          </span>
                          <span>
                            {assignment.questionCount
                              ? `${assignment.questionCount} questions`
                              : "Colleague feedback"}
                          </span>
                        </div>
                        <button
                          className="card-button"
                          onClick={() => onOpen(assignment.id)}
                        >
                          {assignment.requiresReplacement
                            ? "Choose another colleague"
                            : "Share your experience"}{" "}
                          <Icon name="arrow" />
                        </button>
                        <p className="card-footnote">
                          {assignment.closesAt
                            ? `Available until ${formatDate(assignment.closesAt)}`
                            : "No expiry. Complete it when you’re ready."}
                        </p>
                      </article>
                    );
                  })}
              </div>
              {loading && (
                <div className="empty-state" role="status">
                  Loading your check-ins…
                </div>
              )}
              {!loading && !error && open.length === 0 && (
                <div className="empty-state">
                  <span className="round-icon teal">
                    <Icon name="check" />
                  </span>
                  <h3>A little feedback. All done.</h3>
                  <p>
                    {demo
                      ? "You’ve resolved all the check-ins in this demo."
                      : "There are no check-ins waiting for you right now."}
                    <br />
                    {demo
                      ? "Reset the demo whenever you want to try again."
                      : "New check-ins will appear here when your company issues them."}
                  </p>
                  {onReset && (
                    <button className="secondary-button" onClick={onReset}>
                      Try the demo again <Icon name="refresh" />
                    </button>
                  )}
                </div>
              )}
            </section>

            <aside className="guidance-card" aria-labelledby="guidance-title">
              <span className="guidance-eyebrow">
                <Icon name="leaf" /> A MOMENT TO REFLECT
              </span>
              <h2 id="guidance-title">
                Your perspective
                <br /> makes a difference.
              </h2>
              <p>Good feedback starts with the work you’ve actually shared.</p>
              <ul>
                <li>
                  <span className="tip-number">01</span>
                  <div>
                    <strong>Think about recent work</strong>
                    <span>
                      Focus on what you observed, rather than a first
                      impression.
                    </span>
                  </div>
                </li>
                <li>
                  <span className="tip-number">02</span>
                  <div>
                    <strong>It’s okay not to know</strong>
                    <span>
                      Choose “Not observed” whenever you don’t have enough
                      experience.
                    </span>
                  </div>
                </li>
                <li>
                  <span className="tip-number">03</span>
                  <div>
                    <strong>Keep it honest</strong>
                    <span>
                      Different experiences help us understand how teams work
                      together.
                    </span>
                  </div>
                </li>
              </ul>
              <div className="guidance-bottom">
                <Icon name="shield" />
                <span>
                  No written answers. <br />
                  {demo
                    ? "Just five thoughtful choices."
                    : "Just a few thoughtful choices."}
                </span>
              </div>
            </aside>

            <section
              className="participation-card"
              id="participation"
              aria-labelledby="participation-title"
            >
              <div className="section-heading">
                <div>
                  <h2 id="participation-title">
                    {demo ? "Your participation" : "Recent participation"}
                  </h2>
                  <p>
                    {demo
                      ? "A small contribution to a better team experience."
                      : "Recent completions and skips, plus your currently open check-ins."}
                  </p>
                </div>
                <span className="participation-symbol">
                  <Icon name="activity" />
                </span>
              </div>
              <div className="participation-stats">
                <div>
                  <span className="stat-label">
                    <span className="status-dot teal-dot" /> Completed
                  </span>
                  <strong>
                    {loading || error
                      ? "—"
                      : completed.length.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">
                    <span className="status-dot amber-dot" /> Skipped
                  </span>
                  <strong>
                    {loading || error
                      ? "—"
                      : skipped.length.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">
                    <span className="status-dot gray-dot" /> Still open
                  </span>
                  <strong>
                    {loading || error
                      ? "—"
                      : open.length.toString().padStart(2, "0")}
                  </strong>
                </div>
              </div>
              {!loading && !error && closed.length > 0 ? (
                <ul className="participation-history">
                  {closed.map((a) => (
                    <li key={a.id}>
                      <span>
                        {a.label}
                        {a.createdAt && (
                          <small className="history-date">
                            {formatDate(a.createdAt)}
                          </small>
                        )}
                      </span>
                      <span className={`outcome ${a.outcome.toLowerCase()}`}>
                        {a.outcome === "COMPLETED"
                          ? `Completed · ${a.percentage}% credit`
                          : a.outcome === "SKIPPED"
                            ? `Skipped · ${a.percentage}% credit`
                            : "No replacement · credit not awarded"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="participation-empty">
                  <Icon name="spark" />
                  <span>
                    {loading
                      ? "Loading your participation history…"
                      : error
                        ? "Refresh to see your latest participation."
                        : "Completed and skipped check-ins will appear in this space."}
                  </span>
                </div>
              )}
              <p className="participation-note">
                {demo
                  ? "Demo progress stays in this browser. No real points or rewards are awarded."
                  : "Participation credit is recorded by your company. Reward values are company-defined."}
              </p>
            </section>
          </div>
          <footer className="page-footer">
            <span>
              FlowChemia <span>·</span> The chemistry of how teams work
              together.
            </span>
            <button
              className="text-button"
              onClick={() => helpDialog.current?.showModal()}
            >
              {demo ? "About this demo" : "About your check-ins"}{" "}
              <Icon name="help" />
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={helpDialog}
        className="help-dialog"
        aria-labelledby="help-title"
      >
        <div className="dialog-topline">
          <span className="eyebrow">FLOWCHEMIA</span>
          <button
            className="icon-button"
            aria-label="Close help"
            onClick={() => helpDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="help-title">
          {demo ? "A first look at your workspace" : "Your experience matters"}
        </h2>
        {demo ? (
          <>
            <p>
              Try a five-question check-in, select “Not observed,” skip, or ask
              for another colleague. Only demo progress stays in this browser.
              Ratings are discarded and nothing is submitted to the backend.
            </p>
            <p>All people, teams, and assignments in demo mode are examples.</p>
          </>
        ) : (
          <>
            <p>
              Choose what reflects your recent experience. “Not observed” is a
              valid response whenever you haven’t seen enough to answer.
            </p>
            <p>
              Submitting saves your answers to your company’s backend. Completed
              surveys earn 100% participation credit; voluntary skips earn 60%.
              Asking for another colleague does not award credit on its own.
            </p>
          </>
        )}
        <p>
          Your company controls survey timing. Periodic check-ins have no
          expiry; an unfinished check-in blocks the next batch. Milestone
          check-ins have the deadline shown on their card.
        </p>
        <button
          className="primary-button"
          onClick={() => helpDialog.current?.close()}
        >
          Got it <Icon name="check" />
        </button>
      </dialog>
    </div>
  );
}
