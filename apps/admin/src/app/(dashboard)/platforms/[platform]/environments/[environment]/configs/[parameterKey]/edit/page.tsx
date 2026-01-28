"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import {
  getConfigParameterApi,
  updateConfigParameterApi,
} from "@/lib/api/configs";
import type { ConfigParameter, ConfigValueType } from "@/lib/api/types";
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
} from "@togglebox/ui";

interface EditConfigPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    parameterKey: string;
  }>;
}

export default function EditConfigPage({ params }: EditConfigPageProps) {
  const { platform, environment, parameterKey } = use(params);
  const router = useRouter();

  const [config, setConfig] = useState<ConfigParameter | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields
  const [defaultValue, setDefaultValue] = useState("");
  const [description, setDescription] = useState("");
  const [parameterGroup, setParameterGroup] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      const data = await getConfigParameterApi(
        platform,
        environment,
        parameterKey,
      );
      setConfig(data);
      setDefaultValue(data.defaultValue);
      setDescription(data.description || "");
      setParameterGroup(data.parameterGroup || "");
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load config parameter",
      );
    } finally {
      setIsLoadingConfig(false);
    }
  }, [platform, environment, parameterKey]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Live JSON validation
  const handleJsonChange = (value: string) => {
    setDefaultValue(value);
    if (config?.valueType === "json" && value.trim()) {
      try {
        JSON.parse(value);
        setJsonError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Invalid JSON";
        setJsonError(message);
      }
    } else {
      setJsonError(null);
    }
  };

  // Validate value based on type
  const validateValue = (type: ConfigValueType, value: string): boolean => {
    switch (type) {
      case "number":
        return !isNaN(Number(value)) && value.trim() !== "";
      case "boolean":
        return value === "true" || value === "false";
      case "json":
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      case "string":
      default:
        return true;
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!config) return;

    // Validate value based on type
    if (!validateValue(config.valueType, defaultValue)) {
      setError(`Invalid value for type "${config.valueType}"`);
      return;
    }

    setIsLoading(true);

    try {
      await updateConfigParameterApi(platform, environment, parameterKey, {
        defaultValue,
        description: description.trim() || null,
        parameterGroup: parameterGroup.trim() || null,
      });

      router.push(`/configs?platform=${platform}&environment=${environment}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to get placeholder based on type
  const getPlaceholder = (type: ConfigValueType): string => {
    switch (type) {
      case "string":
        return "e.g., Hello World";
      case "number":
        return "e.g., 42 or 3.14";
      case "boolean":
        return "true or false";
      case "json":
        return '{"key": "value"}';
    }
  };

  if (isLoadingConfig) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Config Parameter</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Edit Config Parameter</h1>
          <p className="text-muted-foreground">
            {platform} / {environment}
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading config parameter
            </div>
            <p className="text-muted-foreground mb-4">
              {loadError || "Config parameter not found"}
            </p>
            <Link
              href={`/configs?platform=${platform}&environment=${environment}`}
            >
              <Button variant="outline">Back to Configs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/configs?platform=${platform}&environment=${environment}`}
              className="text-muted-foreground hover:text-foreground text-sm mb-4 inline-block"
            >
              &larr; Back to configs
            </Link>
            <h1 className="text-4xl font-black mb-2">Edit Config Parameter</h1>
            <p className="text-muted-foreground">
              {platform} / {environment} / {parameterKey}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parameter Identity (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Parameter Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parameter Key (immutable)</Label>
                <Input
                  value={config.parameterKey}
                  disabled
                  className="bg-muted font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Value Type (immutable)</Label>
                <Input value={config.valueType} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Version</Label>
                <Input
                  value={`v${config.version}`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input
                  value={config.isActive ? "Active" : "Inactive"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Parameter Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value *</Label>
              {config.valueType === "boolean" ? (
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
              ) : config.valueType === "json" ? (
                <>
                  <Textarea
                    id="defaultValue"
                    value={defaultValue}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={getPlaceholder(config.valueType)}
                    disabled={isLoading}
                    required
                    rows={6}
                    className={`font-mono text-sm ${jsonError ? "border-destructive focus:ring-destructive" : ""}`}
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
                  placeholder={getPlaceholder(config.valueType)}
                  required
                  disabled={isLoading}
                  className={config.valueType === "number" ? "font-mono" : ""}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Updating this will create a new version (v{config.version + 1})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Error */}
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/configs?platform=${platform}&environment=${environment}`}
          >
            <Button type="button" variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading || (config.valueType === "json" && !!jsonError)}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
