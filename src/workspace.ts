export type HomeAssignment = {
  id: string;
  colleague: { name: string; role: string; initials: string; color: string };
  teamName: string;
  closesAt: string | null;
  requiresReplacement: boolean;
  questionCount?: number;
};
export type HistoryRecord = {
  id: string;
  label: string;
  outcome: "COMPLETED" | "SKIPPED" | "NO_REPLACEMENT";
  percentage: number | null;
  createdAt?: string;
};
export type SurveyQuestion = { id: string; text: string; category: string };
export type SurveyView = {
  isTest?: boolean;
  id: string;
  subjectName: string;
  subtitle: string;
  initials: string;
  color: string;
  questions: SurveyQuestion[];
  requiresReplacement: boolean;
  closesAt: string | null;
  actionable: boolean;
};
export type RatingAnswer = { questionVersionId: string; rating: number | null };

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase() || "?"
  );
}
export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "Date unavailable";
}
