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
  method?: "GET" | "POST";
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
          : "The request could not be accepted. Check your answers and try again.",
      401:
        path === "/auth/login"
          ? "The email or password is incorrect."
          : "Your session has expired. Please sign in again.",
      403: "You don’t have access to this action.",
      404: "This company or check-in is no longer available to you.",
      409: "This check-in has changed or is already closed. Refresh your check-ins before continuing.",
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
