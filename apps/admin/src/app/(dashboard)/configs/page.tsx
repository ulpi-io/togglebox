"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  listConfigParametersApi,
  getAllConfigsApi,
  deleteConfigParameterApi,
} from "@/lib/api/configs";
import { getCurrentUserApi } from "@/lib/api/auth";
import type { ConfigParameter, User } from "@/lib/api/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  FilterTabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@togglebox/ui";
import { ConfigParameterHistory } from "@/components/configs/config-parameter-history";
import { DeleteConfigParameterButton } from "@/components/configs/delete-config-parameter-button";
import { CreateEntityButton } from "@/components/common/create-entity-button";
import {
  PlatformEnvFilter,
  usePlatformEnvFilter,
} from "@/components/filters/platform-env-filter";

type ConfigFilter = "all" | "active" | "inactive";

/**
 * Parse and display config value based on type.
 */
function formatConfigValue(valueType: string, defaultValue: string): string {
  if (valueType === "json") {
    try {
      const parsed = JSON.parse(defaultValue);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function ConfigsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [parameters, setParameters] = useState<ConfigParameter[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConfigFilter>("active");

  const isAdmin = user?.role === "admin";

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }, []);

  const loadParameters = useCallback(async () => {
    try {
      setIsLoading(true);
      if (platform && environment) {
        // Both platform and environment selected - use specific API
        const data = await listConfigParametersApi(platform, environment);
        setParameters(data);
      } else {
        // Load all config parameters, then filter by platform if specified
        const data = await getAllConfigsApi();
        if (platform) {
          // Filter by platform only (no environment selected yet)
          setParameters(data.filter((p) => p.platform === platform));
        } else {
          setParameters(data);
        }
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load config parameters",
      );
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  useEffect(() => {
    loadParameters();
    loadUser();
  }, [loadParameters, loadUser]);

  // Get only active (latest) versions for display - one per parameterKey
  const activeParameters = useMemo(() => {
    const activeMap = new Map<string, ConfigParameter>();
    for (const param of parameters) {
      if (param.isActive) {
        const key = `${param.platform}:${param.environment}:${param.parameterKey}`;
        activeMap.set(key, param);
      }
    }
    return Array.from(activeMap.values());
  }, [parameters]);

  // Filter logic
  const activeCount = useMemo(
    () => activeParameters.length,
    [activeParameters],
  );

  const filteredParameters = useMemo(() => {
    if (filter === "active") return activeParameters;
    if (filter === "all") return parameters;
    if (filter === "inactive") return parameters.filter((p) => !p.isActive);
    return activeParameters; // Default to showing only active parameters
  }, [activeParameters, parameters, filter]);

  const filterOptions = [
    { value: "active" as const, label: "Active", count: activeCount },
    { value: "all" as const, label: "All Versions", count: parameters.length },
  ];

  // Group parameters by parameterGroup
  const groupedParameters = useMemo(() => {
    const groups = new Map<string, ConfigParameter[]>();
    for (const param of filteredParameters) {
      const groupName = param.parameterGroup || "Ungrouped";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(param);
    }
    return groups;
  }, [filteredParameters]);

  const hasSelection = platform && environment;

  // All configs view (when no filter is selected)
  if (!hasSelection) {
    return (
      <div className="space-y-6">
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-destructive text-lg font-bold mb-2">
                Error loading config parameters
              </div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={loadParameters}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && activeParameters.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-xl font-black mb-2">
                No Config Parameters Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first config parameter (Firebase-style individual
                parameters)
              </p>
              <CreateEntityButton entityType="configs" />
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && activeParameters.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black">
                  All Config Parameters
                </CardTitle>
                <div className="flex items-center gap-4">
                  <FilterTabs
                    options={filterOptions}
                    value={filter}
                    onChange={setFilter}
                  />
                  <CreateEntityButton entityType="configs" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Parameter Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParameters.map((param) => (
                    <TableRow
                      key={`${param.platform}-${param.environment}-${param.parameterKey}-${param.version}`}
                    >
                      <TableCell className="font-semibold">
                        {param.platform}
                      </TableCell>
                      <TableCell>{param.environment}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {param.parameterKey}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" size="sm">
                          {param.valueType}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs max-w-48 truncate"
                        title={param.defaultValue}
                      >
                        {param.defaultValue.length > 50
                          ? `${param.defaultValue.substring(0, 50)}...`
                          : param.defaultValue}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={param.isActive ? "default" : "secondary"}
                          size="sm"
                        >
                          v{param.version}
                          {param.isActive && " (active)"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <ConfigParameterHistory
                            platform={param.platform}
                            environment={param.environment}
                            parameterKey={param.parameterKey}
                            currentVersion={param.version}
                            onVersionChange={loadParameters}
                          />
                          {isAdmin && (
                            <DeleteConfigParameterButton
                              platform={param.platform}
                              environment={param.environment}
                              parameterKey={param.parameterKey}
                              onSuccess={loadParameters}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Environment-specific view
  return (
    <div className="space-y-6">
      {isLoading && (
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-32 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading config parameters
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadParameters}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && activeParameters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h3 className="text-xl font-black mb-2">
              No Config Parameters Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first config parameter for {environment}
            </p>
            <Link
              href={`/configs/create?platform=${platform}&environment=${environment}`}
            >
              <Button>Create Parameter</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && activeParameters.length > 0 && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-black">
                    {activeParameters.length} Parameter
                    {activeParameters.length !== 1 ? "s" : ""}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Firebase-style individual config parameters for {platform} /{" "}
                    {environment}
                  </p>
                </div>
                <Link
                  href={`/configs/create?platform=${platform}&environment=${environment}`}
                >
                  <Button>Create Parameter</Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          {/* Parameters by Group */}
          {Array.from(groupedParameters.entries()).map(
            ([groupName, groupParams]) => (
              <Card key={groupName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black">
                      {groupName}
                    </CardTitle>
                    <Badge variant="secondary" size="sm">
                      {groupParams.length} parameter
                      {groupParams.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter Key</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupParams.map((param) => (
                        <TableRow key={param.parameterKey}>
                          <TableCell className="font-mono text-sm font-semibold">
                            {param.parameterKey}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" size="sm">
                              {param.valueType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-64">
                            {param.valueType === "json" ? (
                              <pre className="whitespace-pre-wrap overflow-x-auto max-h-20 overflow-y-auto">
                                {formatConfigValue(
                                  param.valueType,
                                  param.defaultValue,
                                )}
                              </pre>
                            ) : (
                              <span title={param.defaultValue}>
                                {param.defaultValue.length > 60
                                  ? `${param.defaultValue.substring(0, 60)}...`
                                  : param.defaultValue}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" size="sm">
                              v{param.version}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-48 truncate">
                            {param.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <ConfigParameterHistory
                                platform={param.platform}
                                environment={param.environment}
                                parameterKey={param.parameterKey}
                                currentVersion={param.version}
                                onVersionChange={loadParameters}
                              />
                              {isAdmin && (
                                <DeleteConfigParameterButton
                                  platform={param.platform}
                                  environment={param.environment}
                                  parameterKey={param.parameterKey}
                                  onSuccess={loadParameters}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ),
          )}
        </>
      )}
    </div>
  );
}

export default function ConfigsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Remote Configs</h1>
        <p className="text-muted-foreground">
          Firebase-style individual config parameters with per-parameter
          versioning
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformEnvFilter />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading configs...</div>}>
        <ConfigsContent />
      </Suspense>
    </div>
  );
}
