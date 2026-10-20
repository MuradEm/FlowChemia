import type { CompanySkill, ManagedQuestion, QuestionProposal } from "./api";
export const questionCategory = (dimension: string) =>
  ({
    SKILL: "Skills",
    CHEMISTRY_ENJOYMENT: "Enjoyment",
    CHEMISTRY_EFFECTIVENESS: "Collaboration effectiveness",
    UNSPECIFIED: "Legacy / unspecified",
  })[dimension] ?? dimension;
export type SkillAllocation = { skillId: string; percentage: string };

// Percentages allow two decimals; API weights allow four. Use integer units
// to make 33.33 + 33.33 + 33.34 exactly 100, rather than comparing floats.
export function percentageUnits(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d{1,3}(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const units = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return units > 0 && units <= 10000 ? units : null;
}
export function proposalWeights(
  allocations: SkillAllocation[],
  skills: CompanySkill[],
): QuestionProposal["skillWeights"] | null {
  if (
    !allocations.length ||
    allocations.length > 10 ||
    new Set(allocations.map((a) => a.skillId)).size !== allocations.length
  )
    return null;
  const parsed = allocations.map((a) => ({
    skillId: a.skillId,
    units: percentageUnits(a.percentage),
  }));
  if (
    parsed.some(
      (a) =>
        a.units === null || !skills.some((s) => s.id === a.skillId && s.active),
    ) ||
    parsed.reduce((n, a) => n + (a.units ?? 0), 0) !== 10000
  )
    return null;
  return parsed.map((a) => ({ skillId: a.skillId, weight: a.units! / 10000 }));
}
export function initialAllocations(
  question: ManagedQuestion | null,
): SkillAllocation[] {
  return (
    question?.QuestionSkill_question.map((w) => ({
      skillId: w.skillId,
      percentage: String(Math.round(Number(w.weight) * 10000) / 100),
    })) ?? []
  );
}
