'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfigVersionsApi, markConfigStableApi, deleteConfigVersionApi } from '@/lib/api/configs';
import type { ConfigVersion } from '@/lib/api/types';
import { Badge, Button, Spinner } from '@togglebox/ui';

interface ConfigVersionHistoryProps {
  platform: string;
  environment: string;
  currentVersion: string;
  onVersionMarkedStable?: () => void;
}

export function ConfigVersionHistory({
  platform,
  environment,
  currentVersion,
  onVersionMarkedStable,
}: ConfigVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarking, setIsMarking] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!isOpen) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getConfigVersionsApi(platform, environment);
      // Sort by timestamp descending (newest first)
      const sorted = [...data].sort((a, b) =>
        new Date(b.versionTimestamp).getTime() - new Date(a.versionTimestamp).getTime()
      );
      setVersions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, platform, environment]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, loadVersions]);

  const handleMarkStable = async (versionLabel: string) => {
    if (isMarking || isDeleting) return;

    try {
      setIsMarking(versionLabel);
      setError(null);
      await markConfigStableApi(platform, environment, versionLabel);
      await loadVersions();
      onVersionMarkedStable?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as stable');
    } finally {
      setIsMarking(null);
    }
  };

  const handleDelete = async (versionLabel: string) => {
    if (isMarking || isDeleting) return;

    const version = versions.find(v => v.versionLabel === versionLabel);
    if (version?.isStable) {
      setError('Cannot delete the stable version');
      return;
    }

    if (!confirm(`Are you sure you want to delete version ${versionLabel}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(versionLabel);
      setError(null);
      await deleteConfigVersionApi(platform, environment, versionLabel);
      await loadVersions();
      onVersionMarkedStable?.(); // Refresh parent in case we deleted the displayed version
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsDeleting(null);
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

  const toggleConfigExpand = (versionLabel: string) => {
    setExpandedConfig(expandedConfig === versionLabel ? null : versionLabel);
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
            <h2 className="text-xl font-black">Version History</h2>
            <p className="text-sm text-muted-foreground">
              {platform} / {environment} - Current: v{currentVersion}
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
                  key={version.versionTimestamp}
                  className={`p-4 rounded-lg border ${
                    version.isStable
                      ? 'border-black/20 bg-muted'
                      : 'border-black/10 hover:border-black/20'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-lg">v{version.versionLabel}</span>
                        {version.isStable && (
                          <Badge variant="default" size="sm" className="font-bold">
                            STABLE
                          </Badge>
                        )}
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
                      </div>

                      {/* Collapsible config preview */}
                      <button
                        onClick={() => toggleConfigExpand(version.versionLabel)}
                        className="mt-2 text-xs text-info hover:underline"
                      >
                        {expandedConfig === version.versionLabel ? 'Hide' : 'Show'} config
                      </button>

                      {expandedConfig === version.versionLabel && (
                        <pre className="mt-2 p-2 bg-muted border border-black/10 rounded text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(version.config, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {!version.isStable && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkStable(version.versionLabel)}
                            disabled={isMarking !== null || isDeleting !== null}
                            className="whitespace-nowrap"
                          >
                            {isMarking === version.versionLabel ? (
                              <>
                                <Spinner className="h-4 w-4 mr-1" />
                                Marking...
                              </>
                            ) : (
                              'Mark Stable'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(version.versionLabel)}
                            disabled={isMarking !== null || isDeleting !== null}
                            className="whitespace-nowrap text-destructive hover:text-destructive hover:border-destructive/50"
                          >
                            {isDeleting === version.versionLabel ? (
                              <>
                                <Spinner className="h-4 w-4 mr-1" />
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 bg-muted rounded-b-xl">
          <p className="text-xs text-muted-foreground">
            Marking a version as stable makes it the default version served to clients. The previous stable version will be preserved for rollback.
          </p>
        </div>
      </div>
    </div>
  );
}
