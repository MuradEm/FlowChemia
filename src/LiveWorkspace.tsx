import { useEffect, useRef, useState } from "react";
import QuestionManagement from "./QuestionManagement";
import EmployeeProfilePage from "./EmployeeProfilePage";
import PeoplePage from "./PeoplePage";
import TeamView from "./TeamView";
import SurveySettings from "./SurveySettings";
import CompanySetup from "./CompanySetup";
import EmployeeHome from "./EmployeeHome";
import SurveyDialog from "./SurveyDialog";
import {
  ApiError,
  errorMessage,
  getAssignment,
  getEmployeeProfile,
  getTeams,
  getOrganization,
  getQuestionCapabilities,
  getOpenAssignments,
  getParticipation,
  replaceAssignment,
  skipAssignment,
  submitAssignment,
} from "./api";
import type {
  AssignmentSummary,
  EmployeeProfile,
  Membership,
  QuestionCapabilities,
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
  const [view, setView] = useState<
    "home" | "setup" | "settings" | "teams" | "questions" | "people" | "profile"
  >("home");
  const [questionCapabilities, setQuestionCapabilities] =
    useState<QuestionCapabilities | null>(null);
  const [ownProfile, setOwnProfile] = useState<EmployeeProfile | null>(null);
  const [profileId, setProfileId] = useState(membership.id);
  const teamReturn = useRef<{ id: string; focus?: string } | undefined>(
    undefined,
  );
  const profileBack = useRef<"home" | "teams" | "people">("home");
  function openProfile(id: string, back: "home" | "teams" | "people") {
    setProfileId(id);
    profileBack.current = back;
    setView("profile");
  }
  const [companyTestMode, setCompanyTestMode] = useState(false);
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
    setCompanyTestMode(false);
    setQuestionCapabilities(null);
    try {
      const [open, history, teams, capabilities, company, profile] =
        await Promise.all([
          getOpenAssignments(session.token, org, controller.signal),
          getParticipation(session.token, org, controller.signal),
          getTeams(session.token, org, controller.signal),
          getQuestionCapabilities(session.token, org, controller.signal),
          getOrganization(session.token, org, controller.signal),
          getEmployeeProfile(
            session.token,
            org,
            membership.id,
            controller.signal,
          ),
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
      setCompanyTestMode(company.testMode);
      setOwnProfile(profile);
      setQuestionCapabilities(capabilities);
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
        isTest: detail.isTest,
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

  if (view === "profile")
    return (
      <EmployeeProfilePage
        key={profileId}
        session={session}
        membership={membership}
        employeeId={profileId}
        onExpired={onExpired}
        onExit={onExit}
        onBack={() => {
          setView(profileBack.current);
          void refresh();
        }}
      />
    );
  if (view === "people")
    return (
      <PeoplePage
        session={session}
        membership={membership}
        onBack={() => setView("home")}
        onOpen={(id) => openProfile(id, "people")}
        onExpired={onExpired}
        onExit={onExit}
      />
    );
  if (view === "questions")
    return (
      <QuestionManagement
        session={session}
        membership={membership}
        onExpired={onExpired}
        onExit={onExit}
        onSwitchCompany={onSwitchCompany}
        onBack={() => {
          setView("home");
          void refresh();
        }}
      />
    );
  if (view === "teams")
    return (
      <TeamView
        initialTeam={teamReturn.current}
        onProfile={(id, teamId) => {
          teamReturn.current = { id: teamId, focus: id };
          openProfile(id, "teams");
        }}
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
        onQuestionManagement={
          questionCapabilities?.canPropose || questionCapabilities?.canReview
            ? () => setView("questions")
            : undefined
        }
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
        onProfile={() => openProfile(membership.id, "home")}
        onPeople={() => setView("people")}
        profilePhoto={{
          scope: { token: session.token, org },
          membershipId: membership.id,
          version: ownProfile?.photoUpdatedAt,
        }}
        testMode={companyTestMode}
        onQuestions={
          questionCapabilities?.canPropose || questionCapabilities?.canReview
            ? () => setView("questions")
            : undefined
        }
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
            role: a.isTest
              ? "Test colleague check-in"
              : a.type === "MILESTONE"
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
          label: `${p.isTest ? "Test · " : ""}${labels.current.get(p.assignmentId) ?? "Check-in"}`,
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
