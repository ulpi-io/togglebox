'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getPlatformsApi, updatePlatformApi } from '@/lib/api/platforms';
import { getCurrentUserApi } from '@/lib/api/auth';
import type { Platform, User } from '@/lib/api/types';
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@togglebox/ui';
import { DeletePlatformButton } from '@/components/platforms/delete-platform-button';
import { ChevronRight, Pencil, Check, X } from 'lucide-react';

interface EditState {
  platformName: string;
  field: 'description';
  value: string;
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [platformsData, userData] = await Promise.all([
        getPlatformsApi(),
        getCurrentUserApi().catch(() => null),
      ]);
      setPlatforms(platformsData);
      setCurrentUser(userData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const startEditing = useCallback((platform: Platform, field: 'description') => {
    setEditState({
      platformName: platform.name,
      field,
      value: platform.description || '',
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditState(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editState) return;

    setIsSaving(true);
    try {
      await updatePlatformApi(editState.platformName, {
        description: editState.value,
      });
      // Update local state
      setPlatforms((prev) =>
        prev.map((p) =>
          p.name === editState.platformName
            ? { ...p, description: editState.value }
            : p
        )
      );
      setEditState(null);
    } catch (err) {
      // Show error via error state - toast would be better but requires additional setup
      setError(err instanceof Error ? err.message : 'Failed to update platform');
    } finally {
      setIsSaving(false);
    }
  }, [editState]);

  const formatDate = useMemo(() => (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Platforms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your platforms and their environments
          </p>
        </div>
        <Link href="/platforms/create">
          <Button>Create Platform</Button>
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[150px]">Created By</TableHead>
                <TableHead className="w-[120px]">Created At</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
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
              Error loading platforms
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : platforms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">No Platforms Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first platform to get started with ToggleBox
            </p>
            <Link href="/platforms/create">
              <Button>Create Platform</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <div className="flex flex-col">
                    <span>Name</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      URL identifier (immutable)
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
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => (
                <TableRow key={platform.name}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/platforms/${platform.name}`}
                      className="hover:underline"
                    >
                      {platform.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {editState?.platformName === platform.name &&
                    editState.field === 'description' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editState.value}
                          onChange={(e) =>
                            setEditState({ ...editState, value: e.target.value })
                          }
                          className="h-8"
                          placeholder="Enter description..."
                          disabled={isSaving}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEditing();
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
                          {platform.description || '-'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => startEditing(platform, 'description')}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {platform.createdBy || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(platform.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <DeletePlatformButton
                          platform={platform.name}
                          onSuccess={loadData}
                        />
                      )}
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/platforms/${platform.name}`}>
                          Manage
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
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
