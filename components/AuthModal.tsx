"use client";
import { useState, useEffect, useRef } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'options' | 'login' | 'signup'>('options');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setMode('options');
      setEmail("");
      setPassword("");
      setName("");
      setError("");
      setMessage("");
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
  setLoading(true);  // ✅ Use 'loading', not 'isLoading'
  
  // Clear any previous auth state
  sessionStorage.removeItem('auth_reloaded');
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
  
  if (error) {
    console.error('Error signing in with Google:', error);
    alert('Failed to sign in with Google. Please try again.');
    setLoading(false);
  }
  // Don't set loading to false on success - user will be redirected
};

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage('✅ Account created! Check your email to confirm.');
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if it's an email not confirmed error
      if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.');
      } else {
        setError(error.message);
      }
      return;
    }

    onClose();
    if (onAuthSuccess) onAuthSuccess();
  } catch (err: any) {
    setError(err.message || 'An error occurred during login');
  } finally {
    setLoading(false);
  }
};

  const handleEmailAuth = (e: React.FormEvent) => {
    if (mode === 'login') {
      handleEmailLogin(e);
    } else {
      handleEmailSignup(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        ref={modalRef}
        className="absolute bottom-4 left-4 w-80 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl animate-slideUp modal-with-arrow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="arrow-indicator"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 hover:rotate-90 flex items-center justify-center transition-all duration-300 z-10"
        >
          <X size={16} className="text-white" />
        </button>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
              {message}
            </div>
          )}

          {mode === 'options' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Account</h2>
              <p className="text-sm text-gray-400 mb-6">Sign in or create an account</p>

              <div className="space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{loading ? 'Loading...' : 'Continue with Google'}</span>
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="text-xs text-gray-500">or</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                <button
                  onClick={() => setMode('login')}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                >
                  Sign In with Email
                </button>

                <button
                  onClick={() => setMode('signup')}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/20 disabled:opacity-50"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <button
                onClick={() => { setMode('options'); setError(""); }}
                className="text-sm text-gray-400 hover:text-white mb-4 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
              <p className="text-sm text-gray-400 mb-5">Welcome back!</p>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-4 text-sm text-center text-gray-400">
                Don't have an account?{" "}
                <button 
                  onClick={() => { setMode('signup'); setError(""); }} 
                  className="text-blue-400 hover:text-blue-300 font-medium"
                  disabled={loading}
                >
                  Sign up
                </button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <button
                onClick={() => { setMode('options'); setError(""); }}
                className="text-sm text-gray-400 hover:text-white mb-4 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-sm text-gray-400 mb-5">Get started with DashGen</p>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="mt-4 text-sm text-center text-gray-400">
                Already have an account?{" "}
                <button 
                  onClick={() => { setMode('login'); setError(""); }} 
                  className="text-blue-400 hover:text-blue-300 font-medium"
                  disabled={loading}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .arrow-indicator {
          position: absolute;
          bottom: -10px;
          left: 20px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid rgb(15 23 42);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
        
        .arrow-indicator::before {
          content: '';
          position: absolute;
          top: -11px;
          left: -10px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}