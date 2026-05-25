import { NetworkRequest } from '../../../../../types/inspector';
import { CollectionsPanel } from './CollectionsPanel';

interface ComposerManagerProps {
  onSelectRequest?: (request: NetworkRequest) => void;
  appId: string;
  requests?: NetworkRequest[];
}

export function ComposerManager({
  onSelectRequest,
  appId,
  requests = [],
}: ComposerManagerProps) {
  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      <CollectionsPanel
        onSelectRequest={onSelectRequest}
        appId={appId}
        requests={requests}
      />
    </div>
  );
}