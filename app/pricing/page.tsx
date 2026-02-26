"use client";
import Link from "next/link";
import { Check, X, Mail, Phone, Globe } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UpgradeModal from "@/components/UpgradeModal";

const PricingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  const handleUpgradeClick = async () => {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Redirect to sign in
      router.push('/auth/login');
      return;
    }

    setCurrentUserId(user.id);
    setShowUpgradeModal(true);
  };

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
                <span>Limited image upload</span>
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

            <button 
              onClick={handleUpgradeClick}
              disabled={isLoading}
              className="block w-full text-center px-6 py-4 bg-white text-indigo-600 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Upgrade to Pro'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="border-t border-white/20 bg-black/20">
        <div className="container mx-auto px-8 py-20">
          <h2 className="text-4xl font-light text-white text-center mb-16">Get In Touch</h2>
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl">
              {/* Website */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
                  <Globe size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Website</h4>
                <a
                  href="https://abdesslemch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  abdesslemch.com
                </a>
              </div>

              {/* Email */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center mb-4 shadow-lg">
                  <Mail size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Email</h4>
                <a
                  href="mailto:aabdessalem.chaouch@gmail.com"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  aabdessalem.chaouch@gmail.com
                </a>
              </div>

              {/* Phone */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center mb-4 shadow-lg">
                  <Phone size={32} className="text-white" />
                </div>
                <h4 className="text-white text-lg font-semibold mb-2">Phone</h4>
                <a
                  href="tel:+14374511297"
                  className="text-gray-300 hover:text-white transition-colors text-base font-light"
                >
                  +1 (437)-451-1297
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mt-16 pt-8">
            <p className="text-gray-400 text-center text-sm">
              © 2025 Talk To Data. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && currentUserId && (
        <UpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userId={currentUserId}
          userEmail="aabdessalem.chaouch@gmail.com"
        />
      )}
    </div>
  );
};

export default PricingPage;