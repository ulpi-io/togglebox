import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="border-2 border-black p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="inline-block border-2 border-black px-6 py-2 font-bold hover:bg-black hover:text-white transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
