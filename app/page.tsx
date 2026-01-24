import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">DashGen</h1>
        <p className="text-xl text-gray-300 mb-8">
          Transform Google Sheets into beautiful dashboards
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}