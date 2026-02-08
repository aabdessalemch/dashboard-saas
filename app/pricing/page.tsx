import Link from "next/link";
import { Check, X } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-900 via-blue-800 to-teal-600">
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

      {/* Pricing Section */}
      <div className="container mx-auto px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-light text-white mb-4">Simple Pricing</h1>
          <p className="text-xl text-gray-200">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* FREE PLAN */}
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 hover:scale-105 transition-transform">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Free</h2>
              <div className="text-5xl font-bold text-white mb-4">$0</div>
              <p className="text-gray-200">Forever free</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-gray-200">
                <Check className="text-green-400 mt-1 flex-shrink-0" size={20} />
                <span>All widgets</span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <Check className="text-green-400 mt-1 flex-shrink-0" size={20} />
                <span>Limited AI messages </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <Check className="text-green-400 mt-1 flex-shrink-0" size={20} />
                <span>Limited projects </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <Check className="text-green-400 mt-1 flex-shrink-0" size={20} />
                <span>Limited CSV upload </span>
              </li>
              <li className="flex items-start gap-3 text-gray-200">
                <Check className="text-green-400 mt-1 flex-shrink-0" size={20} />
                <span>Limited image upload </span>
              </li>
            </ul>

            <Link
              href="/dashboard"
              className="block w-full text-center px-6 py-4 bg-white/20 hover:bg-white/30 text-white rounded-full font-semibold transition border border-white/30"
            >
              Get Started Free
            </Link>
          </div>

          {/* PRO PLAN */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 hover:scale-105 transition-transform shadow-2xl relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-indigo-900 px-6 py-1 rounded-full text-sm font-bold">
              POPULAR
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Pro</h2>
              <div className="text-5xl font-bold text-white mb-4">$19</div>
              <p className="text-blue-100">per month</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span>All widgets</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span><strong>Unlimited</strong> AI messages</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span><strong>Unlimited</strong> projects</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span><strong>Unlimited</strong> CSV uploads</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span><strong>Unlimited</strong> image uploads & AI analysis</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Check className="text-yellow-300 mt-1 flex-shrink-0" size={20} />
                <span>Priority support</span>
              </li>
            </ul>

            <button className="block w-full text-center px-6 py-4 bg-white text-indigo-600 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}