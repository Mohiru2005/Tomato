'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-md max-w-md text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Global System Error</h2>
          <p className="text-sm text-slate-500 mb-6">{error.message || 'An unexpected system error occurred.'}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 transition-all"
          >
            Reset Application
          </button>
        </div>
      </body>
    </html>
  );
}
