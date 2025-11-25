'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { href, label };
  });

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6">
      <Link href="/" className="hover:underline text-muted-foreground">
        Home
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center space-x-2">
          <span className="text-muted-foreground">/</span>
          {index === breadcrumbs.length - 1 ? (
            <span className="font-bold">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:underline text-muted-foreground">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
