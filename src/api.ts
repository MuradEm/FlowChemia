import type { RatingAnswer } from "./workspace";

export type Membership = {
  id: string;
  role: "OWNER" | "HR_ADMIN" | "EMPLOYEE";
  organization: { id: string; name: string };
};
export type Profile = {
  user: { id: string; displayName: string; email: string };
  memberships: Membership[];
};
export type Session = {
  token: string;
  expiresAt: string;
  user: { id: string; displayName: string };
};
export type AssignmentSummary = {
  isTest?: boolean;
  id: string;
  teamId: string;
  teamName: string;
  type: string;
  subject: { membershipId: string; displayName: string };
  requiresReplacement: boolean;
  closesAt: string | null;
};
export type AssignmentDetail = {
  isTest?: boolean;
  id: string;
  team: { id: string; name: string };
  type: string;
  subject: { membershipId: string; displayName: string };
  requiresReplacement: boolean;
  status: string;
  opensAt: string;
  closesAt: string | null;
  surveyFormat: { questionCount: number; targetDurationSeconds: number };
  questions: {
    id: string;
    text: string;
    dimension: string;
    scaleMin: number;
    scaleMax: number;
  }[];
};
export type Participation = {
  isTest?: boolean;
  id: string;
  assignmentId: string;
  outcome: "COMPLETED" | "SKIPPED";
  percentage: number;
  createdAt: string;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};
export async function apiRequest<T>(
  path: string,
  options: Options = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Invalid API path");
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: options.signal
        ? AbortSignal.any([
            options.signal,
            AbortSignal.timeout(options.timeoutMs ?? 15000),
          ])
        : AbortSignal.timeout(options.timeoutMs ?? 15000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "We couldn’t reach the backend. Check that the API is running and try again.",
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400:
        path === "/auth/login"
          ? "Enter a valid email and password."
          : "The request could not be accepted. Check the details and try again.",
      401:
        path === "/auth/login"
          ? "The email or password is incorrect."
          : "Your session has expired. Please sign in again.",
      403: "You don’t have access to this action.",
      404: "This item is no longer available to you.",
      409: path.includes("/assignments/")
        ? "This check-in has changed or is already closed. Refresh your check-ins before continuing."
        : "This record already exists or has changed. Refresh before continuing.",
      413: "This photo is too large. Choose a smaller image.",
      429: "Too many attempts. Please wait a minute and try again.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ??
        "The backend is temporarily unavailable. Please try again shortly.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(
      502,
      "The API returned an unexpected response. Check your backend connection.",
    );
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      502,
      "The API returned an unexpected response. Please try again.",
    );
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const session = await apiRequest<Session>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(session?.token) ||
    !Number.isFinite(Date.parse(session.expiresAt)) ||
    !session.user?.id ||
    !session.user.displayName
  )
    throw new ApiError(
      502,
      "The sign-in response was incomplete. Please try again.",
    );
  return session;
}
const orgPath = (org: string) => `/organizations/${encodeURIComponent(org)}`;
const assignmentPath = (org: string, id: string) =>
  `${orgPath(org)}/assignments/${encodeURIComponent(id)}`;
export const getProfile = (token: string, signal?: AbortSignal) =>
  apiRequest<Profile>("/me", { token, signal });
export const getOpenAssignments = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<AssignmentSummary[]>(`${orgPath(org)}/assignments/my-open`, {
    token,
    signal,
  });
export const getParticipation = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<Participation[]>(`${orgPath(org)}/participation/my`, {
    token,
    signal,
  });
export const getAssignment = (
  token: string,
  org: string,
  id: string,
  signal?: AbortSignal,
) => apiRequest<AssignmentDetail>(assignmentPath(org, id), { token, signal });
export const submitAssignment = (
  token: string,
  org: string,
  id: string,
  answers: RatingAnswer[],
) =>
  apiRequest<{ ok: boolean; participationPercentage: number }>(
    `${assignmentPath(org, id)}/submit`,
    { token, method: "POST", body: { answers } },
  );
export const skipAssignment = (token: string, org: string, id: string) =>
  apiRequest<{ ok: boolean; participationPercentage: number }>(
    `${assignmentPath(org, id)}/skip`,
    { token, method: "POST", body: {} },
  );
export const replaceAssignment = (token: string, org: string, id: string) =>
  apiRequest<{
    outcome: "REPLACED" | "NO_REPLACEMENT";
    replacementAssignmentId: string | null;
    participationPercentage: null;
  }>(`${assignmentPath(org, id)}/replace`, { token, method: "POST", body: {} });
export const logout = (token: string) =>
  apiRequest<{ ok: boolean }>("/auth/logout", { token, method: "POST" });

export type CompanyMember = {
  id: string;
  role: Membership["role"];
  active: boolean;
  user: { id: string; displayName: string; email: string };
};
export type TeamSummary = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
};
export type TeamRole = "MANAGER" | "TEAM_LEADER";
export type TeamDetail = TeamSummary & {
  members: {
    id: string;
    membershipId: string;
    displayName: string;
    joinedAt: string;
  }[];
  access: { membershipId: string; role: TeamRole }[];
};
export type InvitationDelivery = {
  invitation: {
    id: string;
    email: string;
    role: "EMPLOYEE" | "HR_ADMIN";
    expiresAt: string;
  };
  token: string;
};
const teamPath = (org: string, team: string) =>
  `${orgPath(org)}/teams/${encodeURIComponent(team)}`;
export const getCompanyMembers = (
  token: string,
  org: string,
  signal?: AbortSignal,
) => apiRequest<CompanyMember[]>(`${orgPath(org)}/members`, { token, signal });
export const getTeams = (token: string, org: string, signal?: AbortSignal) =>
  apiRequest<TeamSummary[]>(`${orgPath(org)}/teams`, { token, signal });
export const getTeam = (
  token: string,
  org: string,
  team: string,
  signal?: AbortSignal,
) => apiRequest<TeamDetail>(teamPath(org, team), { token, signal });
export const inviteColleague = (
  token: string,
  org: string,
  email: string,
  role: "EMPLOYEE" | "HR_ADMIN",
) =>
  apiRequest<InvitationDelivery>(`${orgPath(org)}/invitations`, {
    token,
    method: "POST",
    body: { email: email.trim().toLowerCase(), role },
  });
export const createTeam = (
  token: string,
  org: string,
  details: { name: string; startsAt?: string; endsAt?: string },
) =>
  apiRequest<TeamSummary>(`${orgPath(org)}/teams`, {
    token,
    method: "POST",
    body: details,
  });
export const addTeamMember = (
  token: string,
  org: string,
  team: string,
  membershipId: string,
) =>
  apiRequest(teamPath(org, team) + "/members", {
    token,
    method: "POST",
    body: { membershipId },
  });
export const removeTeamMember = (
  token: string,
  org: string,
  team: string,
  membershipId: string,
) =>
  apiRequest(
    teamPath(org, team) + `/members/${encodeURIComponent(membershipId)}`,
    { token, method: "DELETE" },
  );
export const grantTeamRole = (
  token: string,
  org: string,
  team: string,
  membershipId: string,
  role: TeamRole,
) =>
  apiRequest(teamPath(org, team) + "/access", {
    token,
    method: "POST",
    body: { membershipId, role },
  });
export const revokeTeamRole = (
  token: string,
  org: string,
  team: string,
  membershipId: string,
) =>
  apiRequest(
    teamPath(org, team) + `/access/${encodeURIComponent(membershipId)}`,
    { token, method: "DELETE" },
  );
export const acceptInvitation = (
  invitationToken: string,
  account?: { displayName: string; password: string },
  token?: string,
) =>
  apiRequest<{
    membership: { id: string; orgId: string; role: Membership["role"] };
  }>("/invitations/accept", {
    token,
    method: "POST",
    body: { token: invitationToken.trim(), ...account },
  });

export type SurveyPolicy = {
  id: string;
  frequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  colleaguesPerPeriod: number;
  timeZone: string;
  weekday: number;
  monthDay: number;
  generationHour: number;
  generationMinute: number;
  automaticEnabled: boolean;
  effectiveFrom: string;
  automaticStartsAt: string | null;
  questionSelection: "MANUAL" | "ADAPTIVE";
  questionVersionIds: string[];
};
export type GenerationReceipt = {
  isTest: boolean;
  id: string;
  scheduledFor: string;
  createdAt: string;
  createdAssignments: number;
  blockedEmployees: number;
  employeesWithLimitedPeers: number;
};
export type SurveySchedule = {
  testMode: boolean;
  currentPeriodProcessed: boolean;
  policy: SurveyPolicy;
  opensAt: string;
  closesAt: string;
  pending: SurveyPolicy | null;
  nextGenerationAt: string | null;
  lastGeneration: GenerationReceipt | null;
  requiresQuestionSetUpdate: boolean;
};
export type SurveyQuestion = {
  id: string;
  questionKey: string;
  text: string;
  kind: string;
  dimension: string;
  active: boolean;
  approvalStatus: string;
  QuestionSkill_question: { skillId: string; weight: string | number }[];
};
export type SurveySkill = { id: string; active: boolean };
export type ScheduleChange = {
  frequency: SurveyPolicy["frequency"];
  colleaguesPerPeriod: number;
  timeZone: string;
  weekday: number;
  monthDay: number;
  generationTime: string;
  automaticEnabled: boolean;
  questionSelection: SurveyPolicy["questionSelection"];
  questionVersionIds: string[];
};
export type GenerationResult = {
  isTest: boolean;
  generationId: string;
  periodStart: string;
  periodEnd: string;
  createdAssignments: number;
  blockedEmployees: number;
  employeesWithLimitedPeers: number;
  alreadyProcessed: boolean;
};
export type StandardLibrary = {
  version: string;
  context: string;
  questions: {
    templateKey: string;
    text: string;
    dimension: string;
    skillName?: string;
  }[];
};
export const getSurveySchedule = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<SurveySchedule>(`${orgPath(org)}/feedback-policy`, {
    token,
    signal,
  });
export const saveSurveySchedule = (
  token: string,
  org: string,
  body: ScheduleChange,
) =>
  apiRequest<SurveyPolicy>(`${orgPath(org)}/feedback-policy`, {
    token,
    method: "PATCH",
    body,
  });
export const getSurveyQuestions = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<SurveyQuestion[]>(`${orgPath(org)}/questions`, { token, signal });
export const getSurveySkills = (
  token: string,
  org: string,
  signal?: AbortSignal,
) => apiRequest<SurveySkill[]>(`${orgPath(org)}/skills`, { token, signal });
export const getStandardLibrary = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<StandardLibrary>(`${orgPath(org)}/questions/standard-library`, {
    token,
    signal,
  });
export const importStandardQuestions = (token: string, org: string) =>
  apiRequest<{ createdQuestions: number }>(
    `${orgPath(org)}/questions/import-standard`,
    { token, method: "POST", body: {}, timeoutMs: 30000 },
  );
export const generateCompanySurveys = (token: string, org: string) =>
  apiRequest<GenerationResult>(`${orgPath(org)}/surveys/generate-periodic`, {
    token,
    method: "POST",
    body: {},
    timeoutMs: 45000,
  });

export const pauseAutomaticSurveys = (token: string, org: string) =>
  apiRequest<SurveyPolicy>(`${orgPath(org)}/feedback-policy`, {
    token,
    method: "PATCH",
    body: { automaticEnabled: false },
  });

export type SkillBand = "RED" | "ORANGE" | "YELLOW" | "LIGHT_GREEN" | "GREEN";
export type InsightIndicator = {
  tone?: "UNKNOWN" | "POSITIVE" | "MIXED" | "DIFFICULT";
  band?: SkillBand | null;
  state: "UNKNOWN" | "EARLY" | "OLDER" | "POSITIVE" | "MIXED" | "DIFFICULT";
  label: string;
  reports: number;
  reviewers: number;
  firstAt: string | null;
  lastAt: string | null;
};
export type PhotoScope = { token: string; org: string };
export type EmployeeInsight = {
  skillPresentation?: "BANDS" | "SUMMARY";
  profile?: Pick<
    PersonSummary,
    "jobTitle" | "department" | "location" | "photoUpdatedAt"
  >;
  membershipId: string;
  displayName: string;
  role: string;
  isYou: boolean;
  skills: { id: string; name: string; indicator: InsightIndicator }[] | null;
};
export type RelationshipInsight = {
  firstMembershipId: string;
  secondMembershipId: string;
  visibility: "BOTH_DIRECTIONS" | "OWN_EXPERIENCE";
  firstToSecond: {
    enjoyment: InsightIndicator;
    effectiveness: InsightIndicator;
  } | null;
  secondToFirst: {
    enjoyment: InsightIndicator;
    effectiveness: InsightIndicator;
  } | null;
  combined: InsightIndicator | null;
};
export type TeamInsights = {
  testMode: boolean;
  team: { id: string; name: string };
  mode: "TEAM" | "PERSONAL" | "ROSTER";
  modelVersion: string;
  computedAt: string;
  employees: EmployeeInsight[];
  relationships: RelationshipInsight[];
};
export const getTeamInsights = (
  token: string,
  org: string,
  team: string,
  focus?: string,
  signal?: AbortSignal,
) =>
  apiRequest<TeamInsights>(
    `${teamPath(org, team)}/insights${focus ? `?focus=${encodeURIComponent(focus)}` : ""}`,
    { token, signal, timeoutMs: 45000 },
  );

export type QuestionCapabilities = {
  canPropose: boolean;
  canReview: boolean;
  canManageSkills: boolean;
  canImportStandard: boolean;
};
export type ManagedQuestion = SurveyQuestion & {
  version: number;
  approvalOrigin: string | null;
  createdByMembershipId: string | null;
  reviewedByMembershipId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  standardTemplateKey: string | null;
};
export type CompanySkill = SurveySkill & { name: string };
export type QuestionProposal = {
  questionKey: string;
  text: string;
  dimension: "SKILL" | "CHEMISTRY_ENJOYMENT" | "CHEMISTRY_EFFECTIVENESS";
  skillWeights: { skillId: string; weight: number }[];
};
export const getQuestionCapabilities = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<QuestionCapabilities>(`${orgPath(org)}/questions/capabilities`, {
    token,
    signal,
  });
export const getManagedQuestions = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<ManagedQuestion[]>(`${orgPath(org)}/questions`, { token, signal });
export const getCompanySkills = (
  token: string,
  org: string,
  signal?: AbortSignal,
) => apiRequest<CompanySkill[]>(`${orgPath(org)}/skills`, { token, signal });
export const proposeQuestion = (
  token: string,
  org: string,
  body: QuestionProposal,
) =>
  apiRequest<ManagedQuestion>(`${orgPath(org)}/questions`, {
    token,
    method: "POST",
    body,
  });
export const reviewQuestion = (
  token: string,
  org: string,
  id: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
) =>
  apiRequest<ManagedQuestion>(
    `${orgPath(org)}/questions/${encodeURIComponent(id)}/review`,
    {
      token,
      method: "POST",
      body: { decision, ...(note.trim() ? { note: note.trim() } : {}) },
    },
  );
export const createCompanySkill = (token: string, org: string, name: string) =>
  apiRequest<CompanySkill>(`${orgPath(org)}/skills`, {
    token,
    method: "POST",
    body: { name: name.trim() },
  });

export const setCompanyTestMode = (
  token: string,
  org: string,
  enabled: boolean,
) =>
  apiRequest<{ testMode: boolean }>(`${orgPath(org)}/test-mode`, {
    token,
    method: "PATCH",
    body: { enabled },
  });
export const generateTestSurveys = (
  token: string,
  org: string,
  requestId: string,
) =>
  apiRequest<GenerationResult>(`${orgPath(org)}/surveys/generate-test`, {
    token,
    method: "POST",
    body: { requestId },
    timeoutMs: 45000,
  });
export const getOrganization = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<{ id: string; name: string; testMode: boolean }>(orgPath(org), {
    token,
    signal,
  });

export type ProfessionalInfo = {
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  workEmail: string | null;
  workPhone: string | null;
};
export type PersonSummary = Pick<
  ProfessionalInfo,
  "jobTitle" | "department" | "location"
> & {
  membershipId: string;
  displayName: string;
  photoUpdatedAt: string | null;
};
export type EmployeeProfile = PersonSummary &
  ProfessionalInfo & {
    canEditInfo: boolean;
    canEditPhoto: boolean;
  };
const employeePath = (org: string, id: string) =>
  `${orgPath(org)}/employees/${encodeURIComponent(id)}`;
export const getPeople = (token: string, org: string, signal?: AbortSignal) =>
  apiRequest<PersonSummary[]>(`${orgPath(org)}/employees`, { token, signal });
export const getEmployeeProfile = (
  token: string,
  org: string,
  id: string,
  signal?: AbortSignal,
) =>
  apiRequest<EmployeeProfile>(`${employeePath(org, id)}/profile`, {
    token,
    signal,
  });
export const updateEmployeeProfile = (
  token: string,
  org: string,
  id: string,
  info: Partial<ProfessionalInfo>,
) =>
  apiRequest<EmployeeProfile>(`${employeePath(org, id)}/profile`, {
    token,
    method: "PATCH",
    body: info,
  });
export const getEmployeePhoto = (
  token: string,
  org: string,
  id: string,
  signal?: AbortSignal,
) =>
  apiRequest<{ dataUrl: string | null }>(`${employeePath(org, id)}/photo`, {
    token,
    signal,
  });
export const updateEmployeePhoto = (
  token: string,
  org: string,
  id: string,
  dataUrl: string,
) =>
  apiRequest<EmployeeProfile>(`${employeePath(org, id)}/photo`, {
    token,
    method: "PATCH",
    body: { dataUrl },
    timeoutMs: 30000,
  });
export const removeEmployeePhoto = (token: string, org: string, id: string) =>
  apiRequest<EmployeeProfile>(`${employeePath(org, id)}/photo`, {
    token,
    method: "DELETE",
  });

export type BuilderCapabilities = {
  canUse: boolean;
  canCreate: boolean;
  canAssignRoles: boolean;
  teams: TeamSummary[];
};
export type BuilderDraft = {
  id: string;
  revision: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  membershipIds: string[];
  managerIds: string[];
  leaderIds: string[];
};
export type BuilderCatalog = Omit<BuilderCapabilities, "canUse"> & {
  employees: EmployeeInsight[];
  draft: BuilderDraft | null;
  hasHiddenParticipants: boolean;
};
export type TeamAnalysis = {
  chemistry: number | null;
  label: string;
  teamwork: string;
  evidence: "NONE" | "LIMITED" | "ESTABLISHED" | "RESTRICTED";
  knownPairs: number;
  totalPairs: number;
  visiblePairs: number;
};
export type FitRecommendation = {
  limitedEvidence?: boolean;
  membershipId: string;
  fit: "STRONG" | "GOOD" | "MIXED" | "CAUTION" | "UNKNOWN";
  label: string;
  knownLinks: number;
  possibleLinks: number;
  reasons: string[];
};
export type BuilderPreview = TeamInsights & {
  teamAnalysis: TeamAnalysis;
  recommendations: FitRecommendation[];
};
export type BuilderSave = {
  requestId: string;
  teamId?: string;
  revision?: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  membershipIds: string[];
  managerIds?: string[];
  leaderIds?: string[];
};
export const getOwnCard = (token: string, org: string, signal?: AbortSignal) =>
  apiRequest<EmployeeInsight>(`${orgPath(org)}/my-card`, {
    token,
    signal,
    timeoutMs: 30000,
  });
export const getBuilderCapabilities = (
  token: string,
  org: string,
  signal?: AbortSignal,
) =>
  apiRequest<BuilderCapabilities>(`${orgPath(org)}/team-builder/capabilities`, {
    token,
    signal,
  });
export const getBuilderCatalog = (
  token: string,
  org: string,
  teamId?: string,
  signal?: AbortSignal,
) =>
  apiRequest<BuilderCatalog>(
    `${orgPath(org)}/team-builder${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`,
    { token, signal, timeoutMs: 45000 },
  );
export const previewBuilder = (
  token: string,
  org: string,
  membershipIds: string[],
  focus?: string,
  signal?: AbortSignal,
) =>
  apiRequest<BuilderPreview>(`${orgPath(org)}/team-builder/preview`, {
    token,
    signal,
    method: "POST",
    body: { membershipIds, ...(focus ? { focus } : {}) },
    timeoutMs: 45000,
  });
export const saveBuilder = (token: string, org: string, body: BuilderSave) =>
  apiRequest<{ teamId: string; alreadySaved: boolean }>(
    `${orgPath(org)}/team-builder/save`,
    { token, method: "POST", body, timeoutMs: 45000 },
  );
