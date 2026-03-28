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
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);
  const [infoBox, setInfoBox] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
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

    // Server-side filter — efficient and RLS-safe
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .ilike('email', `%${email}%`)
      .neq('id', userId)
      .limit(5);

    if (error) {
      console.error('Autocomplete error:', error);
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (data && data.length > 0) {
      const suggestions = data
        .map((p: any) => p.email)
        .filter(Boolean) as string[];
      setEmailSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setEmailSuggestions([]);
      setShowSuggestions(false);
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
    setInfoBox(null);
    if (!email.trim()) {
      setInfoBox({ type: 'error', message: 'Please enter an email address.' });
      return;
    }
    setIsSharing(true);
    const result = await shareProject(projectId, userId, email.trim(), permission);
    setIsSharing(false);

    if (result) {
      setEmail("");
      setPermission('viewer');
      setShowSuggestions(false);
      await loadShares();
      setInfoBox({
        type: 'info',
        message: `Project shared with ${email.trim()} as ${permission}.`
      });
    }
    // If result is null, shareProject already showed an alert with the reason
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
    setUpdatingShareId(shareId);
    const success = await updateSharePermission(shareId, newPermission);
    if (success) {
      setShares((prev) => prev.map(s => s.id === shareId ? { ...s, permission: newPermission } : s));
      await loadShares();
    } else {
      setInfoBox({ type: 'error', message: 'Failed to update permission.' });
    }
    setUpdatingShareId(null);
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
            {infoBox && (
              <div
                className={`rounded-xl px-4 py-3 mb-2 flex items-center gap-3 shadow-lg border text-sm font-medium ${
                  infoBox.type === 'error'
                    ? 'bg-gradient-to-r from-red-600/80 to-pink-500/80 border-red-400/40 text-white'
                    : 'bg-gradient-to-r from-blue-600/80 to-cyan-500/80 border-blue-400/40 text-white'
                } animate-in fade-in`}
              >
                {infoBox.type === 'error' ? (
                  <X size={18} className="text-white/80" />
                ) : (
                  <Mail size={18} className="text-white/80" />
                )}
                <span>{infoBox.message}</span>
                <button
                  type="button"
                  className="ml-auto text-white/60 hover:text-white/90"
                  onClick={() => setInfoBox(null)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}
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
                  className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-900/60 to-indigo-800/60 border border-blue-500/20 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate flex items-center gap-2">
                      <Mail size={16} className="text-blue-300" />
                      {share.shared_with_email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Shared on {new Date(share.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={share.permission}
                      onChange={(e) => handleUpdatePermission(share.id, e.target.value as 'viewer' | 'editor')}
                      className="px-3 py-2 bg-blue-500/10 border border-blue-400/30 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-blue-500 shadow-sm hover:bg-blue-500/20 transition-all"
                      disabled={updatingShareId === share.id}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRemoveShare(share.id, share.shared_with_email)}
                      className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/30 flex items-center justify-center transition-all shadow hover:shadow-red-500/30"
                      title="Remove access"
                      disabled={updatingShareId === share.id}
                    >
                      <Trash2 size={16} className="text-red-400" />
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