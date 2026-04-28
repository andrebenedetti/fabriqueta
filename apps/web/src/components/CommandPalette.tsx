import { useDeferredValue, useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: IconName;
  onSelect: () => void;
};

type CommandPaletteProps = {
  actions: CommandAction[];
  isOpen: boolean;
  onClose: () => void;
};

export function CommandPalette({ actions, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredActions = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return actions.slice(0, 12);
    }

    return actions
      .filter((action) =>
        `${action.label} ${action.hint ?? ""} ${action.keywords ?? ""}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 20);
  }, [actions, deferredQuery]);

  if (!isOpen) {
    return null;
  }

  return (
    <div aria-hidden={false} className="overlay-backdrop" role="presentation">
      <section aria-modal="true" className="command-palette" role="dialog">
        <div className="command-palette-header">
          <Icon name="search" />
          <input
            autoFocus
            className="command-palette-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a view, task, or action"
            value={query}
          />
          <button className="ghost-button compact-button" onClick={onClose} type="button">
            Esc
          </button>
        </div>

        <div className="command-palette-results">
          {filteredActions.length ? (
            filteredActions.map((action) => (
              <button
                className="command-palette-item"
                key={action.id}
                onClick={() => {
                  action.onSelect();
                  onClose();
                  setQuery("");
                }}
                type="button"
              >
                <span className="command-palette-item-copy">
                  {action.icon ? <Icon name={action.icon} /> : <Icon name="spark" />}
                  <span>
                    <strong>{action.label}</strong>
                    {action.hint ? <small>{action.hint}</small> : null}
                  </span>
                </span>
                <Icon name="chevron-right" />
              </button>
            ))
          ) : (
            <div className="empty-placeholder">
              <h3>No matching actions</h3>
              <p>Try a task title, a page name, or an action like create, start sprint, or reports.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
