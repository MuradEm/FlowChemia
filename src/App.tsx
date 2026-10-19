import { useEffect, useRef, useState } from "react";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
import {
  colleagues,
  DEMO_STORAGE_KEY,
  finishAssignment,
  initialAssignments,
  readAssignments,
  replaceColleague,
} from "./demo";
import type { DemoAssignment } from "./demo";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import SurveyDialog from "./SurveyDialog";

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

export default function App() {
  const [assignments, setAssignments] = useState<DemoAssignment[]>(() => {
    try {
      return readAssignments(localStorage.getItem(DEMO_STORAGE_KEY));
    } catch {
      return initialAssignments();
    }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const [notice, setNotice] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const open = assignments.filter((a) => a.status === "OPEN");
  const completed = assignments.filter((a) => a.status === "COMPLETED");
  const skipped = assignments.filter((a) => a.status === "SKIPPED");
  const closed = assignments.filter((a) => a.status !== "OPEN");
  const active = assignments.find(
    (a) => a.id === activeId && a.status === "OPEN",
  );

  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(assignments));
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }, [assignments]);

  function finish(status: "COMPLETED" | "SKIPPED") {
    if (!active) return;
    setAssignments((current) => finishAssignment(current, active.id, status));
    setActiveId(null);
    setNotice(
      status === "COMPLETED"
        ? "Demo check-in completed. Thank you for trying it! No feedback was sent."
        : "Demo check-in skipped. No feedback was sent.",
    );
  }

  function replace() {
    if (!active) return;
    const updated = replaceColleague(assignments, active.id);
    const replacement = updated.find((a) => a.id === active.id)!;
    setAssignments(updated);
    setActiveId(null);
    setNotice(
      replacement.status === "OPEN"
        ? "Your demo check-in now has a different colleague. No participation credit has been earned yet."
        : "No other demo colleague is available. This check-in is closed without participation credit.",
    );
  }

  function resetDemo() {
    setActiveId(null);
    setAssignments(initialAssignments());
    setNotice("Demo reset. Your two sample check-ins are ready again.");
  }

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
            <strong>Northstar Automation</strong>
            <span>Demo workspace</span>
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
            <span className="demo-badge">
              <span /> Demo data
            </span>
            <span className="topbar-divider" />
            <div className="user-profile">
              <span className="avatar small user-avatar">EM</span>
              <div>
                <strong>Elias Murad</strong>
                <span>Employee · sample profile</span>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR PEOPLE. YOUR EXPERIENCE.</p>
              <h1>
                Welcome back, Elias<span>.</span>
              </h1>
              <p>Small check-ins. Stronger working relationships.</p>
            </div>
            <button className="text-button reset-button" onClick={resetDemo}>
              <Icon name="refresh" /> Reset demo
            </button>
          </div>
          <div className="demo-banner">
            <span>
              <strong>You’re exploring a demo.</strong> All people and projects
              shown here are sample data. Nothing is sent to your company.
            </span>
          </div>
          {storageUnavailable && (
            <p className="storage-warning" role="status">
              Browser storage is unavailable. Demo progress will reset when you
              reload.
            </p>
          )}
          <div
            className={`notice ${notice ? "visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            {notice && (
              <>
                <Icon name="check" />
                <span>{notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss message"
                  onClick={() => setNotice("")}
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
              {open.length > 0 ? (
                <button
                  className="primary-button"
                  onClick={() => setActiveId(open[0].id)}
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
                    <span className="count-pill">{open.length}</span>
                  </h2>
                  <p>
                    One colleague. Five quick questions. Your honest
                    perspective.
                  </p>
                </div>
                <span className="section-kicker">THIS DEMO</span>
              </div>
              <div className="survey-cards">
                {open.map((assignment) => {
                  const colleague = colleagues.find(
                    (c) => c.id === assignment.subjectId,
                  )!;
                  return (
                    <article className="survey-card" key={assignment.id}>
                      <div className="survey-card-top">
                        <span className="ready-label">
                          <span /> Ready when you are
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
                        <Icon name="people" /> PLC commissioning <span>·</span>{" "}
                        Sample project
                      </div>
                      <div className="survey-meta">
                        <span>
                          <Icon name="clock" /> About 2 minutes
                        </span>
                        <span>5 questions</span>
                      </div>
                      <button
                        className="card-button"
                        onClick={() => setActiveId(assignment.id)}
                      >
                        Share your experience <Icon name="arrow" />
                      </button>
                      <p className="card-footnote">
                        No expiry. Complete it when you’re ready.
                      </p>
                    </article>
                  );
                })}
              </div>
              {open.length === 0 && (
                <div className="empty-state">
                  <span className="round-icon teal">
                    <Icon name="check" />
                  </span>
                  <h3>A little feedback. All done.</h3>
                  <p>
                    You’ve resolved all the check-ins in this demo.
                    <br />
                    Reset the demo whenever you want to try again.
                  </p>
                  <button className="secondary-button" onClick={resetDemo}>
                    Try the demo again <Icon name="refresh" />
                  </button>
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
                  No written answers.
                  <br />
                  Just five thoughtful choices.
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
                  <h2 id="participation-title">Your participation</h2>
                  <p>A small contribution to a better team experience.</p>
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
                    {completed.length.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">
                    <span className="status-dot amber-dot" /> Skipped
                  </span>
                  <strong>{skipped.length.toString().padStart(2, "0")}</strong>
                </div>
                <div>
                  <span className="stat-label">
                    <span className="status-dot gray-dot" /> Still open
                  </span>
                  <strong>{open.length.toString().padStart(2, "0")}</strong>
                </div>
              </div>
              {closed.length > 0 ? (
                <ul className="participation-history">
                  {closed.map((a) => (
                    <li key={a.id}>
                      <span>
                        {colleagues.find((c) => c.id === a.subjectId)!.name}
                      </span>
                      <span className={`outcome ${a.status.toLowerCase()}`}>
                        {a.status === "COMPLETED"
                          ? "Completed · 100% credit"
                          : a.status === "SKIPPED"
                            ? "Skipped · 60% credit"
                            : "No replacement · no credit"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="participation-empty">
                  <Icon name="spark" />
                  <span>
                    Your first check-in starts here. Completed and skipped
                    check-ins will appear in this space.
                  </span>
                </div>
              )}
              <p className="participation-note">
                Demo progress stays in this browser. No real points or rewards
                are awarded.
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
              About this demo <Icon name="help" />
            </button>
          </footer>
        </main>
      </div>
      {active && (
        <SurveyDialog
          key={`${active.id}:${active.subjectId}`}
          assignment={active}
          onClose={() => setActiveId(null)}
          onFinish={finish}
          onReplace={replace}
        />
      )}
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
        <h2 id="help-title">A first look at your workspace</h2>
        <p>
          Try a five-question check-in, select “Not observed,” skip, or ask for
          another colleague. Your demo progress stays in this browser until you
          reset it.
        </p>
        <p>
          All people, teams, and assignments are examples. Ratings are discarded
          when you close or complete a survey. Nothing is submitted to the
          backend, and no real rewards or employee scores are calculated.
        </p>
        <p>
          In the application, company settings will determine survey timing and
          participation rewards. An unfinished survey blocks the next batch, so
          new requests won’t pile up.
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
