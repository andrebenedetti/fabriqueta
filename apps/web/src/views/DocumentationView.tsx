import { useState, useMemo, type FormEvent, type ReactNode } from "react";
import type { Documentation, DocumentationNode } from "../types";
import { Icon } from "../components/icons";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";

type DocumentationViewProps = {
  documentation: Documentation | null;
  onSelectNode: (nodeId: string | null) => void;
  selectedDocumentationNode: DocumentationNode | null;
  selectedPage: DocumentationNode | null;
  selectedDocumentationName: string;
  selectedDocumentationContent: string;
  onSelectedNameChange: (value: string) => void;
  onSelectedContentChange: (value: string) => void;
  onCreateDirectory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreatePage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: () => void;
  directoryName: string;
  pageName: string;
  onDirectoryNameChange: (value: string) => void;
  onPageNameChange: (value: string) => void;
  activeDirectoryPath: string;
};

export function DocumentationView({
  documentation,
  onSelectNode,
  selectedDocumentationNode,
  selectedPage,
  selectedDocumentationName,
  selectedDocumentationContent,
  onSelectedNameChange,
  onSelectedContentChange,
  onCreateDirectory,
  onCreatePage,
  onSave,
  onDelete,
  directoryName,
  pageName,
  onDirectoryNameChange,
  onPageNameChange,
  activeDirectoryPath,
}: DocumentationViewProps) {
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  const filteredNodes = useMemo(() => {
    if (!docSearchQuery.trim() || !documentation) return documentation?.nodes ?? [];
    const query = docSearchQuery.toLowerCase();
    function filterRecursive(nodes: DocumentationNode[]): DocumentationNode[] {
      return nodes
        .map((node) => {
          const nameMatch = node.name.toLowerCase().includes(query);
          const contentMatch = node.content?.toLowerCase().includes(query) ?? false;
          const children = node.kind === "directory" ? filterRecursive(node.children) : [];
          const hasMatchingChild = children.length > 0;
          if (nameMatch || contentMatch || hasMatchingChild) return { ...node, children };
          return null;
        })
        .filter((node): node is DocumentationNode => node !== null);
    }
    return filterRecursive(documentation.nodes);
  }, [docSearchQuery, documentation]);

  function handleContextMenu(e: React.MouseEvent, nodeId: string) {
    e.preventDefault();
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY });
  }

  return (
    <ErrorBoundary>
      <div className="docs-grid">
        <aside className="panel-section">
          <div className="section-heading-row">
            <p className="section-kicker">Documentation</p>
            <h2>{activeDirectoryPath}</h2>
          </div>
          <div className="field">
            <input
              onChange={(e) => setDocSearchQuery(e.target.value)}
              placeholder="Filter tree..."
              value={docSearchQuery}
            />
          </div>
          <div className="doc-tree">
            {filteredNodes.length ? (
              renderDocumentationTree(filteredNodes, onSelectNode, selectedDocumentationNode?.id ?? null, 0, handleContextMenu)
            ) : (
              <EmptyState title="No pages yet" message="Create the first page or directory for this project." />
            )}
          </div>
          <div className="stack-form">
            <form className="inline-input-row" onSubmit={onCreateDirectory}>
              <input onChange={(e) => onDirectoryNameChange(e.target.value)} placeholder="New directory" value={directoryName} />
              <button className="button button-secondary" type="submit">Add</button>
            </form>
            <form className="inline-input-row" onSubmit={onCreatePage}>
              <input onChange={(e) => onPageNameChange(e.target.value)} placeholder="New page" value={pageName} />
              <button className="button button-primary" type="submit">Add</button>
            </form>
          </div>
        </aside>

        <section className="panel-section">
          {selectedDocumentationNode ? (
            <form className="stack-form" onSubmit={onSave}>
              <div className="section-heading-row">
                <div>
                  <p className="section-kicker">{selectedDocumentationNode.kind === "page" ? "Markdown page" : "Directory"}</p>
                  <h2>{selectedDocumentationNode.path}</h2>
                </div>
                <div className="toolbar-actions">
                  {selectedPage ? (
                    <>
                      <button className="button button-secondary" onClick={() => setPreviewMode(!previewMode)} type="button">
                        {previewMode ? "Edit" : "Preview"}
                      </button>
                    </>
                  ) : null}
                  <button className="button button-danger" onClick={onDelete} type="button">Delete</button>
                </div>
              </div>
              <label className="field">
                <span>Name</span>
                <input onChange={(e) => onSelectedNameChange(e.target.value)} value={selectedDocumentationName} />
              </label>
              {selectedPage ? (
                previewMode ? (
                  <div className="field">
                    <span>Preview</span>
                    <div className="doc-preview">{renderSimpleMarkdown(selectedDocumentationContent)}</div>
                  </div>
                ) : (
                  <label className="field">
                    <span>Content</span>
                    <textarea
                      className="doc-editor"
                      onChange={(e) => onSelectedContentChange(e.target.value)}
                      placeholder="# Product vision"
                      value={selectedDocumentationContent}
                    />
                  </label>
                )
              ) : (
                <EmptyState title="Directory selected" message="Create child pages from the left panel or rename this directory here." />
              )}
              <div className="toolbar-actions">
                <button className="button button-primary" type="submit">Save</button>
              </div>
            </form>
          ) : (
            <EmptyState title="Select documentation" message="Choose a page or directory from the tree to start editing." />
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}

function renderSimpleMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(<pre key={`code-${index}`} className="md-code-block"><code>{codeLines.join("\n")}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      if (inList) { inList = false; }
      elements.push(<br key={`br-${index}`} />);
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) { inList = false; }
      elements.push(<h4 key={`h3-${index}`}>{line.slice(4)}</h4>); continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { inList = false; }
      elements.push(<h3 key={`h2-${index}`}>{line.slice(3)}</h3>); continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { inList = false; }
      elements.push(<h2 key={`h1-${index}`}>{line.slice(2)}</h2>); continue;
    }

    if (line.startsWith("- ")) {
      inList = true;
      elements.push(<li key={`li-${index}`} className="md-list-item">{line.slice(2)}</li>);
      continue;
    }

    if (line.startsWith("**") && line.endsWith("**")) {
      if (inList) { inList = false; }
      elements.push(<strong key={`bold-${index}`}>{line.slice(2, -2)}</strong>);
      continue;
    }

    if (line.startsWith("|")) {
      if (inList) { inList = false; }
      const cells = line.split("|").filter(Boolean);
      if (!elements.some((el) => el !== null && typeof el === "object" && "key" in el && String(el.key) === `table-start`)) {
        elements.push(<div key="table-start" />);
      }
      elements.push(
        <div key={`tr-${index}`} className="md-table-row">
          {cells.map((cell, ci) => <span className="md-table-cell" key={`${index}-${ci}`}>{cell.trim()}</span>)}
        </div>,
      );
      continue;
    }

    if (inList) { inList = false; }
    elements.push(<p key={`p-${index}`}>{line}</p>);
  }

  return <div className="md-preview-content">{elements}</div>;
}

function renderDocumentationTree(
  nodes: DocumentationNode[],
  onSelect: (nodeId: string | null) => void,
  selectedNodeId: string | null,
  depth = 0,
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void,
): ReactNode[] {
  return nodes.flatMap((node) => [
    <button
      className={`doc-tree-node${selectedNodeId === node.id ? " active" : ""}`}
      key={node.id}
      onClick={() => onSelect(node.id)}
      onContextMenu={(e) => onContextMenu?.(e, node.id)}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
      type="button"
    >
      <span className="doc-tree-bullet">{node.kind === "directory" ? "Dir" : "Page"}</span>
      <span>{node.name}</span>
    </button>,
    ...(node.kind === "directory" ? renderDocumentationTree(node.children, onSelect, selectedNodeId, depth + 1, onContextMenu) : []),
  ]);
}
