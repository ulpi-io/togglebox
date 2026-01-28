"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { getExperimentsApi, getAllExperimentsApi } from "@/lib/api/experiments";
import { getCurrentUserApi } from "@/lib/api/auth";
import type { Experiment, ExperimentStatus, User } from "@/lib/api/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FilterTabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@togglebox/ui";
import { ExperimentStatusBadge } from "@/components/experiments/experiment-status-badge";
import { ExperimentActions } from "@/components/experiments/experiment-actions";
import { CreateEntityButton } from "@/components/common/create-entity-button";
import {
  PlatformEnvFilter,
  usePlatformEnvFilter,
} from "@/components/filters/platform-env-filter";
import { ChevronRight, FlaskConical } from "lucide-react";

type ExperimentFilter = "all" | ExperimentStatus;

function ExperimentsContent() {
  const { platform, environment } = usePlatformEnvFilter();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExperimentFilter>("all");

  const statusCounts = useMemo(
    () => ({
      draft: experiments.filter((e) => e.status === "draft").length,
      running: experiments.filter((e) => e.status === "running").length,
      paused: experiments.filter((e) => e.status === "paused").length,
      completed: experiments.filter((e) => e.status === "completed").length,
      archived: experiments.filter((e) => e.status === "archived").length,
    }),
    [experiments],
  );

  const filteredExperiments = useMemo(() => {
    if (filter === "all") return experiments;
    return experiments.filter((e) => e.status === filter);
  }, [experiments, filter]);

  const filterOptions = [
    { value: "all" as const, label: "All", count: experiments.length },
    { value: "draft" as const, label: "Draft", count: statusCounts.draft },
    {
      value: "running" as const,
      label: "Running",
      count: statusCounts.running,
    },
    { value: "paused" as const, label: "Paused", count: statusCounts.paused },
    {
      value: "completed" as const,
      label: "Completed",
      count: statusCounts.completed,
    },
    {
      value: "archived" as const,
      label: "Archived",
      count: statusCounts.archived,
    },
  ];

  const loadExperiments = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!platform || !environment) {
        // Load all experiments across all platforms/environments
        const data = await getAllExperimentsApi();
        setExperiments(data);
      } else {
        const data = await getExperimentsApi(platform, environment);
        setExperiments(data);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load experiments",
      );
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment]);

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserApi();
      setUser(userData);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  }, []);

  useEffect(() => {
    loadExperiments();
    loadUser();
  }, [loadExperiments, loadUser]);

  const hasSelection = platform && environment;

  // All experiments view (when no filter is selected)
  if (!hasSelection) {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading experiments
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadExperiments}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (experiments.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🧬</div>
            <h3 className="text-xl font-black mb-2">No Experiments Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first A/B experiment
            </p>
            <CreateEntityButton entityType="experiments" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black">
              All Experiments
            </CardTitle>
            <div className="flex items-center gap-4">
              <FilterTabs
                options={filterOptions}
                value={filter}
                onChange={setFilter}
              />
              <CreateEntityButton entityType="experiments" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Experiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExperiments.map((experiment) => (
                <TableRow
                  key={`${experiment.platform}-${experiment.environment}-${experiment.experimentKey}`}
                >
                  <TableCell className="font-semibold">
                    {experiment.platform}
                  </TableCell>
                  <TableCell>{experiment.environment}</TableCell>
                  <TableCell>
                    <Link
                      href={`/platforms/${experiment.platform}/environments/${experiment.environment}/experiments/${experiment.experimentKey}`}
                      className="font-semibold text-sm hover:underline"
                    >
                      {experiment.experimentKey}
                    </Link>
                    {experiment.name &&
                      experiment.name !== experiment.experimentKey && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {experiment.name}
                        </p>
                      )}
                  </TableCell>
                  <TableCell>
                    <ExperimentStatusBadge status={experiment.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {experiment.variations.slice(0, 2).map((v) => (
                        <span
                          key={v.key}
                          className={`px-2 py-0.5 text-xs rounded ${
                            v.isControl
                              ? "bg-info/10 text-info"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {v.name}
                        </span>
                      ))}
                      {experiment.variations.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{experiment.variations.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {experiment.createdBy || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/platforms/${experiment.platform}/environments/${experiment.environment}/experiments/${experiment.experimentKey}`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View details"
                      >
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <ExperimentActions
                        experiment={experiment}
                        user={user}
                        onSuccess={loadExperiments}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <div className="h-5 bg-muted rounded animate-pulse w-32" />
                  <div className="h-5 bg-muted rounded animate-pulse w-16" />
                </div>
                <div className="h-5 bg-muted rounded animate-pulse w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-destructive text-lg font-bold mb-2">
            Error loading experiments
          </div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={loadExperiments}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (experiments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🧬</div>
          <h3 className="text-xl font-black mb-2">No Experiments Yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first A/B experiment for {environment}
          </p>
          <Link
            href={`/experiments/create?platform=${platform}&environment=${environment}`}
          >
            <Button>Create Experiment</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FilterTabs
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
        <Link
          href={`/experiments/create?platform=${platform}&environment=${environment}`}
        >
          <Button>Create Experiment</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Experiment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExperiments.map((experiment) => (
                <TableRow key={experiment.experimentKey}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/platforms/${platform}/environments/${environment}/experiments/${experiment.experimentKey}`}
                          className="font-semibold text-sm hover:underline"
                        >
                          {experiment.experimentKey}
                        </Link>
                        {experiment.version && (
                          <Badge
                            variant="secondary"
                            size="sm"
                            className="ml-2 font-mono text-xs"
                          >
                            v{experiment.version}
                          </Badge>
                        )}
                        {experiment.name &&
                          experiment.name !== experiment.experimentKey && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {experiment.name}
                            </p>
                          )}
                        {experiment.hypothesis && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
                            {experiment.hypothesis}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ExperimentStatusBadge status={experiment.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {experiment.variations.slice(0, 3).map((v) => (
                        <span
                          key={v.key}
                          className={`px-2 py-0.5 text-xs rounded ${
                            v.isControl
                              ? "bg-info/10 text-info"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {v.name}
                        </span>
                      ))}
                      {experiment.variations.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{experiment.variations.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {experiment.results ? (
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {experiment.results.totalParticipants.toLocaleString()}{" "}
                            participants
                          </span>
                          <Badge
                            variant={
                              experiment.results.isSignificant
                                ? "default"
                                : "secondary"
                            }
                            size="sm"
                          >
                            {experiment.results.isSignificant
                              ? "Significant"
                              : "Collecting"}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No data yet
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {experiment.createdBy || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/platforms/${platform}/environments/${environment}/experiments/${experiment.experimentKey}`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View details"
                      >
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <ExperimentActions
                        experiment={experiment}
                        user={user}
                        onSuccess={loadExperiments}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="text-sm text-muted-foreground px-1">
        <span>
          {filteredExperiments.length} experiment
          {filteredExperiments.length !== 1 ? "s" : ""} shown ·{" "}
          {statusCounts.running} running total
        </span>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-black mb-2">Experiments</h1>
        <p className="text-muted-foreground">
          Manage A/B experiments with statistical analysis
        </p>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div>Loading...</div>}>
          <PlatformEnvFilter />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading experiments...</div>}>
        <ExperimentsContent />
      </Suspense>
    </div>
  );
}
