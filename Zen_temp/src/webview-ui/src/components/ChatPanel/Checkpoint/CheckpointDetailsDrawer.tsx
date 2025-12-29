import React, { useState } from "react";
import styled from "styled-components";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import FileIcon from "../../common/FileIcon";

interface FileNode {
  name: string;
  path: string; // Relative path
  type: "file" | "folder";
  size: number;
  status?: "added" | "modified" | "deleted" | "unchanged";
  additions?: number;
  deletions?: number;
  children?: FileNode[];
}

interface CheckpointDetailsDrawerProps {
  tree: FileNode; // We might need to construct this from the flat file list in checkpointData
  isOpen: boolean;
  onClose: () => void;
  checkpointId: string;
  totalSize: number;
}

const DrawerContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 400px; /* Increased height for better view */
  background: var(--vscode-editor-background);
  border-top: 1px solid var(--vscode-widget-border);
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transform: translateY(${(props) => (props.$isOpen ? "0" : "100%")});
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
`;

const Header = styled.div`
  padding: 8px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vscode-editorGroupHeader-tabsBackground);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 13px;
  color: var(--vscode-foreground);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`;

const Content = styled.div`
  size: 100%;
  overflow-y: auto;
  padding: 10px;
  flex: 1;
`;

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const NodeContainer = styled.div<{ $isFolder: boolean }>`
  display: flex;
  flex-direction: column;
  margin-left: 12px;
`;

const NodeRow = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: var(--vscode-list-hoverBackground);
  }
`;

// Helper to determine color based on size
const getSizeColor = (size: number, max: number) => {
  const ratio = Math.min(size / max, 1);
  // Interpolate from text color (low) to warning/error color (high)
  // Simple logic: < 10KB: standard, > 1MB: bright
  if (size > 1024 * 1024) return "var(--vscode-editorError-foreground)";
  if (size > 100 * 1024) return "var(--vscode-editorWarning-foreground)";
  return "var(--vscode-descriptionForeground)";
};

const SizeLabel = styled.span<{ $size: number }>`
  margin-left: auto;
  font-size: 11px;
  font-family: monospace;
  color: ${(props) =>
    getSizeColor(props.$size, 1024 * 1024 * 10)}; /* Max ref 10MB */
`;

export const CheckpointDetailsDrawer: React.FC<
  CheckpointDetailsDrawerProps
> = ({ tree, isOpen, onClose, checkpointId, totalSize }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([tree.path])
  );

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleFileClick = (path: string) => {
    // Send message to open file
    window.postMessage(
      {
        command: "openFile",
        path: path,
      },
      "*"
    );
  };

  const renderNode = (node: FileNode) => {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders.has(node.path);

    // Diff label generator
    const renderDiff = () => {
      if (!node.status || node.status === "unchanged") return null;

      const add = node.additions || 0;
      const del = node.deletions || 0;

      if (node.status === "added") {
        return (
          <span
            style={{
              color: "var(--vscode-gitDecoration-addedResourceForeground)",
              fontSize: "11px",
              marginLeft: 6,
            }}
          >
            {add}+ 0-
          </span>
        );
      }
      if (node.status === "deleted") {
        return (
          <span
            style={{
              color: "var(--vscode-gitDecoration-deletedResourceForeground)",
              fontSize: "11px",
              marginLeft: 6,
            }}
          >
            0+ {del}-
          </span>
        );
      }
      if (node.status === "modified") {
        return (
          <span style={{ fontSize: "11px", marginLeft: 6 }}>
            <span
              style={{
                color: "var(--vscode-gitDecoration-addedResourceForeground)",
              }}
            >
              {add}+
            </span>{" "}
            <span
              style={{
                color: "var(--vscode-gitDecoration-deletedResourceForeground)",
              }}
            >
              {del}-
            </span>
          </span>
        );
      }
      return null;
    };

    return (
      <NodeContainer key={node.path} $isFolder={isFolder}>
        <NodeRow
          onClick={(e) => {
            if (isFolder) toggleFolder(node.path, e);
            else handleFileClick(node.path);
          }}
        >
          {/* ... indent and icon ... */}
          {isFolder && (
            <span
              style={{
                width: 16,
                display: "inline-block",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.1s",
                fontSize: "10px",
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              ▶
            </span>
          )}
          {!isFolder && <span style={{ width: 16 }} />}

          <FileIcon
            path={node.name}
            isFolder={isFolder}
            isOpen={isExpanded}
            style={{ width: 16, height: 16, marginRight: 6 }}
          />
          <span
            style={{
              fontSize: 13,
              color:
                node.status === "added"
                  ? "var(--vscode-gitDecoration-addedResourceForeground)"
                  : node.status === "modified"
                  ? "var(--vscode-gitDecoration-modifiedResourceForeground)"
                  : node.status === "deleted"
                  ? "var(--vscode-gitDecoration-deletedResourceForeground)"
                  : "var(--vscode-foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {node.status === "added" && "+"}
            {node.status === "modified" && "~"}
            {node.status === "deleted" && "-"}
            {node.name}
          </span>

          {renderDiff()}

          <SizeLabel $size={node.size}>{formatSize(node.size)}</SizeLabel>
        </NodeRow>

        {isFolder && isExpanded && node.children && (
          <div
            style={{
              marginLeft: 8,
              borderLeft: "1px solid var(--vscode-tree-indentGuidesStroke)",
            }}
          >
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </NodeContainer>
    );
  };

  if (!isOpen) return null;

  return (
    <DrawerContainer $isOpen={isOpen}>
      <Header>
        <Title>
          <span className="codicon codicon-history" />
          Checkpoint Details ({formatSize(totalSize)})
        </Title>
        <VSCodeButton appearance="icon" onClick={onClose}>
          <span className="codicon codicon-close" />
        </VSCodeButton>
      </Header>
      <Content>
        {tree ? (
          renderNode(tree)
        ) : (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "var(--vscode-descriptionForeground)",
            }}
          >
            No file data available
          </div>
        )}
      </Content>
    </DrawerContainer>
  );
};
