import { useState, useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { Button } from "./ui/button";

export type ShellNavItem = {
  id: string;
  label: string;
  icon: IconName;
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
  navSections,
  pageHeader,
  sidebarMeta,
  topbarMeta,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("fabriqueta.sidebar.collapsed") === "true";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fabriqueta.sidebar.collapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onQuickCreate?.();
      }
      if (e.key === "b" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const boardBtn = document.querySelector('[data-nav-id="board"]') as HTMLButtonElement | null;
        boardBtn?.click();
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onCommandClick();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCommandClick, onQuickCreate]);

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">F</div>
          {!collapsed ? (
            <div>
              <p className="brand-kicker">Fabriqueta</p>
              <strong>Delivery OS</strong>
            </div>
          ) : null}
        </div>

        <div className="sidebar-command">
          <Button className="command-trigger" onClick={onCommandClick} type="button" variant="secondary">
            <Icon name="search" />
            {!collapsed ? <><span>{commandLabel}</span><kbd>⌘K</kbd></> : null}
          </Button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navSections.map((section) => (
            <section className="sidebar-section" key={section.label}>
              {!collapsed ? <p className="sidebar-section-label">{section.label}</p> : null}
              <div className="sidebar-section-items">
                {section.items.map((item) => (
                  <Button
                    className={`sidebar-link${item.active ? " active" : ""}`}
                    data-nav-id={item.id}
                    disabled={item.disabled}
                    key={item.id}
                    onClick={item.onClick}
                    type="button"
                    variant="ghost"
                  >
                    <span className="sidebar-link-copy">
                      <Icon name={item.icon} />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </span>
                    {!collapsed && item.badge !== null && item.badge !== undefined ? (
                      <span className="sidebar-badge">{item.badge}</span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="sidebar-collapse-toggle">
          <Button className="icon-button" onClick={() => setCollapsed(!collapsed)} size="icon" type="button" variant="ghost">
            <Icon name="chevron-right" />
          </Button>
        </div>

        {!collapsed && sidebarMeta ? <div className="sidebar-meta">{sidebarMeta}</div> : null}
      </aside>

      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-search">
            <Button className="topbar-search-button" onClick={onCommandClick} type="button" variant="secondary">
              <Icon name="search" />
              <span>Search tasks, docs, projects, and actions</span>
            </Button>
          </div>

          <div className="topbar-actions">
            {topbarMeta}
            {onQuickCreate ? (
              <Button onClick={onQuickCreate} type="button">
                <Icon name="plus" />
                <span>Create</span>
              </Button>
            ) : null}
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
