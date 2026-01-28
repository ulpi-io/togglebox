'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createConfigParameterApi } from '@/lib/api/configs';
import { getPlatformsApi, getEnvironmentsApi } from '@/lib/api/platforms';
import type { Platform, Environment, ConfigValueType } from '@/lib/api/types';
import {
  Button,
  Input,
  Label,
  Select,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@togglebox/ui';

const VALUE_TYPES: { value: ConfigValueType; label: string; description: string }[] = [
  { value: 'string', label: 'String', description: 'Text value' },
  { value: 'number', label: 'Number', description: 'Numeric value (integer or decimal)' },
  { value: 'boolean', label: 'Boolean', description: 'true or false' },
  { value: 'json', label: 'JSON', description: 'Complex object or array' },
];

export default function CreateConfigParameterPage() {
  const router = useRouter();

  // Platform/Environment selection
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);

  // Load platforms on mount
  useEffect(() => {
    setLoadingPlatforms(true);
    getPlatformsApi()
      .then(setPlatforms)
      .catch(console.error)
      .finally(() => setLoadingPlatforms(false));
  }, []);

  // Load environments when platform changes
  useEffect(() => {
    if (selectedPlatform) {
      setLoadingEnvironments(true);
      setSelectedEnvironment('');
      getEnvironmentsApi(selectedPlatform)
        .then(setEnvironments)
        .catch(console.error)
        .finally(() => setLoadingEnvironments(false));
    }
  }, [selectedPlatform]);

  const platform = selectedPlatform;
  const environment = selectedEnvironment;

  // Form fields
  const [parameterKey, setParameterKey] = useState('');
  const [valueType, setValueType] = useState<ConfigValueType>('string');
  const [defaultValue, setDefaultValue] = useState('');
  const [description, setDescription] = useState('');
  const [parameterGroup, setParameterGroup] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Validate value based on type
  const validateValue = (type: ConfigValueType, value: string): boolean => {
    switch (type) {
      case 'number':
        return !isNaN(Number(value)) && value.trim() !== '';
      case 'boolean':
        return value === 'true' || value === 'false';
      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      case 'string':
      default:
        return true;
    }
  };

  // Live JSON validation
  const handleJsonChange = (value: string) => {
    setDefaultValue(value);
    if (value.trim()) {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid JSON';
        setJsonError(message);
      }
    } else {
      setJsonError(null);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate parameter key
    if (!parameterKey?.trim()) {
      setError('Parameter key is required');
      setIsLoading(false);
      return;
    }

    // Validate key format (alphanumeric, dashes, underscores, dots)
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(parameterKey.trim())) {
      setError('Parameter key must start with a letter and contain only letters, numbers, underscores, dashes, and dots');
      setIsLoading(false);
      return;
    }

    // Validate value based on type
    if (!validateValue(valueType, defaultValue)) {
      setError(`Invalid value for type "${valueType}"`);
      setIsLoading(false);
      return;
    }

    try {
      await createConfigParameterApi(
        platform,
        environment,
        parameterKey.trim(),
        valueType,
        defaultValue,
        {
          description: description.trim() || undefined,
          parameterGroup: parameterGroup.trim() || undefined,
        }
      );
      router.push(`/configs?platform=${platform}&environment=${environment}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to get placeholder based on type
  const getPlaceholder = (type: ConfigValueType): string => {
    switch (type) {
      case 'string':
        return 'e.g., Hello World';
      case 'number':
        return 'e.g., 42 or 3.14';
      case 'boolean':
        return 'true or false';
      case 'json':
        return '{"key": "value"}';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/configs"
              className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block"
            >
              &larr; Back to configs
            </Link>
            <h1 className="text-4xl font-black mb-2">Create Config Parameter</h1>
            <p className="text-muted-foreground">
              {platform && environment
                ? `Add a new Firebase-style config parameter for ${platform} / ${environment}`
                : 'Add a new Firebase-style config parameter'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  id="platform"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  disabled={isLoading || loadingPlatforms}
                  required
                >
                  <option value="">
                    {loadingPlatforms ? 'Loading...' : 'Select platform'}
                  </option>
                  {platforms.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="environment">Environment *</Label>
                <Select
                  id="environment"
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  disabled={isLoading || loadingEnvironments || !selectedPlatform}
                  required
                >
                  <option value="">
                    {loadingEnvironments ? 'Loading...' : selectedPlatform ? 'Select environment' : 'Select platform first'}
                  </option>
                  {environments.map((env) => (
                    <option key={env.environment} value={env.environment}>
                      {env.environment}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parameter Details */}
        <Card>
          <CardHeader>
            <CardTitle>Parameter Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parameterKey">Parameter Key *</Label>
                <Input
                  id="parameterKey"
                  value={parameterKey}
                  onChange={(e) => setParameterKey(e.target.value)}
                  placeholder="e.g., app.feature.enabled"
                  required
                  disabled={isLoading}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unique key for this parameter. Use dot notation for organization.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parameterGroup">Parameter Group (optional)</Label>
                <Input
                  id="parameterGroup"
                  value={parameterGroup}
                  onChange={(e) => setParameterGroup(e.target.value)}
                  placeholder="e.g., Feature Settings"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Group related parameters together in the UI
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this parameter controls..."
                disabled={isLoading}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Value Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Value Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="valueType">Value Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {VALUE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setValueType(type.value);
                      setJsonError(null); // Clear JSON error when switching types
                      // Clear value when type changes to avoid validation issues
                      if (type.value === 'boolean') {
                        setDefaultValue('false');
                      } else if (type.value === 'json') {
                        setDefaultValue('{}');
                      } else {
                        setDefaultValue('');
                      }
                    }}
                    disabled={isLoading}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      valueType === type.value
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 hover:border-black/40'
                    }`}
                  >
                    <div className="font-bold text-sm">{type.label}</div>
                    <div className={`text-xs ${valueType === type.value ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {type.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value *</Label>
              {valueType === 'boolean' ? (
                <Select
                  id="defaultValue"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  disabled={isLoading}
                  required
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </Select>
              ) : valueType === 'json' ? (
                <>
                  <Textarea
                    id="defaultValue"
                    value={defaultValue}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={getPlaceholder(valueType)}
                    disabled={isLoading}
                    required
                    rows={4}
                    className={`font-mono text-sm ${jsonError ? 'border-destructive focus:ring-destructive' : ''}`}
                  />
                  {jsonError && (
                    <p className="text-xs text-destructive mt-1">{jsonError}</p>
                  )}
                </>
              ) : (
                <Input
                  id="defaultValue"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder={getPlaceholder(valueType)}
                  required
                  disabled={isLoading}
                  type={valueType === 'number' ? 'text' : 'text'}
                  className={valueType === 'number' ? 'font-mono' : ''}
                />
              )}
              <p className="text-xs text-muted-foreground">
                The value that will be returned to clients via the SDK
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/configs">
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading || !platform || !environment || (valueType === 'json' && !!jsonError)}>
            {isLoading ? 'Creating...' : 'Create Parameter'}
          </Button>
        </div>
      </form>
    </div>
  );
}
