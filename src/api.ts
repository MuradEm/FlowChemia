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
  id: string;
  teamId: string;
  teamName: string;
  type: string;
  subject: { membershipId: string; displayName: string };
  requiresReplacement: boolean;
  closesAt: string | null;
};
export type AssignmentDetail = {
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
  method?: "GET" | "POST" | "DELETE";
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
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
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
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
