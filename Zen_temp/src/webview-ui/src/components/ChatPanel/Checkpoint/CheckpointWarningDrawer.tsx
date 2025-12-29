import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import FileIcon from "../../common/FileIcon";

interface FileNode {
  name: string;
  path: string; // Relative path
  type: "file" | "folder";
  size: number;
  children?: FileNode[];
}

interface CheckpointWarningDrawerProps {
  tree: FileNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const DrawerContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 350px;
  background: var(--vscode-editor-background);
  border-top: 1px solid var(--vscode-widget-border);
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
`;

const Header = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-widget-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--vscode-editorGroupHeader-tabsBackground);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  color: var(--vscode-editorError-foreground);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Content = styled.div`
  size: 100%;
  overflow-y: auto;
  padding: 10px;
  flex: 1;
`;

const Footer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--vscode-widget-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
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

const SizeLabel = styled.span<{ $brightness: number }>`
  margin-left: auto;
  font-size: 12px;
  font-family: monospace;
  /* Brightness based on size relative to 10MB threshold or max in tree */
  color: rgba(255, 255, 255, ${(props) => 0.3 + props.$brightness * 0.7});
  font-weight: ${(props) => (props.$brightness > 0.5 ? "bold" : "normal")};
`;

export const CheckpointWarningDrawer: React.FC<
  CheckpointWarningDrawerProps
> = ({ tree, onConfirm, onCancel }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([tree.path])
  );

  // Calculate max size for normalization (capped at 10MB for visualization scale)
  const MAX_REF_SIZE = 10 * 1024 * 1024; // 10MB

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FileNode) => {
    const isFolder = node.type === "folder";
    const isExpanded = expandedFolders.has(node.path);
    const relativeSize = Math.min(1, node.size / MAX_REF_SIZE);

    return (
      <NodeContainer key={node.path} $isFolder={isFolder}>
        <NodeRow
          onClick={isFolder ? (e) => toggleFolder(node.path, e) : undefined}
        >
          {isFolder && (
            <span
              style={{
                width: 16,
                display: "inline-block",
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.1s",
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
          <span style={{ fontSize: 13 }}>{node.name}</span>

          <SizeLabel $brightness={relativeSize}>
            {formatSize(node.size)}
          </SizeLabel>
        </NodeRow>

        {isFolder && isExpanded && node.children && (
          <div style={{ marginLeft: 8 }}>
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </NodeContainer>
    );
  };

  return (
    <DrawerContainer>
      <Header>
        <Title>
          <span className="codicon codicon-warning" />
          Checkpoint Size Alert ({formatSize(tree.size)})
        </Title>
      </Header>
      <Content>
        <div
          style={{
            paddingBottom: 10,
            fontSize: 13,
            color: "var(--vscode-descriptionForeground)",
          }}
        >
          Total size exceeds 10MB. Large files are highlighted brighter.
        </div>
        {renderNode(tree)}
      </Content>
      <Footer>
        <VSCodeButton appearance="secondary" onClick={onCancel}>
          Cancel
        </VSCodeButton>
        <VSCodeButton appearance="primary" onClick={onConfirm}>
          Proceed Anyway
        </VSCodeButton>
      </Footer>
    </DrawerContainer>
  );
};
