import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';

interface SecurityDetailsProps {
  request: NetworkRequest;
}

export function SecurityDetails({ request }: SecurityDetailsProps) {
  const analysis = request.analysis;

  if (!analysis?.security) {
    return <div className="text-muted-foreground italic">No security analysis available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Protocol Card */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50 relative overflow-hidden">
          <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
            Protocol
          </div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-bold">{analysis.security.protocol.version}</div>
            <div
              className={cn(
                'text-lg font-bold mb-0.5',
                analysis.security.protocol.grade === 'A+' ? 'text-green-500' : 'text-yellow-500',
              )}
            >
              {analysis.security.protocol.grade}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {analysis.security.protocol.details}
          </div>
        </div>

        {/* Certificate Card */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
            Certificate
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="font-bold truncate">{analysis.security.certificate.commonName}</div>
            {analysis.security.certificate.valid && (
              <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                Valid
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Expires in {analysis.security.certificate.daysRemaining} days
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 font-mono">
            {analysis.security.certificate.issuer.split(',')[0]}
          </div>
        </div>

        {/* Cipher Card */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
            Cipher Suite
          </div>
          <div className="font-bold text-sm truncate" title={analysis.security.cipher.suite}>
            {analysis.security.cipher.suite}
          </div>
          <div className="flex gap-2 mt-2">
            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground">
              {analysis.security.cipher.strength}
            </span>
            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground">
              FS: {analysis.security.cipher.supportsForwardSecrecy ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Security Headers */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-2">
          Security Headers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.security.securityHeaders).map(([key, header]: [string, any]) => (
            <div
              key={key}
              className="flex justify-between items-center p-3 rounded border border-border/40 hover:bg-muted/10 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-mono text-sm font-medium">
                  {key.replace(/([A-Z])/g, '-$1').toLowerCase()}
                </span>
                <span
                  className="text-[10px] text-muted-foreground truncate max-w-[200px]"
                  title={header.value || 'Missing'}
                >
                  {header.value || 'Not set'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded uppercase font-bold',
                    header.status === 'good'
                      ? 'bg-green-500/10 text-green-600'
                      : header.status === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-red-500/10 text-red-600',
                  )}
                >
                  {header.status}
                </span>
                {header.grade && (
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Grade: {header.grade}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
