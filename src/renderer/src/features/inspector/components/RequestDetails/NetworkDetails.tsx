import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';
import { Activity, Globe, MapPin } from 'lucide-react';

interface NetworkDetailsProps {
  request: NetworkRequest;
}

export function NetworkDetails({ request }: NetworkDetailsProps) {
  const analysis = request.analysis;

  if (!analysis?.network) {
    return <div className="text-muted-foreground italic">No network analysis available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Connection Info */}
        <div className="p-2.5 bg-muted/20 rounded-lg border border-border/50">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> Connection
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">Protocol</span>
              <span className="font-mono">{analysis.network.connection.protocol}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">Remote Address</span>
              <span className="font-mono">
                {analysis.network.connection.remoteAddress}:{analysis.network.connection.remotePort}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">Local Address</span>
              <span className="font-mono">
                {analysis.network.connection.localAddress}:{analysis.network.connection.localPort}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connection Reused</span>
              <span
                className={cn(
                  'font-bold',
                  analysis.network.connection.connectionReused
                    ? 'text-green-500'
                    : 'text-muted-foreground',
                )}
              >
                {analysis.network.connection.connectionReused ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* DNS Info */}
        <div className="p-2.5 bg-muted/20 rounded-lg border border-border/50">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> DNS Resolution
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">Hostname</span>
              <span className="font-mono text-right truncate max-w-[150px]">
                {analysis.network.dns.hostname}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">DNS Server</span>
              <span className="font-mono">{analysis.network.dns.dnsServer}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-0.5">
              <span className="text-muted-foreground">Lookup Time</span>
              <span className="font-mono">{analysis.network.dns.lookupTime}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">Resolved IPs</span>
              <div className="flex flex-wrap gap-1">
                {analysis.network.dns.resolvedIPs.map((ip, i) => (
                  <span
                    key={i}
                    className="bg-background border border-border/50 px-1.5 py-0.5 rounded font-mono text-[10px]"
                  >
                    {ip.ip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Geolocation */}
        <div className="p-2.5 bg-muted/20 rounded-lg border border-border/50 md:col-span-2">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Geolocation
          </h3>
          {analysis.network.geolocation ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5 text-[10px]">Country</div>
                <div className="font-medium flex items-center gap-1.5">
                  <span className="text-base">
                    {analysis.network.geolocation.countryCode === 'US' ? '🇺🇸' : '🏳️'}
                  </span>
                  {analysis.network.geolocation.country}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5 text-[10px]">City</div>
                <div className="font-medium">
                  {analysis.network.geolocation.city}, {analysis.network.geolocation.region}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5 text-[10px]">ISP</div>
                <div className="font-medium truncate" title={analysis.network.geolocation.isp}>
                  {analysis.network.geolocation.isp}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5 text-[10px]">Timezone</div>
                <div className="font-mono">{analysis.network.geolocation.timezone}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground italic text-xs">
              Geolocation data not available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
