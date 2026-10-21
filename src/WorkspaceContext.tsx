import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
export const WorkspaceContext = createContext<{
  registerGuard: (guard: () => boolean) => () => void;
} | null>(null);
export function PageHeader({ children }: { children: ReactNode }) {
  const workspace = useContext(WorkspaceContext);
  return workspace ? null : (
    <header className="setup-header">{children}</header>
  );
}
export function useWorkspaceGuard(guard: () => boolean) {
  const workspace = useContext(WorkspaceContext),
    latest = useRef(guard);
  latest.current = guard;
  useEffect(
    () => workspace?.registerGuard(() => latest.current()),
    [workspace],
  );
}
export function useEmbeddedWorkspace() {
  return useContext(WorkspaceContext) !== null;
}
