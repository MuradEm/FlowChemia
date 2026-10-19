import { useEffect, useRef, useState } from "react";
import TeamView from "./TeamView";
import SurveySettings from "./SurveySettings";
import CompanySetup from "./CompanySetup";
import EmployeeHome from "./EmployeeHome";
import SurveyDialog from "./SurveyDialog";
import {
  ApiError,
  errorMessage,
  getAssignment,
  getTeams,
  getOpenAssignments,
  getParticipation,
  replaceAssignment,
  skipAssignment,
  submitAssignment,
} from "./api";
import type {
  AssignmentSummary,
  Membership,
  Participation,
  Session,
} from "./api";
import { initials } from "./workspace";
import type { SurveyView } from "./workspace";

type Props = {
  session: Session;
  membership: Membership;
  displayName: string;
  onExpired: () => void;
  onExit: () => void;
  onSwitchCompany: () => void;
};
const category: Record<string, string> = {
  SKILL: "Skills",
  CHEMISTRY_ENJOYMENT: "Your experience",
  CHEMISTRY_EFFECTIVENESS: "Working together",
  UNSPECIFIED: "Your observations",
};

export default function LiveWorkspace({
  session,
  membership,
  displayName,
  onExpired,
  onExit,
  onSwitchCompany,
}: Props) {
  const [view, setView] = useState<"home" | "setup" | "settings" | "teams">(
    "home",
  );
  const [hasTeams, setHasTeams] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [participation, setParticipation] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [active, setActive] = useState<SurveyView | null>(null);
  const [opening, setOpening] = useState(false);
  const alive = useRef(false);
  const requestNumber = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const labels = useRef(new Map<string, string>());
  const org = membership.organization.id;

  async function refresh() {
    const number = ++requestNumber.current;
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setLoading(true);
    setError("");
    setAssignments([]);
    setParticipation([]);
    setHasTeams(false);
    try {
      const [open, history, teams] = await Promise.all([
        getOpenAssignments(session.token, org, controller.signal),
        getParticipation(session.token, org, controller.signal),
        getTeams(session.token, org, controller.signal),
      ]);
      if (
        !Array.isArray(open) ||
        !Array.isArray(history) ||
        !Array.isArray(teams)
      )
        throw new ApiError(
          502,
          "The API returned an unexpected workspace response.",
        );
      if (
        !alive.current ||
        controller.signal.aborted ||
        number !== requestNumber.current
      )
        return;
      open.forEach((a) => labels.current.set(a.id, a.subject.displayName));
      setHasTeams(teams.length > 0);
      setAssignments(open);
      setParticipation(history);
    } catch (failure) {
      if (
        !alive.current ||
        controller.signal.aborted ||
        number !== requestNumber.current
      )
        return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(errorMessage(failure));
    } finally {
      if (
        alive.current &&
        !controller.signal.aborted &&
        number === requestNumber.current
      )
        setLoading(false);
    }
  }

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      listController.current?.abort();
      detailController.current?.abort();
    };
    // This component is keyed by session and company in AccountWorkspace.
  }, []);

  async function openAssignment(id: string) {
    if (detailController.current && !detailController.current.signal.aborted)
      return;
    const controller = new AbortController();
    detailController.current = controller;
    setOpening(true);
    setError("");
    setNotice("");
    setNoticeError(false);
    try {
      const detail = await getAssignment(
        session.token,
        org,
        id,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      if (
        detail.id !== id ||
        !Array.isArray(detail.questions) ||
        !detail.questions.length ||
        detail.questions.length > 20 ||
        new Set(detail.questions.map((q) => q.id)).size !==
          detail.questions.length ||
        detail.questions.some((q) => q.scaleMin !== 1 || q.scaleMax !== 5)
      )
        throw new ApiError(
          502,
          "This survey format could not be loaded. Please refresh your check-ins.",
        );
      const now = Date.now();
      const actionable =
        detail.status === "OPEN" &&
        Date.parse(detail.opensAt) <= now &&
        (!detail.closesAt || Date.parse(detail.closesAt) > now);
      labels.current.set(id, detail.subject.displayName);
      setActive({
        id,
        subjectName: detail.subject.displayName,
        subtitle: detail.team.name,
        initials: initials(detail.subject.displayName),
        color: "teal",
        questions: detail.questions.map((q) => ({
          id: q.id,
          text: q.text,
          category: category[q.dimension] ?? "Your observations",
        })),
        requiresReplacement: detail.requiresReplacement,
        closesAt: detail.closesAt,
        actionable,
      });
    } catch (failure) {
      if (!alive.current || controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else {
        setNoticeError(true);
        setNotice(errorMessage(failure));
        if (failure instanceof ApiError && [404, 409].includes(failure.status))
          void refresh();
      }
    } finally {
      controller.abort();
      if (alive.current) setOpening(false);
    }
  }

  async function perform<T>(
    action: () => Promise<T>,
    message: (result: T) => string,
  ) {
    try {
      const result = await action();
      if (!alive.current) return;
      setActive(null);
      setNoticeError(false);
      setNotice(message(result));
      void refresh();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        onExpired();
        return;
      }
      throw failure;
    }
  }
  function refreshFromDialog() {
    setActive(null);
    void refresh();
  }

  if (view === "teams")
    return (
      <TeamView
        session={session}
        membership={membership}
        onExpired={onExpired}
        onExit={onExit}
        onSwitchCompany={onSwitchCompany}
        onBack={() => {
          setView("home");
          void refresh();
        }}
        onCompanySetup={
          membership.role !== "EMPLOYEE" ? () => setView("setup") : undefined
        }
      />
    );
  if (view === "settings" && membership.role !== "EMPLOYEE")
    return (
      <SurveySettings
        session={session}
        membership={membership}
        onExpired={onExpired}
        onExit={onExit}
        onBack={() => {
          setView("home");
          void refresh();
        }}
        onSwitchCompany={onSwitchCompany}
        onCompanySetup={() => setView("setup")}
      />
    );
  if (view === "setup" && membership.role !== "EMPLOYEE")
    return (
      <CompanySetup
        session={session}
        membership={membership}
        onExpired={onExpired}
        onExit={onExit}
        onBack={() => {
          setView("home");
          void refresh();
        }}
        onSwitchCompany={onSwitchCompany}
        onSurveySettings={() => setView("settings")}
      />
    );

  return (
    <>
      <EmployeeHome
        mode="live"
        onTeams={hasTeams ? () => setView("teams") : undefined}
        displayName={displayName}
        companyName={membership.organization.name}
        roleLabel={
          membership.role === "HR_ADMIN"
            ? "HR administrator"
            : membership.role === "OWNER"
              ? "Company owner"
              : "Employee"
        }
        loading={loading}
        error={error}
        notice={notice}
        noticeTone={noticeError ? "error" : "success"}
        onDismissNotice={() => setNotice("")}
        onOpen={(id) => void openAssignment(id)}
        onRefresh={() => {
          setActive(null);
          void refresh();
        }}
        onSurveySettings={
          membership.role !== "EMPLOYEE" ? () => setView("settings") : undefined
        }
        onCompanySetup={
          membership.role !== "EMPLOYEE" ? () => setView("setup") : undefined
        }
        onExit={onExit}
        onSwitchCompany={onSwitchCompany}
        assignments={assignments.map((a) => ({
          id: a.id,
          colleague: {
            name: a.subject.displayName,
            role:
              a.type === "MILESTONE"
                ? "Project milestone"
                : "Colleague check-in",
            initials: initials(a.subject.displayName),
            color: "teal",
          },
          teamName: a.teamName,
          closesAt: a.closesAt,
          requiresReplacement: a.requiresReplacement,
        }))}
        history={participation.map((p) => ({
          id: p.id,
          label: labels.current.get(p.assignmentId) ?? "Check-in",
          outcome: p.outcome,
          percentage: p.percentage,
          createdAt: p.createdAt,
        }))}
      />
      {opening && (
        <div className="opening-notice" role="status">
          Loading your check-in…
        </div>
      )}
      {active && (
        <SurveyDialog
          key={active.id}
          mode="live"
          survey={active}
          onClose={() => setActive(null)}
          onRefresh={refreshFromDialog}
          onSubmit={(answers) =>
            perform(
              () => submitAssignment(session.token, org, active.id, answers),
              (result) =>
                `Your check-in is complete. ${result.participationPercentage}% participation credit was recorded.`,
            )
          }
          onSkip={() =>
            perform(
              () => skipAssignment(session.token, org, active.id),
              (result) =>
                `Your check-in was skipped. ${result.participationPercentage}% participation credit was recorded.`,
            )
          }
          onReplace={() =>
            perform(
              () => replaceAssignment(session.token, org, active.id),
              (result) =>
                result.outcome === "REPLACED"
                  ? "Your check-in now has another colleague. No participation credit has been earned yet."
                  : "No eligible colleague is available. This check-in is closed; participation credit has not been awarded.",
            )
          }
        />
      )}
    </>
  );
}
