'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@togglebox/ui';

/**
 * Patterns for paths that have actual pages (navigable).
 * Non-matching paths will be displayed as plain text (not clickable).
 */
const NAVIGABLE_PATTERNS = [
  /^\/platforms$/,
  /^\/platforms\/[^/]+$/,
  /^\/platforms\/[^/]+\/environments\/[^/]+\/configs$/,
  /^\/platforms\/[^/]+\/environments\/[^/]+\/configs\/[^/]+$/,
  /^\/platforms\/[^/]+\/environments\/[^/]+\/flags$/,
  /^\/platforms\/[^/]+\/environments\/[^/]+\/experiments$/,
  /^\/platforms\/[^/]+\/environments\/[^/]+\/experiments\/[^/]+$/,
  /^\/dashboard$/,
  /^\/environments$/,
  /^\/configs$/,
  /^\/flags$/,
  /^\/experiments$/,
  /^\/users$/,
  /^\/api-keys$/,
  /^\/cache$/,
  /^\/evaluation$/,
];

/**
 * Checks if a path has an actual page (is navigable).
 */
function isNavigable(path: string): boolean {
  return NAVIGABLE_PATTERNS.some((pattern) => pattern.test(path));
}

/**
 * Converts a URL segment to a human-readable label.
 * For known segments, uses predefined labels.
 * For dynamic segments (IDs, names), preserves the original value.
 */
function segmentToLabel(segment: string, segments: string[], index: number): string {
  const labelMap: Record<string, string> = {
    platforms: 'Platforms',
    environments: 'Environments',
    configs: 'Configs',
    flags: 'Feature Flags',
    experiments: 'Experiments',
    dashboard: 'Dashboard',
    users: 'Users',
    'api-keys': 'API Keys',
    cache: 'Cache',
    evaluation: 'Evaluation',
    versions: 'Versions',
  };

  if (labelMap[segment]) {
    return labelMap[segment];
  }

  return segment;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segmentToLabel(segment, segments, index);
    const navigable = isNavigable(href);

    return { href, label, navigable };
  });

  // On mobile, only show last 2 breadcrumbs + home
  const mobileBreadcrumbs = breadcrumbs.length > 2
    ? [{ href: '...', label: '...', navigable: false }, ...breadcrumbs.slice(-2)]
    : breadcrumbs;

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6 overflow-x-auto scrollbar-hide">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Home</span>
      </Link>

      {/* Desktop: Show all breadcrumbs */}
      <div className="hidden sm:flex items-center gap-1.5">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            {index === breadcrumbs.length - 1 ? (
              <span className="font-semibold truncate max-w-[200px]">{crumb.label}</span>
            ) : crumb.navigable ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate max-w-[150px]">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Show condensed breadcrumbs */}
      <div className="flex sm:hidden items-center gap-1.5">
        {mobileBreadcrumbs.map((crumb, index) => (
          <div key={`${crumb.href}-${index}`} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            {index === mobileBreadcrumbs.length - 1 ? (
              <span className="font-semibold truncate max-w-[120px]">{crumb.label}</span>
            ) : crumb.href === '...' ? (
              <span className="text-muted-foreground">...</span>
            ) : crumb.navigable ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[80px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate max-w-[80px]">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
