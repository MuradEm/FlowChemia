import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import ProfilePhoto from "./ProfilePhoto";
import { EmployeeCardContent } from "./EmployeeCard";
import type {
  EmployeeInsight,
  EmployeeProfile,
  Membership,
  Session,
} from "./api";
import brandIcon from "../design-kit/assets/flowchemia-icon-transparent.png";
export type WorkspaceView =
  | "home"
  | "setup"
  | "settings"
  | "teams"
  | "questions"
  | "people"
  | "profile"
  | "builder";
export default function WorkspaceShell({
  children,
  view,
  session,
  membership,
  displayName,
  profile,
  card,
  cardLoading,
  cardError,
  onLoadCard,
  onNavigate,
  onProfile,
  onExit,
  onSwitchCompany,
  canQuestions,
  canBuild,
  onSection,
}: {
  children: ReactNode;
  view: WorkspaceView;
  session: Session;
  membership: Membership;
  displayName: string;
  profile: EmployeeProfile | null;
  card: EmployeeInsight | null;
  cardLoading: boolean;
  cardError: string;
  onLoadCard: () => void;
  onNavigate: (view: WorkspaceView) => void;
  onProfile: () => void;
  onExit: () => void;
  onSwitchCompany: () => void;
  canQuestions: boolean;
  canBuild: boolean;
  onSection: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null),
    sidebar = useRef<HTMLElement>(null);
  const popup = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const scope = { token: session.token, org: membership.organization.id };
  const admin = membership.role !== "EMPLOYEE";
  const items: {
    view: WorkspaceView;
    label: string;
    icon: IconName;
    show?: boolean;
  }[] = [
    { view: "home", label: "My overview", icon: "home" },
    { view: "profile", label: "My profile", icon: "camera" },
    { view: "people", label: "People", icon: "people" },
    { view: "teams", label: "My teams", icon: "people" },
    { view: "builder", label: "Team builder", icon: "spark", show: canBuild },
    {
      view: "questions",
      label: "Question management",
      icon: "survey",
      show: canQuestions,
    },
    { view: "settings", label: "Survey settings", icon: "clock", show: admin },
    { view: "setup", label: "Company setup", icon: "building", show: admin },
  ];
  function close(restore = false) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const outside = (e: PointerEvent) => {
      if (
        !popup.current?.contains(e.target as Node) &&
        !trigger.current?.contains(e.target as Node)
      )
        close();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    popup.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  useEffect(() => {
    if (!mobileMenu) return;
    sidebar.current
      ?.querySelector<HTMLButtonElement>('.nav-item[aria-current="page"]')
      ?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenu(false);
        menuTrigger.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        !sidebar.current?.contains(event.target as Node) &&
        !menuTrigger.current?.contains(event.target as Node)
      )
        setMobileMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [mobileMenu]);
  useEffect(() => {
    setOpen(false);
    setMobileMenu(false);
  }, [view]);
  function navigate(v: WorkspaceView) {
    close();
    setMobileMenu(false);
    if (v === "profile") onProfile();
    else onNavigate(v);
  }
  return (
    <div
      className={`app-shell persistent-workspace ${mobileMenu ? "mobile-menu-open" : ""}`}
    >
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <aside ref={sidebar} className="sidebar" aria-label="Workspace sidebar">
        <button className="brand shell-brand" onClick={() => navigate("home")}>
          <img src={brandIcon} alt="" />
          <span>
            Flow<span>Chemia</span>
          </span>
        </button>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Icon name="building" />
          </span>
          <div>
            <strong>{membership.organization.name}</strong>
            <span>Your company</span>
          </div>
        </div>
        <p className="sidebar-caption">MY WORKSPACE</p>
        <nav aria-label="Main navigation">
          {items
            .filter((i) => i.show !== false)
            .map((i) => (
              <button
                key={i.view}
                className={`nav-item ${view === i.view ? "active" : ""}`}
                aria-current={view === i.view ? "page" : undefined}
                onClick={() => navigate(i.view)}
              >
                <Icon name={i.icon} />
                <span>{i.label}</span>
              </button>
            ))}
          <button
            className="nav-item"
            onClick={() => {
              setMobileMenu(false);
              onSection("surveys");
            }}
          >
            <Icon name="survey" />
            <span>My check-ins</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setMobileMenu(false);
              onSection("participation");
            }}
          >
            <Icon name="activity" />
            <span>My participation</span>
          </button>
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
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar workspace-topbar">
          <div className="shell-breadcrumb">
            <button
              ref={menuTrigger}
              className="icon-button mobile-menu-button"
              aria-label={mobileMenu ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu((v) => !v)}
            >
              <Icon name={mobileMenu ? "close" : "menu"} />
            </button>
            <div className="breadcrumb">
              My workspace <span>/</span>
              <strong>
                {items.find((i) => i.view === view)?.label ?? "Overview"}
              </strong>
            </div>
          </div>
          <div className="topbar-right">
            <button className="text-button" onClick={onSwitchCompany}>
              Switch company
            </button>
            <button className="text-button" onClick={onExit}>
              Sign out
            </button>
            <span className="topbar-divider" />
            <button
              ref={trigger}
              className="account-trigger"
              aria-label="Open your employee card"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="account-card-popup"
              onClick={() => {
                if (open) close();
                else {
                  setOpen(true);
                  onLoadCard();
                }
              }}
            >
              <ProfilePhoto
                name={displayName}
                membershipId={membership.id}
                version={profile?.photoUpdatedAt}
                scope={scope}
                className="topbar-profile-photo"
              />
              <span className="account-identity">
                <strong>{displayName}</strong>
                <small>
                  {membership.role === "HR_ADMIN"
                    ? "HR administrator"
                    : membership.role === "OWNER"
                      ? "Company owner"
                      : "Employee"}
                </small>
              </span>
              <Icon name="down" />
            </button>
          </div>
          {open && (
            <div
              id="account-card-popup"
              ref={popup}
              className="account-card-popup"
              role="dialog"
              aria-label="Your employee card"
              onBlur={(e) => {
                if (
                  e.relatedTarget &&
                  !e.currentTarget.contains(e.relatedTarget) &&
                  !trigger.current?.contains(e.relatedTarget)
                )
                  close();
              }}
            >
              <div className="account-popup-heading">
                <strong>Your card</strong>
                <button
                  className="icon-button"
                  aria-label="Close your card"
                  onClick={() => close(true)}
                >
                  <Icon name="close" />
                </button>
              </div>
              {cardLoading ? (
                <p role="status">Loading your card…</p>
              ) : cardError ? (
                <p className="auth-error" role="alert">
                  {cardError}
                </p>
              ) : card ? (
                <div className="account-mini-card">
                  <EmployeeCardContent employee={card} photoScope={scope} />
                </div>
              ) : (
                <p>Your card is unavailable.</p>
              )}
              <div className="account-popup-actions">
                <button
                  className="secondary-button"
                  onClick={() => navigate("profile")}
                >
                  My profile
                  <Icon name="arrow" />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => navigate("teams")}
                >
                  My teams
                  <Icon name="people" />
                </button>
              </div>
            </div>
          )}
        </header>
        <div id="workspace-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
