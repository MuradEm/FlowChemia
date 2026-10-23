import { useEffect, useState, useId } from "react";
import type { RefObject } from "react";

type Edge = { to: string; state: string; path: string };
export default function FocusConnections({
  container,
  from,
}: {
  container: RefObject<HTMLDivElement | null>;
  from: string;
}) {
  const markerId = useId();
  const [drawing, setDrawing] = useState<{
    width: number;
    height: number;
    edges: Edge[];
  } | null>(null);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    function measure() {
      const source = root!.querySelector(".selected-employee");
      if (!source) return;
      const bounds = root!.getBoundingClientRect(),
        card = source.getBoundingClientRect();
      const targets = [
        ...root!.querySelectorAll<HTMLElement>("[data-relationship-to]"),
      ];
      const edges = targets.map((target, index) => {
        const peer = target.getBoundingClientRect();
        const stacked = peer.top >= card.bottom && peer.left < card.right;
        const x = stacked ? 12 : card.right - bounds.left;
        const y = stacked
          ? card.bottom - bounds.top
          : card.top -
            bounds.top +
            (card.height * (index + 1)) / (targets.length + 1);
        const endX = peer.left - bounds.left,
          endY = peer.top - bounds.top + peer.height / 2;
        return {
          to: target.dataset.relationshipTo!,
          state: target.dataset.relationshipState!,
          path: stacked
            ? `M ${x} ${y} V ${endY} H ${endX}`
            : `M ${x} ${y} C ${(x + endX) / 2} ${y}, ${(x + endX) / 2} ${endY}, ${endX} ${endY}`,
        };
      });
      setDrawing({ width: bounds.width, height: bounds.height, edges });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root
      .querySelectorAll(".employee-card, .relationship-card")
      .forEach((node) => observer.observe(node));
    const mutations = new MutationObserver(measure);
    mutations.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-relationship-state", "data-relationship-to"],
    });
    measure();
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [container, from]);
  if (!drawing) return null;
  return (
    <svg
      className="focus-connection-layer"
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="6"
          refY="6"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
        >
          <circle
            cx="6"
            cy="6"
            r="5"
            fill="context-stroke"
            stroke="white"
            strokeWidth="2"
          />
        </marker>
      </defs>
      {drawing.edges.map((edge) => (
        <path
          key={edge.to}
          className={`connection-${edge.state.toLowerCase()}`}
          d={edge.path}
          markerStart={`url(#${markerId})`}
          markerEnd={`url(#${markerId})`}
          data-connection-from={from}
          data-connection-to={edge.to}
        />
      ))}
    </svg>
  );
}
