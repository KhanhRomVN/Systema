import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';

interface CertDetailsProps {
  request: NetworkRequest;
}

export function CertDetails({ request }: CertDetailsProps) {
  const analysis = request.analysis;

  if (!analysis?.certificateChain) {
    return <div className="text-muted-foreground italic">No certificate chain available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative border-l-2 border-border/50 ml-3 space-y-8 py-2">
        {analysis.certificateChain.certificates.map((cert, i) => (
          <div key={i} className="relative pl-6">
            {/* Timeline dot */}
            <div
              className={cn(
                'absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-background',
                i === 0
                  ? 'bg-green-500'
                  : i === analysis.certificateChain!.certificates.length - 1
                    ? 'bg-primary'
                    : 'bg-muted-foreground',
              )}
            />

            <div className="bg-muted/10 p-4 rounded-lg border border-border/50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                    {cert.level}
                  </div>
                  <div className="font-bold text-base">{cert.subject.commonName}</div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      cert.validity.isValid
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-red-500/10 text-red-600',
                    )}
                  >
                    {cert.validity.isValid ? 'Valid' : 'Expired'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-3 border-t border-border/30">
                <div>
                  <span className="text-muted-foreground block mb-1">Issuer</span>
                  <span className="font-mono">{cert.issuer.commonName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Valid Until</span>
                  <span className="font-mono">
                    {new Date(cert.validity.notAfter).toLocaleDateString()}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Fingerprint (SHA256)</span>
                  <span className="font-mono text-[10px] break-all text-muted-foreground/80">
                    {cert.fingerprint.sha256}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
