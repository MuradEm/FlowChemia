import { test } from "node:test";
import assert from "node:assert/strict";
import {
  percentageUnits,
  proposalWeights,
  initialAllocations,
} from "../src/question-management.ts";
const skills = Array.from({ length: 11 }, (_, i) => ({
  id: String(i),
  name: `Skill ${i}`,
  active: true,
}));
test("decimal percentages total exactly 100% and survive API weight round trips", () => {
  const allocations = [
    { skillId: "0", percentage: "33.33" },
    { skillId: "1", percentage: "33.33" },
    { skillId: "2", percentage: "33.34" },
  ];
  const weights = proposalWeights(allocations, skills);
  assert.deepEqual(weights, [
    { skillId: "0", weight: 0.3333 },
    { skillId: "1", weight: 0.3333 },
    { skillId: "2", weight: 0.3334 },
  ]);
  assert.deepEqual(
    initialAllocations({
      QuestionSkill_question: weights.map((w) => ({
        ...w,
        weight: String(w.weight),
      })),
    }),
    allocations,
  );
  assert.equal(percentageUnits(".01"), 1);
  assert.equal(percentageUnits("100.00"), 10000);
});
test("invalid totals, precision, duplicates, inactive skills and excessive mappings block a proposal", () => {
  for (const value of [
    "",
    "0",
    "-1",
    "100.01",
    "33.333",
    "1e2",
    "50,5",
    "Infinity",
  ])
    assert.equal(percentageUnits(value), null, value);
  assert.equal(
    proposalWeights(
      [
        { skillId: "0", percentage: "60" },
        { skillId: "1", percentage: "39.99" },
      ],
      skills,
    ),
    null,
  );
  assert.equal(
    proposalWeights(
      [
        { skillId: "0", percentage: "50" },
        { skillId: "0", percentage: "50" },
      ],
      skills,
    ),
    null,
  );
  assert.equal(
    proposalWeights(
      [{ skillId: "0", percentage: "100" }],
      [{ ...skills[0], active: false }],
    ),
    null,
  );
  assert.equal(
    proposalWeights([{ skillId: "foreign", percentage: "100" }], skills),
    null,
  );
  assert.equal(proposalWeights([], skills), null);
  assert.ok(
    proposalWeights(
      skills.slice(0, 10).map((s) => ({ skillId: s.id, percentage: "10" })),
      skills,
    ),
  );
  assert.equal(
    proposalWeights(
      skills.map((s) => ({ skillId: s.id, percentage: "10" })),
      skills,
    ),
    null,
  );
});
