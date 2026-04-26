import type { ReactNode, SVGProps } from "react";

type IconName =
  | "home"
  | "projects"
  | "board"
  | "backlog"
  | "reports"
  | "settings"
  | "team"
  | "docs"
  | "search"
  | "plus"
  | "bell"
  | "moon"
  | "sun"
  | "chevron-right"
  | "spark"
  | "calendar"
  | "filter"
  | "check"
  | "alert"
  | "grip"
  | "clock"
  | "inbox"
  | "user";

const iconPaths: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  projects: (
    <>
      <path d="M4 5.5h7v6H4z" />
      <path d="M13 5.5h7v6h-7z" />
      <path d="M4 12.5h7v6H4z" />
      <path d="M13 12.5h7v6h-7z" />
    </>
  ),
  board: (
    <>
      <path d="M4 5h4v14H4z" />
      <path d="M10 5h4v9h-4z" />
      <path d="M16 5h4v12h-4z" />
    </>
  ),
  backlog: (
    <>
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h10" />
    </>
  ),
  reports: (
    <>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.53V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.4V8.4A1.7 1.7 0 0 0 20.95 9H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  team: (
    <>
      <path d="M16 21v-1.5a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 19.5V21" />
      <path d="M12 12a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
      <path d="M19 21v-1a3 3 0 0 0-2-2.83" />
      <path d="M5 21v-1a3 3 0 0 1 2-2.83" />
    </>
  ),
  docs: (
    <>
      <path d="M7 4h9l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M16 4v4h4" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  search: (
    <>
      <path d="M11 18a7 7 0 1 0 0-14a7 7 0 0 0 0 14Z" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  bell: (
    <>
      <path d="M15 18H5l1.2-1.2A2 2 0 0 0 7 15.4V11a5 5 0 0 1 10 0v4.4a2 2 0 0 0 .8 1.6L19 18h-4" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3A7 7 0 1 0 21 12.8Z" />,
  sun: (
    <>
      <path d="M12 4V2" />
      <path d="M12 22v-2" />
      <path d="m17.7 6.3 1.4-1.4" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="M20 12h2" />
      <path d="M2 12h2" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="M12 17a5 5 0 1 0 0-10a5 5 0 0 0 0 10Z" />
    </>
  ),
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  spark: (
    <>
      <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v3" />
      <path d="M17 3v3" />
      <path d="M4 8h16" />
      <rect height="14" rx="2" width="18" x="3" y="5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  alert: (
    <>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.8 2.8 17a2 2 0 0 0 1.74 3h14.92A2 2 0 0 0 21.2 17L13.7 3.8a2 2 0 0 0-3.48 0Z" />
    </>
  ),
  grip: (
    <>
      <path d="M9 6h.01" />
      <path d="M9 12h.01" />
      <path d="M9 18h.01" />
      <path d="M15 6h.01" />
      <path d="M15 12h.01" />
      <path d="M15 18h.01" />
    </>
  ),
  clock: (
    <>
      <path d="M12 7v5l3 2" />
      <path d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Z" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 6h16l1 9H15l-2 3h-2l-2-3H3l1-9Z" />
      <path d="M3 15h6" />
      <path d="M15 15h6" />
    </>
  ),
  user: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width="18"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
