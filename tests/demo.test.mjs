import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialAssignments,
  readAssignments,
  finishAssignment,
  replaceColleague,
} from "../src/demo.ts";

test("persisted demo progress restores and corrupt storage resets safely", () => {
  const initial = initialAssignments();
  assert.deepEqual(readAssignments(JSON.stringify(initial)), initial);
  for (const raw of [
    "invalid",
    "null",
    "{}",
    "[]",
    JSON.stringify([{ id: "demo-1", subjectId: "unknown", status: "OPEN" }]),
  ])
    assert.deepEqual(readAssignments(raw), initial);
  const repeated = initialAssignments();
  repeated[1].subjectId = "alice";
  assert.deepEqual(readAssignments(JSON.stringify(repeated)), initial);
  const completed = finishAssignment(initial, "demo-1", "COMPLETED");
  assert.deepEqual(readAssignments(JSON.stringify(completed)), completed);
});
test("finishing a slot changes only that open assignment and preserves its final outcome", () => {
  const initial = initialAssignments();
  const completed = finishAssignment(initial, "demo-1", "COMPLETED");
  assert.equal(initial[0].status, "OPEN");
  assert.equal(completed[0].status, "COMPLETED");
  assert.equal(completed[1].status, "OPEN");
  assert.deepEqual(finishAssignment(completed, "demo-1", "SKIPPED"), completed);
  assert.equal(
    finishAssignment(initial, "demo-2", "SKIPPED")[1].status,
    "SKIPPED",
  );
});
test("replacement retains the two slots, excludes prior colleagues and closes when exhausted", () => {
  let assignments = initialAssignments();
  assignments = replaceColleague(assignments, "demo-1");
  assert.equal(assignments.length, 2);
  assert.equal(assignments[0].subjectId, "bob");
  assert.equal(assignments[0].status, "OPEN");
  assignments = replaceColleague(assignments, "demo-1");
  assert.equal(assignments[0].subjectId, "dan");
  assignments = replaceColleague(assignments, "demo-1");
  assert.equal(assignments[0].status, "NO_REPLACEMENT");
  assert.deepEqual(assignments[0].previousSubjectIds, ["alice", "bob"]);
  assert.equal(assignments[1].subjectId, "carla");
  assert.deepEqual(readAssignments(JSON.stringify(assignments)), assignments);
  assert.deepEqual(replaceColleague(assignments, "demo-1"), assignments);
});
