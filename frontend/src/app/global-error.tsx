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
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased m-0 p-0">
        <header className="border-b border-slate-200 bg-white py-4 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Code <span className="text-blue-600">Host</span>
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
              System Error
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              System Temporarily Unavailable
            </h1>
            <p className="text-sm text-slate-600">
              A critical platform error occurred. Please try reloading the page.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => reset()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition"
              >
                Return Home
              </a>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 bg-white">
          <p>© {new Date().getFullYear()} Code Host. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
