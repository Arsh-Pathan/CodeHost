import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-slate-900 mb-4">
          Welcome to <span className="text-blue-600">CodeHost</span>
        </h1>
        <p className="mt-3 text-xl text-slate-500 mb-8 max-w-2xl">
          Deploy your project in one click. No Linux, no Docker, no servers to manage. Just pure simplicity.
        </p>

        <div className="flex space-x-4">
          <Link 
            href="/signup" 
            className="px-8 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-3 bg-white text-slate-700 border border-slate-200 rounded-md font-medium hover:bg-slate-50 transition"
          >
            Login
          </Link>
        </div>
      </main>
    </div>
  );
}
