"use client";

import { useState, useEffect, useCallback } from "react";
import { getFlagVersionsApi } from "@/lib/api/flags";
import type { Flag } from "@/lib/api/types";
import { Badge, Button, Spinner } from "@togglebox/ui";
import { History } from "lucide-react";

interface VersionHistoryProps {
  platform: string;
  environment: string;
  flagKey: string;
  currentVersion?: string;
  onVersionActivated?: () => void;
}

export function VersionHistory({
  platform,
  environment,
  flagKey,
  currentVersion,
  onVersionActivated,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Flag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!isOpen) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getFlagVersionsApi(platform, environment, flagKey);
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, platform, environment, flagKey]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, loadVersions]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Version history"
      >
        <History className="h-4 w-4" />
      </button>
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
              {flagKey} {currentVersion && `- Current: v${currentVersion}`}
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
              <span className="ml-2 text-muted-foreground">
                Loading versions...
              </span>
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
                      ? "border-success/50 bg-success/10"
                      : "border-black/10 hover:border-black/20"
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-lg">
                          v{version.version}
                        </span>
                        {version.isActive && (
                          <Badge
                            status="active"
                            size="sm"
                            className="font-bold"
                          >
                            ACTIVE
                          </Badge>
                        )}
                        <Badge
                          variant={version.enabled ? "default" : "secondary"}
                          size="sm"
                          className="font-bold"
                        >
                          {version.enabled ? "ON" : "OFF"}
                        </Badge>
                      </div>

                      {version.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {version.description}
                        </p>
                      )}

                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {version.flagType}
                        </div>
                        <div>
                          <span className="font-medium">Value A:</span>{" "}
                          {JSON.stringify(version.valueA)}
                        </div>
                        <div>
                          <span className="font-medium">Value B:</span>{" "}
                          {JSON.stringify(version.valueB)}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {formatDate(version.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">By:</span>{" "}
                          {version.createdBy}
                        </div>
                      </div>
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
            Version history shows all versions of this flag.
          </p>
        </div>
      </div>
    </div>
  );
}
