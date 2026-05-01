import { useDeferredValue, useMemo, useState } from "react";
import { Icon, type IconName } from "./icons";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Dialog, DialogContent } from "./ui/dialog";

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
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={isOpen}>
      <DialogContent className="command-palette overflow-hidden p-0" showCloseButton={false}>
        <Command shouldFilter={false}>
          <div className="command-palette-header">
            <CommandInput
              autoFocus
              className="command-palette-input"
              onValueChange={setQuery}
              placeholder="Jump to a view, task, or action"
              value={query}
            />
            <Button className="compact-button" onClick={onClose} type="button" variant="ghost">
              Esc
            </Button>
          </div>

          <CommandList className="command-palette-results">
            {filteredActions.length ? (
              <CommandGroup>
                {filteredActions.map((action) => (
                  <CommandItem
                    className="command-palette-item"
                    key={action.id}
                    onSelect={() => {
                      action.onSelect();
                      onClose();
                      setQuery("");
                    }}
                    value={action.id}
                  >
                <span className="command-palette-item-copy">
                  {action.icon ? <Icon name={action.icon} /> : <Icon name="spark" />}
                  <span>
                    <strong>{action.label}</strong>
                    {action.hint ? <small>{action.hint}</small> : null}
                  </span>
                </span>
                    <Icon name="chevron-right" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty className="empty-placeholder">
              <h3>No matching actions</h3>
              <p>Try a task title, a page name, or an action like create, start sprint, or reports.</p>
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
