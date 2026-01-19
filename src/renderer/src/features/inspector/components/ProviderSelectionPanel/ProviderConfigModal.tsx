// Provider Configuration Modal - Configure selected provider and fetch models

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { ProviderConfig, ModelInfo } from '../../types/provider-types';
import { ProviderRegistryEntry, ProviderFieldConfig } from './provider-configs';
import {
  fetchModels,
  validateProviderConfig,
  ProviderAPIError,
} from '../../../../services/provider-api';

interface ProviderConfigModalProps {
  isOpen: boolean;
  provider: ProviderRegistryEntry;
  onClose: () => void;
  onContinue: (config: ProviderConfig) => void;
}

export function ProviderConfigModal({
  isOpen,
  provider,
  onClose,
  onContinue,
}: ProviderConfigModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize form with default values
  useEffect(() => {
    if (isOpen) {
      const defaults: Record<string, any> = {};
      provider.fields.forEach((field) => {
        if (field.defaultValue) {
          defaults[field.name] = field.defaultValue;
        }
      });
      setFormData(defaults);
      setSelectedModel('');
      setModels([]);
      setError('');
      setValidationErrors([]);
    }
  }, [isOpen, provider]);

  // Auto-fetch models when required fields are filled
  useEffect(() => {
    if (!isOpen) return;

    const shouldFetchModels = () => {
      // Check if all required non-model fields are filled
      for (const field of provider.fields) {
        if (field.required && field.name !== 'model' && !formData[field.name]) {
          return false;
        }
      }
      return true;
    };

    if (shouldFetchModels() && provider.modelFetchStrategy !== 'manual') {
      handleFetchModels();
    }
  }, [formData, isOpen]);

  const handleFetchModels = async () => {
    setIsLoadingModels(true);
    setError('');

    try {
      const partialConfig: any = {
        type: provider.type,
        name: provider.name,
        ...formData,
      };

      const fetchedModels = await fetchModels(partialConfig);
      setModels(fetchedModels);

      // Auto-select first model if available
      if (fetchedModels.length > 0) {
        setSelectedModel(fetchedModels[0].id);
      }
    } catch (err) {
      if (err instanceof ProviderAPIError) {
        setError(err.message);
      } else {
        setError('Failed to fetch models. Please check your configuration.');
      }
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setError('');
    setValidationErrors([]);
  };

  const handleContinue = () => {
    const config: any = {
      type: provider.type,
      name: provider.name,
      model: selectedModel,
      ...formData,
    };

    const validation = validateProviderConfig(config);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    onContinue(config as ProviderConfig);
  };

  const renderField = (field: ProviderFieldConfig) => {
    const value = formData[field.name] || '';

    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          required={field.required}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        required={field.required}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <div>
            <h2 className="text-lg font-semibold">{provider.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Configuration Fields */}
          {provider.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Model
              <span className="text-red-500 ml-1">*</span>
            </label>

            {isLoadingModels ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading models...</span>
              </div>
            ) : models.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {model.provider_name && ` (${model.provider_name})`}
                  </option>
                ))}
              </select>
            ) : provider.modelFetchStrategy === 'manual' ? (
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="Enter model name (e.g., meta-llama/Llama-2-7b-hf)"
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                {error ? (
                  <div className="flex items-start gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : (
                  'Fill in the required fields to load models'
                )}
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-500">
                  <p className="font-medium mb-1">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* General Error */}
          {error && !isLoadingModels && models.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-600 dark:text-yellow-500">
                  <p className="font-medium">Unable to fetch models</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-background">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedModel || isLoadingModels}
            className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue to Chat
          </button>
        </div>
      </div>
    </div>
  );
}
