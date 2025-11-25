'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="border-2 border-black p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="mb-6 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="border-2 border-black px-6 py-2 font-bold hover:bg-black hover:text-white transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
