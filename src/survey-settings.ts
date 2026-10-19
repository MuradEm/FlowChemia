import type {
  ScheduleChange,
  SurveyPolicy,
  SurveyQuestion,
  SurveySkill,
} from "./api";

export function policyForm(policy: SurveyPolicy): ScheduleChange {
  return {
    frequency: policy.frequency,
    colleaguesPerPeriod: policy.colleaguesPerPeriod,
    timeZone: policy.timeZone,
    weekday: policy.weekday,
    monthDay: policy.monthDay,
    generationTime: `${String(policy.generationHour).padStart(2, "0")}:${String(policy.generationMinute).padStart(2, "0")}`,
    automaticEnabled: policy.automaticEnabled,
    questionSelection: policy.questionSelection,
    questionVersionIds: policy.questionVersionIds,
  };
}
export function approvedPool(
  questions: SurveyQuestion[],
  skills: SurveySkill[],
) {
  const active = new Set(skills.filter((s) => s.active).map((s) => s.id));
  return questions.filter(
    (q) =>
      q.active &&
      q.approvalStatus === "APPROVED" &&
      q.kind === "RATING" &&
      (q.dimension === "SKILL"
        ? q.QuestionSkill_question.length > 0 &&
          q.QuestionSkill_question.every(
            (w) => active.has(w.skillId) && Number(w.weight) > 0,
          ) &&
          q.QuestionSkill_question.reduce(
            (n, w) => n + Math.round(Number(w.weight) * 10000),
            0,
          ) === 10000
        : ["CHEMISTRY_ENJOYMENT", "CHEMISTRY_EFFECTIVENESS"].includes(
            q.dimension,
          ) && !q.QuestionSkill_question.length),
  );
}
export function adaptiveReady(versions: SurveyQuestion[]) {
  // The API selects one approved version per question key, newest first.
  const pool = versions.filter(
    (q, i) =>
      versions.findIndex((other) => other.questionKey === q.questionKey) === i,
  );
  return (
    pool.filter((q) => q.dimension === "SKILL").length >= 3 &&
    pool.some((q) => q.dimension === "CHEMISTRY_ENJOYMENT") &&
    pool.some((q) => q.dimension === "CHEMISTRY_EFFECTIVENESS")
  );
}
export function fixedReady(ids: string[], pool: SurveyQuestion[]) {
  const questions = ids
    .map((id) => pool.find((q) => q.id === id))
    .filter((q): q is SurveyQuestion => !!q);
  const skills = questions.filter((q) => q.dimension === "SKILL").length;
  const enjoyment = questions.filter(
    (q) => q.dimension === "CHEMISTRY_ENJOYMENT",
  ).length;
  const effectiveness = questions.filter(
    (q) => q.dimension === "CHEMISTRY_EFFECTIVENESS",
  ).length;
  return (
    ids.length === 5 &&
    new Set(ids).size === 5 &&
    questions.length === 5 &&
    ((skills === 3 && enjoyment === 1 && effectiveness === 1) ||
      (skills === 4 && enjoyment + effectiveness === 1))
  );
}
