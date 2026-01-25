import Link from 'next/link';
import { Button, Card, CardContent } from '@togglebox/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="text-center">
        <CardContent className="py-8 px-12">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="mb-6">Page not found</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
