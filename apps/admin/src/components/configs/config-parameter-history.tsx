'use client';

import { useState, useEffect, useCallback } from 'react';
import { listConfigParameterVersionsApi, rollbackConfigParameterApi, deleteConfigParameterApi } from '@/lib/api/configs';
import type { ConfigParameter } from '@/lib/api/types';
import { Badge, Button, Spinner } from '@togglebox/ui';

interface ConfigParameterHistoryProps {
  platform: string;
  environment: string;
  parameterKey: string;
  currentVersion: string;
  onVersionChange?: () => void;
}

/**
 * Display version history for a single config parameter.
 * Firebase-style: Each parameter has its own version history (1, 2, 3, ...).
 */
export function ConfigParameterHistory({
  platform,
  environment,
  parameterKey,
  currentVersion,
  onVersionChange,
}: ConfigParameterHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<ConfigParameter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedValue, setExpandedValue] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!isOpen) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await listConfigParameterVersionsApi(platform, environment, parameterKey);
      // Sort by version descending (newest first)
      const sorted = [...data].sort((a, b) => parseInt(b.version) - parseInt(a.version));
      setVersions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, platform, environment, parameterKey]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, loadVersions]);

  const handleRollback = async (targetVersion: string) => {
    if (isRollingBack || isDeleting) return;

    try {
      setIsRollingBack(targetVersion);
      setError(null);
      await rollbackConfigParameterApi(platform, environment, parameterKey, targetVersion);
      await loadVersions();
      onVersionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback to version');
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleDelete = async () => {
    if (isRollingBack || isDeleting) return;

    if (!confirm(`Are you sure you want to delete "${parameterKey}" and ALL its versions? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await deleteConfigParameterApi(platform, environment, parameterKey);
      setIsDeleting(false);
      setIsOpen(false);
      onVersionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete parameter');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleValueExpand = (version: string) => {
    setExpandedValue(expandedValue === version ? null : version);
  };

  const formatValue = (param: ConfigParameter): string => {
    if (param.valueType === 'json') {
      try {
        const parsed = JSON.parse(param.defaultValue);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return param.defaultValue;
      }
    }
    return param.defaultValue;
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        History
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white max-w-2xl w-full border border-black/20 rounded-xl shadow-lg m-8 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-black/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Parameter History</h2>
            <p className="text-sm text-muted-foreground font-mono">
              {parameterKey} - Current: v{currentVersion}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
              <span className="ml-2 text-muted-foreground">Loading versions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={loadVersions}>
                Retry
              </Button>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No versions found
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.version}
                  className={`p-4 rounded-lg border ${
                    version.isActive
                      ? 'border-black/20 bg-muted'
                      : 'border-black/10 hover:border-black/20'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-lg">v{version.version}</span>
                        {version.isActive && (
                          <Badge variant="default" size="sm" className="font-bold">
                            ACTIVE
                          </Badge>
                        )}
                        <Badge variant="secondary" size="sm">
                          {version.valueType}
                        </Badge>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Created:</span>{' '}
                          {formatDate(version.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">By:</span>{' '}
                          {version.createdBy}
                        </div>
                        {version.description && (
                          <div>
                            <span className="font-medium">Description:</span>{' '}
                            {version.description}
                          </div>
                        )}
                      </div>

                      {/* Collapsible value preview */}
                      <button
                        onClick={() => toggleValueExpand(version.version)}
                        className="mt-2 text-xs text-info hover:underline"
                      >
                        {expandedValue === version.version ? 'Hide' : 'Show'} value
                      </button>

                      {expandedValue === version.version && (
                        <pre className="mt-2 p-2 bg-muted border border-black/10 rounded text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                          {formatValue(version)}
                        </pre>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {!version.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRollback(version.version)}
                          disabled={isRollingBack !== null || isDeleting}
                          className="whitespace-nowrap"
                        >
                          {isRollingBack === version.version ? (
                            <>
                              <Spinner className="h-4 w-4 mr-1" />
                              Rolling back...
                            </>
                          ) : (
                            'Rollback'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 bg-muted rounded-b-xl flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Rolling back makes a previous version the active version. All versions are preserved.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isRollingBack !== null || isDeleting}
            className="text-destructive hover:text-destructive hover:border-destructive/50"
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4 mr-1" />
                Deleting...
              </>
            ) : (
              'Delete Parameter'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
