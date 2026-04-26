import type { ReactNode } from "react";
import { Icon } from "./icons";

export type ShellNavItem = {
  id: string;
  label: string;
  icon:
    | "home"
    | "projects"
    | "board"
    | "backlog"
    | "reports"
    | "settings"
    | "team"
    | "docs"
    | "inbox";
  active?: boolean;
  badge?: string | number | null;
  disabled?: boolean;
  onClick?: () => void;
};

export type ShellNavSection = {
  label: string;
  items: ShellNavItem[];
};

type AppShellProps = {
  commandLabel: string;
  onCommandClick: () => void;
  onQuickCreate?: () => void;
  onThemeToggle: () => void;
  themeLabel: string;
  navSections: ShellNavSection[];
  pageHeader: ReactNode;
  sidebarMeta?: ReactNode;
  topbarMeta?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  commandLabel,
  onCommandClick,
  onQuickCreate,
  onThemeToggle,
  themeLabel,
  navSections,
  pageHeader,
  sidebarMeta,
  topbarMeta,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">F</div>
          <div>
            <p className="brand-kicker">Fabriqueta</p>
            <strong>Delivery OS</strong>
          </div>
        </div>

        <div className="sidebar-command">
          <button className="command-trigger" onClick={onCommandClick} type="button">
            <Icon name="search" />
            <span>{commandLabel}</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navSections.map((section) => (
            <section className="sidebar-section" key={section.label}>
              <p className="sidebar-section-label">{section.label}</p>
              <div className="sidebar-section-items">
                {section.items.map((item) => (
                  <button
                    className={`sidebar-link${item.active ? " active" : ""}`}
                    disabled={item.disabled}
                    key={item.id}
                    onClick={item.onClick}
                    type="button"
                  >
                    <span className="sidebar-link-copy">
                      <Icon name={item.icon} />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== null && item.badge !== undefined ? (
                      <span className="sidebar-badge">{item.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        {sidebarMeta ? <div className="sidebar-meta">{sidebarMeta}</div> : null}
      </aside>

      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-search">
            <button className="topbar-search-button" onClick={onCommandClick} type="button">
              <Icon name="search" />
              <span>Search tasks, docs, projects, and actions</span>
            </button>
          </div>

          <div className="topbar-actions">
            {topbarMeta}
            {onQuickCreate ? (
              <button className="button button-primary" onClick={onQuickCreate} type="button">
                <Icon name="plus" />
                <span>Create</span>
              </button>
            ) : null}
            <button
              aria-label={themeLabel}
              className="icon-button"
              onClick={onThemeToggle}
              type="button"
            >
              <Icon name={themeLabel.includes("dark") ? "moon" : "sun"} />
            </button>
          </div>
        </header>

        <main className="workspace-main">
          {pageHeader}
          <section className="workspace-content">{children}</section>
        </main>
      </div>
    </div>
  );
}
