"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getPlatformsApi,
  getEnvironmentsApi,
  updateEnvironmentApi,
} from "@/lib/api/platforms";
import { getCurrentUserApi } from "@/lib/api/auth";
import type { Platform, Environment, User } from "@/lib/api/types";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  FilterTabs,
} from "@togglebox/ui";
import { DeleteEnvironmentButton } from "@/components/environments/delete-environment-button";
import { Layers, Flag, FlaskConical, Pencil, Check, X, Plus } from "lucide-react";

interface EnvironmentWithPlatform extends Environment {
  platformName: string;
}

interface EditState {
  platformName: string;
  environmentName: string;
  field: "description";
  value: string;
}

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<EnvironmentWithPlatform[]>(
    [],
  );
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [platformsData, userData] = await Promise.all([
        getPlatformsApi(),
        getCurrentUserApi().catch(() => null),
      ]);
      setPlatforms(platformsData);
      setCurrentUser(userData);

      const allEnvironments: EnvironmentWithPlatform[] = [];
      for (const platform of platformsData) {
        try {
          const envs = await getEnvironmentsApi(platform.name);
          allEnvironments.push(
            ...envs.map((env) => ({
              ...env,
              platformName: platform.name,
            })),
          );
        } catch {
          // Continue loading other platforms
        }
      }

      setEnvironments(allEnvironments);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load environments",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEnvironments =
    selectedPlatform === "all"
      ? environments
      : environments.filter((e) => e.platformName === selectedPlatform);

  const startEditing = (env: EnvironmentWithPlatform, field: "description") => {
    setEditState({
      platformName: env.platformName,
      environmentName: env.environment,
      field,
      value: env.description || "",
    });
  };

  const cancelEditing = () => {
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!editState) return;

    setIsSaving(true);
    try {
      await updateEnvironmentApi(
        editState.platformName,
        editState.environmentName,
        {
          description: editState.value,
        },
      );
      // Update local state
      setEnvironments((prev) =>
        prev.map((e) =>
          e.platformName === editState.platformName &&
          e.environment === editState.environmentName
            ? { ...e, description: editState.value }
            : e,
        ),
      );
      setEditState(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update environment",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Build filter options
  const filterOptions = [
    { value: "all", label: "All Platforms", count: environments.length },
    ...platforms.map((p) => ({
      value: p.name,
      label: p.name,
      count: environments.filter((e) => e.platformName === p.name).length,
    })),
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Environments</h1>
          <p className="text-muted-foreground mt-1">
            All environments across all platforms ({environments.length} total)
          </p>
        </div>
        <div>
          {selectedPlatform !== "all" ? (
            <Button asChild>
              <Link href={`/platforms/${selectedPlatform}/environments/create`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Environment
              </Link>
            </Button>
          ) : platforms.length > 0 ? (
            <Button asChild>
              <Link href={`/platforms/${platforms[0].name}/environments/create`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Environment
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/platforms">Create Platform First</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Platform filter tabs */}
      {platforms.length > 0 && (
        <div className="mb-6">
          <FilterTabs
            options={filterOptions}
            value={selectedPlatform}
            onChange={setSelectedPlatform}
          />
        </div>
      )}

      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead className="w-[150px]">Platform</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Created By</TableHead>
                <TableHead className="w-[120px]">Created At</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-9 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Error loading environments
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredEnvironments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold mb-2">No Environments Yet</h3>
            <p className="text-muted-foreground mb-6">
              {selectedPlatform !== "all"
                ? `No environments found for ${selectedPlatform}. Create one to get started.`
                : "Create platforms first, then add environments to them."}
            </p>
            <Button asChild>
              <Link href="/platforms">Go to Platforms</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <div className="flex flex-col">
                    <span>Name</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      URL identifier (immutable)
                    </span>
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex flex-col">
                    <span>Platform</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Parent platform
                    </span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex flex-col">
                    <span>Description</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Optional description
                    </span>
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex flex-col">
                    <span>Created By</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Creator user ID
                    </span>
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Created At</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnvironments.map((env) => (
                <TableRow key={`${env.platformName}-${env.environment}`}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/flags?platform=${env.platformName}&environment=${env.environment}`}
                      className="hover:underline"
                    >
                      {env.environment}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/platforms/${env.platformName}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {env.platformName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {editState?.platformName === env.platformName &&
                    editState?.environmentName === env.environment &&
                    editState.field === "description" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editState.value}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              value: e.target.value,
                            })
                          }
                          className="h-8"
                          placeholder="Enter description..."
                          disabled={isSaving}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={saveEdit}
                          disabled={isSaving}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-muted-foreground">
                          {env.description || "-"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => startEditing(env, "description")}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {env.createdBy || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(env.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Configs"
                      >
                        <Link
                          href={`/configs?platform=${env.platformName}&environment=${env.environment}`}
                        >
                          <Layers className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Flags"
                      >
                        <Link
                          href={`/flags?platform=${env.platformName}&environment=${env.environment}`}
                        >
                          <Flag className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Experiments"
                      >
                        <Link
                          href={`/experiments?platform=${env.platformName}&environment=${env.environment}`}
                        >
                          <FlaskConical className="h-4 w-4" />
                        </Link>
                      </Button>
                      {isAdmin && (
                        <DeleteEnvironmentButton
                          platform={env.platformName}
                          environment={env.environment}
                          onSuccess={loadData}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
