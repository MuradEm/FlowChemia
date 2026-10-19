import { useEffect, useState } from "react";
import EmployeeHome from "./EmployeeHome";
import SurveyDialog from "./SurveyDialog";
import {
  colleagues,
  DEMO_STORAGE_KEY,
  finishAssignment,
  initialAssignments,
  questions,
  readAssignments,
  replaceColleague,
} from "./demo";
import type { DemoAssignment } from "./demo";

export default function DemoWorkspace({ onExit }: { onExit: () => void }) {
  const [assignments, setAssignments] = useState<DemoAssignment[]>(() => {
    try {
      return readAssignments(localStorage.getItem(DEMO_STORAGE_KEY));
    } catch {
      return initialAssignments();
    }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const active = assignments.find(
    (a) => a.id === activeId && a.status === "OPEN",
  );
  const person = active
    ? colleagues.find((c) => c.id === active.subjectId)!
    : null;
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(assignments));
      setStorageUnavailable(false);
    } catch {
      setStorageUnavailable(true);
    }
  }, [assignments]);
  function finish(status: "COMPLETED" | "SKIPPED") {
    if (!active) return;
    setAssignments((current) => finishAssignment(current, active.id, status));
    setActiveId(null);
    setNotice(
      status === "COMPLETED"
        ? "Demo check-in completed. Thank you for trying it! No feedback was sent."
        : "Demo check-in skipped. No feedback was sent.",
    );
  }
  function replace() {
    if (!active) return;
    const updated = replaceColleague(assignments, active.id);
    setAssignments(updated);
    setActiveId(null);
    setNotice(
      updated.find((a) => a.id === active.id)!.status === "OPEN"
        ? "Your demo check-in now has a different colleague. No participation credit has been earned yet."
        : "No other demo colleague is available. Credit has not been awarded for this check-in.",
    );
  }
  const reset = () => {
    setActiveId(null);
    setAssignments(initialAssignments());
    setNotice("Demo reset. Your two sample check-ins are ready again.");
  };
  return (
    <>
      <EmployeeHome
        mode="demo"
        displayName="Elias Murad"
        companyName="Northstar Automation"
        roleLabel="Employee"
        notice={notice}
        storageUnavailable={storageUnavailable}
        onDismissNotice={() => setNotice("")}
        onReset={reset}
        onOpen={setActiveId}
        onExit={onExit}
        assignments={assignments
          .filter((a) => a.status === "OPEN")
          .map((a) => ({
            id: a.id,
            colleague: colleagues.find((c) => c.id === a.subjectId)!,
            teamName: "PLC commissioning",
            closesAt: null,
            requiresReplacement: false,
            questionCount: 5,
          }))}
        history={assignments
          .filter((a) => a.status !== "OPEN")
          .map((a) => ({
            id: a.id,
            label: colleagues.find((c) => c.id === a.subjectId)!.name,
            outcome: a.status as "COMPLETED" | "SKIPPED" | "NO_REPLACEMENT",
            percentage:
              a.status === "COMPLETED"
                ? 100
                : a.status === "SKIPPED"
                  ? 60
                  : null,
          }))}
      />
      {active && person && (
        <SurveyDialog
          key={`${active.id}:${active.subjectId}`}
          mode="demo"
          survey={{
            id: active.id,
            subjectName: person.name,
            subtitle: person.role,
            initials: person.initials,
            color: person.color,
            questions: [...questions],
            requiresReplacement: false,
            closesAt: null,
            actionable: true,
          }}
          onClose={() => setActiveId(null)}
          onSubmit={async () => finish("COMPLETED")}
          onSkip={async () => finish("SKIPPED")}
          onReplace={async () => replace()}
          onRefresh={() => setActiveId(null)}
        />
      )}
    </>
  );
}
