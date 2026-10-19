const paths = {
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  survey: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  activity: <path d="M4 20V10m8 10V4m8 16v-7M2 21h20" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 4h.01" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 6a8 8 0 0 1 13 2M5 16a8 8 0 0 0 13 2" />
    </>
  ),
  leaf: <path d="M20 3C9 2 3 7 5 14c2 7 15 6 15-11ZM4 21 15 9" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h1m4 0h1m-6 4h1m4 0h1M10 21v-5h4v5" />
    </>
  ),
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
