"use client";
import { useState } from "react";
import { X, Check, Zap } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export default function UpgradeModal({ isOpen, onClose, userId, userEmail }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: userEmail }),
      });

      const { checkoutUrl, error } = await response.json();

      if (error) {
        alert('Error creating checkout session: ' + error);
        setIsLoading(false);
        return;
      }

      if (checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Zap size={32} className="text-yellow-300" />
            <h2 className="text-3xl font-bold text-white">Upgrade to Pro</h2>
          </div>
          <p className="text-blue-100">Unlock unlimited projects and AI generations</p>
        </div>

        {/* Pricing */}
        <div className="p-8">
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Billing Email</p>
            <p className="text-sm font-medium text-white truncate">{userEmail}</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30 mb-6">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-white">$19</span>
              <span className="text-gray-400">/month</span>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Upgrade Now
                </>
              )}
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">What you get:</h3>
            
            {[
              'Unlimited Projects',
              'Unlimited AI Generations',
              'Advanced Sharing & Collaboration',
              'Priority Support',
              'Early Access to New Features',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-green-400" />
                </div>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 mt-6 text-center">
            Cancel anytime. Secure payment powered by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}