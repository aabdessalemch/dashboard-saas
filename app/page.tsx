import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-900 via-blue-800 to-teal-600 relative">
      {/* Navigation */}
      <nav className="flex justify-end items-center px-16 py-8 text-gray-200">
        <div className="flex gap-12 text-sm">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/pricing" className="hover:text-white transition">
            Pricing
          </Link>
          <Link href="/contact" className="hover:text-white transition">
            Contact
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-16 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="text-white">
            <h1 className="text-7xl font-light mb-8 leading-tight">
              Talk To Data
            </h1>
            <p className="text-xl text-gray-200 font-light leading-relaxed max-w-lg mb-8">
              Build, customize, and explore your data visually to understand trends and make better decisions faster.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-38 py-4 bg-white text-indigo-900 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg text-lg"
            >
              Create Dashboard
            </Link>
          </div>

          {/* Right Content - Dashboard Mockup */}
          <div className="relative flex justify-center items-center">
            <Image
              src="/dashboard-preview.png"
              alt="Dashboard Preview"
              width={800}
              height={600}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>

      {/* Review Box */}
      <div className="container mx-auto px-16 pb-16">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-md">
          <h3 className="text-white text-2xl font-semibold mb-4">Love DashGen?</h3>
          <p className="text-gray-200 mb-6">Share your experience and help others discover the power of AI dashboards!</p>
          <button className="px-6 py-3 bg-white text-indigo-900 rounded-full font-semibold hover:bg-gray-100 transition">
            Add Review
          </button>
        </div>
      </div>
    </div>
  );
}