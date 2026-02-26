"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Folder, FolderOpen, LayoutDashboard, X, LogOut, Users, Eye, Edit, GripVertical, Zap, AlertCircle } from "lucide-react";
import ChatPanel from "./ChatPanel";
import AuthModal from "./AuthModal";
import { supabase } from "@/lib/supabase";
import UpgradeModal from "./UpgradeModal";
interface Project {
  id: string;
  name: string;
  folder_id?: string | null;
  position?: number;
}

interface FolderType {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface SharedProject extends Project {
  permission: 'viewer' | 'editor';
  owner_email: string;
}

interface SidebarProps {
  projects: Project[];
  folders?: FolderType[];
  sharedProjects?: SharedProject[];
  selectedProjectId: string;
  onProjectSelect: (projectId: string, projectName: string) => void;
  onProjectsChange: (projects: Project[]) => void;
  onProjectRename?: (projectId: string, newName: string) => void;
  onProjectDelete?: (projectId: string) => void;
  onFolderCreate?: (name: string) => void;
  onFolderRename?: (folderId: string, newName: string) => void;
  onFolderDelete?: (folderId: string) => void;
  onMoveProjectToFolder?: (projectId: string, folderId: string | null) => void;
  currentWidgets?: any[];
  onWidgetAction?: (action: any) => void;
  projectLimit?: { canCreate: boolean; current: number; max: number };
  aiLimit?: { allowed: boolean; remaining: number; resetTime: Date | null };
}

export default function Sidebar({ 
  projects, 
  folders = [],
  sharedProjects = [],
  selectedProjectId, 
  onProjectSelect, 
  onProjectsChange, 
  onProjectRename, 
  onProjectDelete,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  onMoveProjectToFolder,
  currentWidgets = [],
  onWidgetAction,
  projectLimit = { canCreate: true, current: 0, max: 3 },
  aiLimit = { allowed: true, remaining: 10, resetTime: null }
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro'>('free');
    const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ type: 'project' | 'shared'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSubscriptionTier(session.user.id);
      }
    });
    return () => authListener?.subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchSubscriptionTier(user.id);
    }
  };

  const fetchSubscriptionTier = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, cancel_at')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setSubscriptionTier(data.subscription_tier === 'pro' ? 'pro' : 'free');
      setCancelAt(data.cancel_at || null);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      window.location.reload();
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    
    setIsCancelingSubscription(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Error canceling subscription: ' + data.error);
        setIsCancelingSubscription(false);
        return;
      }

      alert('Subscription canceled successfully. You will not be charged again.');
      setShowCancelModal(false);
      setShowUserMenu(false);
      
      // Refresh subscription tier
      await fetchSubscriptionTier(user.id);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsCancelingSubscription(false);
    }
  };

  const handleAddProject = async () => {
    if (!projectLimit.canCreate) {
      alert(`Free users are limited to ${projectLimit.max} projects. Upgrade to Pro for unlimited projects!`);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newProject: Project = { id: tempId, name: "New Project", folder_id: null };
    const updatedProjects = [...projects, newProject];
    
    onProjectsChange(updatedProjects);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setEditingProjectId(tempId);
    setEditingName(newProject.name);
  };

  const handleAddFolder = () => {
    if (!onFolderCreate) return;
    onFolderCreate("New Folder");
  };

  useEffect(() => {
    if (editingProjectId && editingProjectId.startsWith('temp-')) {
      const tempProject = projects.find(p => p.id === editingProjectId);
      if (!tempProject) {
        const newestProject = projects[projects.length - 1];
        if (newestProject && !newestProject.id.startsWith('temp-')) {
          setEditingProjectId(newestProject.id);
          onProjectSelect(newestProject.id, newestProject.name);
        }
      }
    }
  }, [projects, editingProjectId, onProjectSelect]);

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length === 1) {
      alert("You must have at least one project");
      return;
    }
    const updatedProjects = projects.filter(p => p.id !== projectId);
    onProjectsChange(updatedProjects);
    if (onProjectDelete) onProjectDelete(projectId);
    if (selectedProjectId === projectId && updatedProjects.length > 0) {
      onProjectSelect(updatedProjects[0].id, updatedProjects[0].name);
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete({ id: folderId, name: folderName });
    setShowDeleteModal(true);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete && onFolderDelete) {
      onFolderDelete(folderToDelete.id);
    }
    setShowDeleteModal(false);
    setFolderToDelete(null);
  };

  const handleSelectProject = (projectId: string, projectName: string) => {
    if (editingProjectId || editingFolderId) return;
    onProjectSelect(projectId, projectName);
  };

  const handleDoubleClickProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleDoubleClickFolder = (folder: FolderType) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const handleRenameProject = () => {
    if (editingProjectId && editingName.trim()) {
      const updatedProjects = projects.map(p => p.id === editingProjectId ? { ...p, name: editingName.trim() } : p);
      onProjectsChange(updatedProjects);
      if (onProjectRename) onProjectRename(editingProjectId, editingName.trim());
      if (editingProjectId === selectedProjectId) onProjectSelect(editingProjectId, editingName.trim());
    }
    setEditingProjectId(null);
    setEditingName("");
  };

  const handleRenameFolder = () => {
    if (editingFolderId && editingName.trim() && onFolderRename) {
      onFolderRename(editingFolderId, editingName.trim());
    }
    setEditingFolderId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingProjectId) handleRenameProject();
      else if (editingFolderId) handleRenameFolder();
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingFolderId(null);
      setEditingName("");
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, type: 'project' | 'shared', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (target: string) => {
    setDropTarget(target);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    
    if (!draggedItem || !onMoveProjectToFolder) return;

    const projectId = draggedItem.id;
    onMoveProjectToFolder(projectId, targetFolderId);
    
    setDraggedItem(null);
    setDropTarget(null);
  };

  const getUserInitials = () => {
    if (!user) return 'G';
    if (user.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ');
      return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
    }
    return user.email?.[0].toUpperCase() || 'U';
  };

  const getUserName = () => !user ? 'Guest' : user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const getUserEmail = () => !user ? 'Not signed in' : user.email || '';

  const rootProjects = projects.filter(p => !p.folder_id);
  const getProjectsInFolder = (folderId: string) => projects.filter(p => p.folder_id === folderId);

  return (
    <>
      <aside className={`bg-white/5 backdrop-blur-2xl rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`}>
        <div className="px-4 py-5 flex items-center justify-between flex-shrink-0">
          {!isCollapsed && <h2 className="text-xl font-semibold text-white">Talk To Data</h2>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors ml-auto">
            {isCollapsed ? <ChevronRight size={18} className="text-white" /> : <ChevronLeft size={18} className="text-white" />}
          </button>
        </div>

        <div className="flex-1 px-3 pb-4 overflow-y-auto min-h-0">
          {!isCollapsed && (
            <>
              {!projectLimit.canCreate && (
                <div className="mb-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-200 text-xs font-medium mb-1">⚠️ Project Limit Reached</p>
                  <p className="text-yellow-300 text-xs">{projectLimit.current}/{projectLimit.max} projects used. Upgrade to Pro for unlimited!</p>
                </div>
              )}

              {aiLimit.remaining <= 3 && aiLimit.remaining > 0 && (
                <div className="mb-3 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                  <p className="text-orange-200 text-xs font-medium mb-1">⚡ AI Generations Low</p>
                  <p className="text-orange-300 text-xs">{aiLimit.remaining}/10 remaining today</p>
                </div>
              )}

              {!aiLimit.allowed && aiLimit.resetTime && (
                <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-200 text-xs font-medium mb-1">🚫 AI Limit Reached</p>
                  <p className="text-red-300 text-xs">Resets in {Math.ceil((aiLimit.resetTime.getTime() - Date.now()) / (1000 * 60 * 60))} hours</p>
                </div>
              )}
            </>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3 px-2">
              {!isCollapsed && <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">My Projects</p>}
              <div className="flex gap-1">
                {!isCollapsed && onFolderCreate && (
                  <button 
                    onClick={handleAddFolder}
                    className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="Add Folder"
                  >
                    <Folder size={14} className="text-gray-400 hover:text-white" />
                  </button>
                )}
                <button 
                  onClick={handleAddProject} 
                  disabled={!projectLimit.canCreate}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                    projectLimit.canCreate 
                      ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                      : 'bg-gray-500/20 text-gray-600 cursor-not-allowed'
                  }`}
                  title={projectLimit.canCreate ? "Add Project" : `Free limit: ${projectLimit.max} projects`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              {isCollapsed ? (
                <>
                  {folders.map(folder => (
                    <div key={folder.id} className="px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer transition-all flex items-center justify-center" title={folder.name}>
                      <Folder size={18} className="text-purple-400" />
                    </div>
                  ))}
                  {rootProjects.map(project => (
                    <div 
                      key={project.id} 
                      onClick={() => handleSelectProject(project.id, project.name)} 
                      className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center ${selectedProjectId === project.id ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-white/10'}`} 
                      title={project.name}
                    >
                      <LayoutDashboard size={18} className="text-white" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {folders.map(folder => (
                    <div key={folder.id}>
                      <div 
                        className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          dropTarget === folder.id ? 'bg-purple-500/30 border-2 border-purple-500' : 'hover:bg-white/10'
                        }`}
                        onClick={() => toggleFolder(folder.id)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(folder.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, folder.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedFolders.has(folder.id) ? <FolderOpen size={16} className="text-purple-400" /> : <Folder size={16} className="text-purple-400" />}
                          
                          {editingFolderId === folder.id ? (
                            <input 
                              type="text" 
                              value={editingName} 
                              onChange={e => setEditingName(e.target.value)} 
                              onBlur={handleRenameFolder} 
                              onKeyDown={handleKeyDown} 
                              autoFocus 
                              className="flex-1 bg-white/10 border border-white/40 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" 
                              onClick={e => e.stopPropagation()} 
                            />
                          ) : (
                            <>
                              <span className="flex-1 text-white text-sm font-medium truncate" onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickFolder(folder); }}>
                                {folder.name}
                              </span>
                              <span className="text-xs text-gray-400">{getProjectsInFolder(folder.id).length}</span>
                              <button 
                                onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)} 
                                className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-all"
                                title="Delete Folder"
                              >
                                <X size={12} className="text-red-400" />
                              </button>
                              {expandedFolders.has(folder.id) ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </>
                          )}
                        </div>
                      </div>

                      {expandedFolders.has(folder.id) && (
                        <div className="ml-4 mt-1 space-y-1">
                          {getProjectsInFolder(folder.id).map(project => (
                            <div
                              key={project.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, 'project', project.id)}
                              onClick={() => handleSelectProject(project.id, project.name)}
                              onDoubleClick={() => handleDoubleClickProject(project)}
                              className={`group px-3 py-2 rounded-lg cursor-move text-sm transition-all flex items-center justify-between gap-2 ${
                                selectedProjectId === project.id ? 'bg-blue-500/20 text-white border border-blue-500/50' : 'text-white hover:bg-white/10'
                              } ${draggedItem?.id === project.id ? 'opacity-50' : ''}`}
                            >
                              {editingProjectId === project.id ? (
                                <input 
                                  type="text" 
                                  value={editingName} 
                                  onChange={e => setEditingName(e.target.value)} 
                                  onBlur={handleRenameProject} 
                                  onKeyDown={handleKeyDown} 
                                  autoFocus 
                                  className="flex-1 bg-white/10 border border-white/40 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500" 
                                  onClick={e => e.stopPropagation()} 
                                />
                              ) : (
                                <>
                                  <GripVertical size={14} className="text-gray-500 opacity-0 group-hover:opacity-100" />
                                  <span className="flex-1 truncate">{project.name}</span>
                                  <button 
                                    onClick={e => handleDeleteProject(project.id, e)} 
                                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-all"
                                  >
                                    <X size={12} className="text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter('root')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, null)}
                    className={`space-y-1 ${dropTarget === 'root' ? 'bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-xl p-2' : ''}`}
                  >
                    {rootProjects.map(project => (
                      <div
                        key={project.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'project', project.id)}
                        onClick={() => handleSelectProject(project.id, project.name)}
                        onDoubleClick={() => handleDoubleClickProject(project)}
                        className={`group px-3 py-2.5 rounded-xl cursor-move text-sm transition-all flex items-center justify-between gap-2 ${
                          selectedProjectId === project.id ? 'bg-blue-500/20 text-white border border-blue-500/50' : 'text-white hover:bg-white/10'
                        } ${draggedItem?.id === project.id ? 'opacity-50' : ''}`}
                      >
                        {editingProjectId === project.id ? (
                          <input 
                            type="text" 
                            value={editingName} 
                            onChange={e => setEditingName(e.target.value)} 
                            onBlur={handleRenameProject} 
                            onKeyDown={handleKeyDown} 
                            autoFocus 
                            className="flex-1 bg-white/10 border border-white/40 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500" 
                            onClick={e => e.stopPropagation()} 
                          />
                        ) : (
                          <>
                            <GripVertical size={14} className="text-gray-500 opacity-0 group-hover:opacity-100" />
                            <span className="flex-1 truncate">{project.name}</span>
                            <button 
                              onClick={e => handleDeleteProject(project.id, e)} 
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-all"
                            >
                              <X size={12} className="text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isCollapsed && sharedProjects.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <Users size={14} className="text-teal-400" />
                <p className="text-xs text-teal-400 font-medium uppercase tracking-wider">Shared with me</p>
                <span className="text-xs text-gray-500">({sharedProjects.length})</span>
              </div>

              <div className="space-y-1">
                {sharedProjects.map(project => (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'shared', project.id)}
                    onClick={() => handleSelectProject(project.id, project.name)}
                    className={`group px-3 py-2.5 rounded-xl cursor-move text-sm transition-all flex items-center justify-between gap-2 ${
                      selectedProjectId === project.id ? 'bg-teal-500/20 text-white border border-teal-500/50' : 'text-white hover:bg-teal-500/10'
                    } ${draggedItem?.id === project.id ? 'opacity-50' : ''}`}
                  >
                    <GripVertical size={14} className="text-gray-500 opacity-0 group-hover:opacity-100" />
                    <span className="flex-1 truncate">{project.name}</span>
                    <div className="flex items-center gap-1">
                      {project.permission === 'viewer' ? (
                        <div title="Viewer"><Eye size={12} className="text-teal-400" /></div>
                      ) : (
                        <div title="Editor"><Edit size={12} className="text-teal-400" /></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="px-3 pb-3 flex-shrink-0">
            <ChatPanel currentWidgets={currentWidgets} onWidgetAction={onWidgetAction} aiLimit={aiLimit} />
          </div>
        )}

        {!isCollapsed && user && projectLimit.current >= projectLimit.max && (
          <div className="px-3 pb-3 flex-shrink-0">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              Upgrade to Pro
            </button>
          </div>
        )}

        <div className="px-4 py-4 bg-white/5 flex-shrink-0">
          {isCollapsed ? (
            <div 
              onClick={() => !user && setShowAuthModal(true)} 
              className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold mx-auto ${!user ? 'cursor-pointer' : ''}`} 
              title={user ? getUserName() : 'Sign in'}
            >
              {getUserInitials()}
            </div>
          ) : (
            <div className="space-y-2">
              <div 
                onClick={() => user && setShowUserMenu(!showUserMenu)} 
                className={`flex items-center gap-3 ${user ? 'cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors' : 'cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors'}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{getUserName()}</p>
                  <p className="text-xs text-gray-400 truncate">{getUserEmail()}</p>
                </div>
              </div>

              {user ? (
                <>
                  {showUserMenu && user && (
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-3 space-y-2 animate-in fade-in zoom-in duration-200">
                      <div className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                        <p className="text-xs text-gray-300 mb-2">Current Plan</p>
                        <p className="text-sm font-semibold text-white mb-3">
                          {subscriptionTier === 'pro' ? (
                            <span className="flex flex-col gap-1">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                                Pro Plan
                              </span>
                              {cancelAt && (
                                <span className="text-xs text-yellow-200 mt-1">Will cancel on {new Date(cancelAt).toLocaleDateString()}</span>
                              )}
                            </span>
                          ) : (
                            <span>Free Plan</span>
                          )}
                        </p>
                        {subscriptionTier === 'pro' ? (
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold text-sm transition-all border border-red-500/30 flex items-center justify-center gap-2"
                          >
                            <AlertCircle size={14} />
                            Cancel Subscription
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowUpgradeModal(true);
                              setShowUserMenu(false);
                            }}
                            className="w-full py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            <Zap size={14} />
                            Upgrade to Pro - $19/mo
                          </button>
                        )}
                        
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleSignOut} 
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)} 
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-medium transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onAuthSuccess={() => { checkUser(); setShowAuthModal(false); }} 
      />

      {showDeleteModal && folderToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-red-500/30 shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Folder size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Folder?</h3>
                <p className="text-sm text-gray-400">"{folderToDelete.name}"</p>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-6">
              Projects inside will be moved to root. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && user && <UpgradeModal isOpen={showUpgradeModal} onClose={() => { setShowUpgradeModal(false); fetchSubscriptionTier(user.id); }} userId={user.id} userEmail="aabdessalem.chaouch@gmail.com" />}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-red-500/30 shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cancel Subscription?</h3>
                <p className="text-sm text-gray-400">Pro Plan</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to cancel your Pro subscription? You will lose access to unlimited projects and AI generations. You won't be charged again.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelingSubscription}
                className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelingSubscription}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelingSubscription ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Canceling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}