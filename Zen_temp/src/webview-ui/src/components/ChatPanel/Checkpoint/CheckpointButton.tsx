import React from "react";
import styled from "styled-components";

interface CheckpointStats {
  added: number;
  modified: number;
  deleted: number;
}

interface CheckpointButtonProps {
  index: number;
  totalFiles: number;
  totalSize: number;
  storageSize?: number;
  timestamp: number;
  stats?: CheckpointStats;
  onRevert: () => void;
  onViewDetails?: () => void;
}

const formatSizePretty = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(2) + " KB";
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 6px;
  font-family: var(--vscode-font-family);
  user-select: none;
  transition: all 0.2s;

  &:hover {
    border-color: var(--vscode-focusBorder);
  }
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Badge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
`;

const SizeInfo = styled.span`
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 6px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid var(--vscode-widget-border);
`;

const StatItem = styled.span<{ color: string }>`
  font-size: 11px;
  color: ${(props) => props.color};
  display: flex;
  align-items: center;
  gap: 2px;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ActionButton = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  color: var(--vscode-foreground);
  opacity: 0.7;
  transition: all 0.2s;

  &:hover {
    opacity: 1;
    background: var(--vscode-toolbar-hoverBackground);
    color: var(--vscode-textLink-foreground);
  }
`;

export const CheckpointButton: React.FC<CheckpointButtonProps> = ({
  index,
  totalFiles,
  totalSize,
  storageSize,
  timestamp,
  stats,
  onRevert,
  onViewDetails,
}) => {
  // Determine what to show
  // If index is 1 (Begin Checkpoint) or no stats, show Total Files
  // Else show diff stats

  const isBeginCheckpoint = index === 1;

  return (
    <Container>
      <Left>
        <Badge>Checkpoint #{index}</Badge>

        {isBeginCheckpoint || !stats ? (
          <StatItem color="var(--vscode-descriptionForeground)">
            {totalFiles} files
          </StatItem>
        ) : (
          <StatsContainer>
            {stats.added > 0 && (
              <StatItem
                color="var(--vscode-gitDecoration-addedResourceForeground)"
                title="Added"
              >
                +{stats.added} files
              </StatItem>
            )}
            {stats.modified > 0 && (
              <StatItem
                color="var(--vscode-gitDecoration-modifiedResourceForeground)"
                title="Modified"
              >
                ~{stats.modified} files
              </StatItem>
            )}
            {stats.deleted > 0 && (
              <StatItem
                color="var(--vscode-gitDecoration-deletedResourceForeground)"
                title="Deleted"
              >
                -{stats.deleted} files
              </StatItem>
            )}
            {/* Fallback if all 0 but not begin checkpoint? Should be rare */}
            {stats.added === 0 &&
              stats.modified === 0 &&
              stats.deleted === 0 && (
                <StatItem color="var(--vscode-descriptionForeground)">
                  No changes
                </StatItem>
              )}
          </StatsContainer>
        )}

        <SizeInfo>
          (
          {formatSizePretty(
            storageSize !== undefined ? storageSize : totalSize
          )}
          )
        </SizeInfo>
      </Left>
      <Right>
        <ActionButton title="View Details" onClick={onViewDetails}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3C4.5 3 1.5 5.5 1.5 8C1.5 10.5 4.5 13 8 13C11.5 13 14.5 10.5 14.5 8C14.5 5.5 11.5 3 8 3ZM8 11.5C6.1 11.5 4.5 9.9 4.5 8C4.5 6.1 6.1 4.5 8 4.5C9.9 4.5 11.5 6.1 11.5 8C11.5 9.9 9.9 11.5 8 11.5ZM8 6.5C7.2 6.5 6.5 7.2 6.5 8C6.5 8.8 7.2 9.5 8 9.5C8.8 9.5 9.5 8.8 9.5 8C9.5 7.2 8.8 6.5 8 6.5Z" />
          </svg>
        </ActionButton>
        <ActionButton title="Revert to this checkpoint" onClick={onRevert}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.5 8C13.5 11 11 13.5 8 13.5C5 13.5 2.5 11 2.5 8C2.5 5 5 2.5 8 2.5L8.5 2.5L7 1L8 0L11 3L8 6L7 5L8.5 3.5L8 3.5C5.5 3.5 3.5 5.5 3.5 8C3.5 10.5 5.5 12.5 8 12.5C10.5 12.5 12.5 10.5 12.5 8H13.5Z" />
          </svg>
        </ActionButton>
      </Right>
    </Container>
  );
};
