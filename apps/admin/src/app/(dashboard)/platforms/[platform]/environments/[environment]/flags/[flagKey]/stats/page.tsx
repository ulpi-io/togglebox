'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { getFlagStatsApi, getFlagStatsByCountryApi, getFlagStatsDailyApi } from '@/lib/api/stats';
import { getFlagApi } from '@/lib/api/flags';
import type { FlagStats, FlagCountryStats, FlagDailyStats, Flag } from '@/lib/api/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@togglebox/ui';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface FlagStatsPageProps {
  params: Promise<{
    platform: string;
    environment: string;
    flagKey: string;
  }>;
}

export default function FlagStatsPage({ params }: FlagStatsPageProps) {
  const { platform, environment, flagKey } = use(params);

  const [flag, setFlag] = useState<Flag | null>(null);
  const [stats, setStats] = useState<FlagStats | null>(null);
  const [countryStats, setCountryStats] = useState<FlagCountryStats[]>([]);
  const [dailyStats, setDailyStats] = useState<FlagDailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [flagData, statsData, countryData, dailyData] = await Promise.all([
        getFlagApi(platform, environment, flagKey).catch(() => null),
        getFlagStatsApi(platform, environment, flagKey),
        getFlagStatsByCountryApi(platform, environment, flagKey).catch(() => []),
        getFlagStatsDailyApi(platform, environment, flagKey, 14).catch(() => []),
      ]);

      setFlag(flagData);
      setStats(statsData);
      setCountryStats(countryData);
      setDailyStats(dailyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [platform, environment, flagKey]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">Flag Stats</h1>
              <p className="text-muted-foreground">
                {platform} / {environment} / {flagKey}
              </p>
            </div>
            <Link href={`/flags?platform=${platform}&environment=${environment}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flags
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">Flag Stats</h1>
              <p className="text-muted-foreground">
                {platform} / {environment} / {flagKey}
              </p>
            </div>
            <Link href={`/flags?platform=${platform}&environment=${environment}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flags
              </Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-destructive text-lg font-bold mb-2">
              Error loading stats
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={loadStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalEvaluations = stats?.totalEvaluations ?? 0;
  const valueACount = stats?.valueACount ?? 0;
  const valueBCount = stats?.valueBCount ?? 0;
  const valueAPercent = totalEvaluations > 0 ? ((valueACount / totalEvaluations) * 100).toFixed(1) : '0';
  const valueBPercent = totalEvaluations > 0 ? ((valueBCount / totalEvaluations) * 100).toFixed(1) : '0';

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Flag Stats</h1>
            <p className="text-muted-foreground">
              {platform} / {environment} / {flagKey}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href={`/flags?platform=${platform}&environment=${environment}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flags
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Flag Info Banner */}
      {flag && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{flag.name || flag.flagKey}</span>
                <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                  {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </Badge>
                <Badge variant="outline">{flag.flagType.toUpperCase()}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {formatDateTime(stats?.updatedAt ?? null)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="py-6">
            <div className="text-3xl font-black">{formatNumber(totalEvaluations)}</div>
            <div className="text-muted-foreground text-sm">Total Evaluations</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="text-3xl font-black text-blue-600">{formatNumber(valueACount)}</div>
            <div className="text-muted-foreground text-sm">
              Value A ({valueAPercent}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="text-3xl font-black text-green-600">{formatNumber(valueBCount)}</div>
            <div className="text-muted-foreground text-sm">
              Value B ({valueBPercent}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="text-3xl font-black">
              {formatNumber((stats?.uniqueUsersA24h ?? 0) + (stats?.uniqueUsersB24h ?? 0))}
            </div>
            <div className="text-muted-foreground text-sm">Unique Users (24h)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluations by Country</CardTitle>
          </CardHeader>
          <CardContent>
            {countryStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No country data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Value A</TableHead>
                    <TableHead className="text-right">Value B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryStats.slice(0, 10).map((country) => (
                    <TableRow key={country.country}>
                      <TableCell className="font-medium">{country.country}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(country.totalEvaluations)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatNumber(country.valueACount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatNumber(country.valueBCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Evaluations (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No daily data available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Value A</TableHead>
                    <TableHead className="text-right">Value B</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyStats.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(day.totalEvaluations)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatNumber(day.valueACount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatNumber(day.valueBCount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
