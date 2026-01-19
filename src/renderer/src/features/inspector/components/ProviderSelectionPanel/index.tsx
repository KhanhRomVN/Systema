// Provider Selection Panel - Main UI for selecting AI providers

import { useState, useMemo } from 'react';
import { Search, X, Sparkles, Zap, Server, Building2 } from 'lucide-react';
import { ProviderConfig } from '../../types/provider-types';
import { getAllProviders, ProviderRegistryEntry } from './provider-configs';
import { ProviderConfigModal } from './ProviderConfigModal';
import { cn } from '../../../../shared/lib/utils';

interface ProviderSelectionPanelProps {
  onProviderConfigured: (config: ProviderConfig) => void;
  onBack?: () => void;
}

type CategoryFilter = 'all' | 'free' | 'paid' | 'self-hosted' | 'enterprise';

export function ProviderSelectionPanel({
  onProviderConfigured,
  onBack,
}: ProviderSelectionPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedProvider, setSelectedProvider] = useState<ProviderRegistryEntry | null>(null);

  const allProviders = useMemo(() => getAllProviders(), []);

  const filteredProviders = useMemo(() => {
    return allProviders.filter((provider) => {
      // Category filter
      if (categoryFilter !== 'all' && provider.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          provider.name.toLowerCase().includes(query) ||
          provider.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allProviders, searchQuery, categoryFilter]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'free':
        return <Sparkles className="w-4 h-4" />;
      case 'paid':
        return <Zap className="w-4 h-4" />;
      case 'self-hosted':
        return <Server className="w-4 h-4" />;
      case 'enterprise':
        return <Building2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'free':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paid':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'self-hosted':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'enterprise':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Select AI Provider</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose from {allProviders.length}+ AI providers
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded transition-colors"
              title="Back"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search providers..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {(['all', 'free', 'paid', 'self-hosted', 'enterprise'] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
                categoryFilter === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {cat !== 'all' && getCategoryIcon(cat)}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Provider List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredProviders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No providers found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProviders.map((provider) => (
              <button
                key={provider.type}
                onClick={() => setSelectedProvider(provider)}
                className="group flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-blue-500 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Provider Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm group-hover:text-blue-500 transition-colors truncate">
                        {provider.name}
                      </h3>
                      <div
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 shrink-0',
                          getCategoryColor(provider.category),
                        )}
                      >
                        {getCategoryIcon(provider.category)}
                        <span className="capitalize">{provider.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0 ml-4">
                  {provider.supportsStreaming && (
                    <span className="px-1.5 py-0.5 bg-muted rounded hidden sm:inline-block">
                      Streaming
                    </span>
                  )}
                  {provider.requiresApiKey && (
                    <span className="px-1.5 py-0.5 bg-muted rounded hidden sm:inline-block">
                      Key
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 bg-muted rounded capitalize hidden sm:inline-block">
                    {provider.modelFetchStrategy}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Provider Config Modal */}
      {selectedProvider && (
        <ProviderConfigModal
          isOpen={!!selectedProvider}
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onContinue={(config) => {
            setSelectedProvider(null);
            onProviderConfigured(config);
          }}
        />
      )}
    </div>
  );
}
