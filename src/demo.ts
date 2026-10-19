export type AssignmentStatus =
  | "OPEN"
  | "COMPLETED"
  | "SKIPPED"
  | "NO_REPLACEMENT";
export type DemoAssignment = {
  id: string;
  subjectId: string;
  previousSubjectIds: string[];
  status: AssignmentStatus;
};

export const DEMO_STORAGE_KEY = "flowchemia.employee-home.demo.v1";
export const colleagues = [
  {
    id: "alice",
    name: "Alice Bennett",
    role: "PLC Programmer",
    initials: "AB",
    color: "teal",
  },
  {
    id: "carla",
    name: "Carla Silva",
    role: "Robotics Programmer",
    initials: "CS",
    color: "amber",
  },
  {
    id: "bob",
    name: "Bob Jensen",
    role: "Automation Engineer",
    initials: "BJ",
    color: "blue",
  },
  {
    id: "dan",
    name: "Dan Rossi",
    role: "Commissioning Engineer",
    initials: "DR",
    color: "violet",
  },
] as const;
export const questions = [
  {
    id: "technical",
    category: "Technical problem solving",
    text: "How effectively did this colleague identify the cause of technical problems?",
  },
  {
    id: "communication",
    category: "Communication",
    text: "How clearly did this colleague explain information you needed for your work?",
  },
  {
    id: "teamwork",
    category: "Teamwork",
    text: "How effectively did this colleague coordinate their work with yours?",
  },
  {
    id: "enjoyment",
    category: "Your experience",
    text: "How comfortable did you feel working with this colleague?",
  },
  {
    id: "effectiveness",
    category: "Working together",
    text: "How effectively did you and this colleague work together to complete shared tasks?",
  },
] as const;

export function initialAssignments(): DemoAssignment[] {
  return [
    {
      id: "demo-1",
      subjectId: "alice",
      previousSubjectIds: [],
      status: "OPEN",
    },
    {
      id: "demo-2",
      subjectId: "carla",
      previousSubjectIds: [],
      status: "OPEN",
    },
  ];
}

export function readAssignments(raw: string | null): DemoAssignment[] {
  if (!raw) return initialAssignments();
  try {
    const value: unknown = JSON.parse(raw);
    const knownSubject = (id: unknown) => colleagues.some((p) => p.id === id);
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      value.some(
        (a, i) =>
          !a ||
          a.id !== `demo-${i + 1}` ||
          !knownSubject(a.subjectId) ||
          !["OPEN", "COMPLETED", "SKIPPED", "NO_REPLACEMENT"].includes(
            a.status,
          ) ||
          !Array.isArray(a.previousSubjectIds) ||
          !a.previousSubjectIds.every(knownSubject),
      )
    )
      return initialAssignments();
    const subjects = value.flatMap((a) => [
      a.subjectId,
      ...a.previousSubjectIds,
    ]);
    if (new Set(subjects).size !== subjects.length) return initialAssignments();
    return value as DemoAssignment[];
  } catch {
    return initialAssignments();
  }
}

export function finishAssignment(
  assignments: DemoAssignment[],
  id: string,
  status: "COMPLETED" | "SKIPPED",
): DemoAssignment[] {
  return assignments.map((a) =>
    a.id === id && a.status === "OPEN" ? { ...a, status } : a,
  );
}

export function replaceColleague(
  assignments: DemoAssignment[],
  id: string,
): DemoAssignment[] {
  const used = new Set(
    assignments.flatMap((a) => [a.subjectId, ...a.previousSubjectIds]),
  );
  const next = colleagues.find((c) => !used.has(c.id));
  return assignments.map((a) => {
    if (a.id !== id || a.status !== "OPEN") return a;
    return next
      ? {
          ...a,
          subjectId: next.id,
          previousSubjectIds: [...a.previousSubjectIds, a.subjectId],
        }
      : { ...a, status: "NO_REPLACEMENT" };
  });
}
