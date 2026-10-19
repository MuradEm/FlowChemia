import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approvedPool,
  adaptiveReady,
  fixedReady,
  policyForm,
} from "../src/survey-settings.ts";
const skill = { id: "skill", active: true };
const question = (id, dimension = "SKILL", extra = {}) => ({
  id,
  questionKey: id,
  text: id,
  kind: "RATING",
  dimension,
  active: true,
  approvalStatus: "APPROVED",
  QuestionSkill_question:
    dimension === "SKILL" ? [{ skillId: "skill", weight: "1" }] : [],
  ...extra,
});

test("readiness excludes drafts, inactive questions/skills and duplicate versions of one question", () => {
  const eligible = [
    question("one"),
    question("two"),
    question("three"),
    question("enjoy", "CHEMISTRY_ENJOYMENT"),
    question("effect", "CHEMISTRY_EFFECTIVENESS"),
  ];
  const pool = approvedPool(
    [
      ...eligible,
      question("draft", "SKILL", { approvalStatus: "DRAFT" }),
      question("inactive", "SKILL", { active: false }),
    ],
    [skill],
  );
  assert.equal(pool.length, 5);
  assert.equal(adaptiveReady(pool), true);
  assert.equal(
    adaptiveReady(approvedPool(eligible, [{ ...skill, active: false }])),
    false,
  );
  const versions = [
    question("v3", "SKILL", { questionKey: "same" }),
    question("v2", "SKILL", { questionKey: "same" }),
    question("v1", "SKILL", { questionKey: "same" }),
    ...eligible.slice(3),
  ];
  assert.equal(adaptiveReady(approvedPool(versions, [skill])), false);
  assert.equal(
    fixedReady(
      eligible.map((q) => q.id),
      pool,
    ),
    true,
  );
  assert.equal(
    fixedReady(["one", "one", "three", "enjoy", "effect"], pool),
    false,
  );
});

test("editing a saved fixed policy preserves exact question IDs and wall-clock generation time", () => {
  const policy = {
    frequency: "FORTNIGHTLY",
    colleaguesPerPeriod: 2,
    timeZone: "Europe/Berlin",
    weekday: 2,
    monthDay: 31,
    generationHour: 9,
    generationMinute: 5,
    automaticEnabled: false,
    questionSelection: "MANUAL",
    questionVersionIds: ["a", "b", "c", "d", "e"],
  };
  const form = policyForm(policy);
  assert.equal(form.generationTime, "09:05");
  assert.deepEqual(form.questionVersionIds, policy.questionVersionIds);
  assert.equal(form.questionSelection, "MANUAL");
  assert.equal(form.timeZone, "Europe/Berlin");
});
