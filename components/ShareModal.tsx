"use client";
import { useState, useEffect } from "react";
import { X, Mail, UserPlus, Trash2, Eye, Edit } from "lucide-react";
import { shareProject, getProjectShares, removeShare, updateSharePermission, type ProjectShare } from "@/lib/sharing";
import { supabase } from "@/lib/supabase";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  userId: string;
}

export default function ShareModal({ isOpen, onClose, projectId, projectName, userId }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [isSharing, setIsSharing] = useState(false);
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setEmail("");
      setPermission('viewer');
    }
  }, [isOpen, projectId]);

 // Email autocomplete
useEffect(() => {
  const searchEmails = async () => {
    if (email.length < 2) {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Get ALL profiles and filter manually
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .neq('id', userId);

    if (data) {
      const filtered = data
        .filter(p => p.email && p.email.toLowerCase().includes(email.toLowerCase()))
        .map(p => p.email)
        .filter(Boolean)
        .slice(0, 5);

      if (filtered.length > 0) {
        setEmailSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setEmailSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const debounce = setTimeout(searchEmails, 300);
  return () => clearTimeout(debounce);
}, [email, userId]);

  const loadShares = async () => {
    setIsLoading(true);
    const existingShares = await getProjectShares(projectId);
    setShares(existingShares);
    setIsLoading(false);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setIsSharing(true);
    
    const result = await shareProject(projectId, userId, email, permission);
    
    if (result) {
      setEmail("");
      setPermission('viewer');
      setShowSuggestions(false);
      await loadShares();
      alert(`Project shared successfully with ${email}!`);
    }
    
    setIsSharing(false);
  };

  const handleRemoveShare = async (shareId: string, sharedEmail: string) => {
    if (!confirm(`Remove access for ${sharedEmail}?`)) return;
    
    const success = await removeShare(shareId);
    if (success) {
      await loadShares();
      alert('Access removed successfully');
    } else {
      alert('Failed to remove access');
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: 'viewer' | 'editor') => {
    const success = await updateSharePermission(shareId, newPermission);
    if (success) {
      await loadShares();
    } else {
      alert('Failed to update permission');
    }
  };

  const selectSuggestion = (suggestedEmail: string) => {
    setEmail(suggestedEmail);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Share Project</h2>
            <p className="text-sm text-gray-400 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-6 border-b border-white/10">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => emailSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={isSharing}
                  autoComplete="off"
                />
              </div>

              {/* Email Suggestions Dropdown */}
              {showSuggestions && emailSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl overflow-hidden">
                  {emailSuggestions.map((suggestedEmail, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectSuggestion(suggestedEmail)}
                      className="w-full px-4 py-2.5 text-left text-white hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                    >
                      <Mail size={14} className="text-gray-400" />
                      {suggestedEmail}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPermission('viewer')}
                  className={`p-3 rounded-lg border transition-all ${
                    permission === 'viewer'
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                  disabled={isSharing}
                >
                  <Eye size={18} className="mx-auto mb-1" />
                  <p className="text-xs font-medium">Viewer</p>
                  <p className="text-xs opacity-70">Can only view</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPermission('editor')}
                  className={`p-3 rounded-lg border transition-all ${
                    permission === 'editor'
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                  disabled={isSharing}
                >
                  <Edit size={18} className="mx-auto mb-1" />
                  <p className="text-xs font-medium">Editor</p>
                  <p className="text-xs opacity-70">Can edit</p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSharing}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Share Project
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-6 max-h-80 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Shared With ({shares.length})
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Not shared with anyone yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {share.shared_with_email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(share.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={share.permission}
                      onChange={(e) => handleUpdatePermission(share.id, e.target.value as 'viewer' | 'editor')}
                      className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    
                    <button
                      onClick={() => handleRemoveShare(share.id, share.shared_with_email)}
                      className="w-7 h-7 rounded hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      title="Remove access"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}