"use client";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, LayoutDashboard, X } from "lucide-react";
import ChatPanel from "./ChatPanel";

interface Project {
  id: string;
  name: string;
}

interface SidebarProps {
  selectedProjectId: string;
  onProjectSelect: (projectId: string, projectName: string) => void;
  onProjectsChange: (projects: Project[]) => void;
  currentWidgets: any[];
  onWidgetAction: (action: any) => void;
}

export default function Sidebar({ 
  selectedProjectId, 
  onProjectSelect, 
  onProjectsChange,
  currentWidgets,
  onWidgetAction
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Factory Scrap Analysis" },
    { id: "2", name: "Quality KPIs Dashboard" },
    { id: "3", name: "Production Line A" },
  ]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const updateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    onProjectsChange(newProjects);
  };

  const handleAddProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: "New Project"
    };
    const updatedProjects = [...projects, newProject];
    updateProjects(updatedProjects);
    onProjectSelect(newProject.id, newProject.name);
    setEditingProjectId(newProject.id);
    setEditingName(newProject.name);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (projects.length === 1) {
      alert("You must have at least one project");
      return;
    }

    const updatedProjects = projects.filter(p => p.id !== projectId);
    updateProjects(updatedProjects);
    
    if (selectedProjectId === projectId && updatedProjects.length > 0) {
      onProjectSelect(updatedProjects[0].id, updatedProjects[0].name);
    }
  };

  const handleSelectProject = (projectId: string) => {
    if (editingProjectId) return;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      onProjectSelect(project.id, project.name);
    }
  };

  const handleDoubleClick = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleRename = () => {
    if (editingProjectId && editingName.trim()) {
      const updatedProjects = projects.map(p => 
        p.id === editingProjectId 
          ? { ...p, name: editingName.trim() }
          : p
      );
      updateProjects(updatedProjects);
      
      if (editingProjectId === selectedProjectId) {
        onProjectSelect(editingProjectId, editingName.trim());
      }
    }
    setEditingProjectId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingName("");
    }
  };

  return (
    <aside 
      className={`bg-white/5 backdrop-blur-2xl rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-5 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && (
          <h2 className="text-xl font-semibold text-white">DashGen</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight size={18} className="text-white" />
          ) : (
            <ChevronLeft size={18} className="text-white" />
          )}
        </button>
      </div>

      {/* Projects Section */}
      <div className="flex-1 px-3 pb-4 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-3 px-2">
          {!isCollapsed && (
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Projects
            </p>
          )}
          <button 
            onClick={handleAddProject}
            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
            title="Add Project"
          >
            <Plus size={14} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="space-y-1">
          {isCollapsed ? (
            <>
              {projects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center ${
                    selectedProjectId === project.id 
                      ? 'bg-blue-500/20 border border-blue-500/50' 
                      : 'hover:bg-white/10'
                  }`}
                  title={project.name}
                >
                  <LayoutDashboard size={18} className="text-white" />
                </div>
              ))}
            </>
          ) : (
            <>
              {projects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  onDoubleClick={() => handleDoubleClick(project)}
                  className={`group px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all flex items-center justify-between gap-2 ${
                    selectedProjectId === project.id 
                      ? 'bg-blue-500/20 text-white border border-blue-500/50' 
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="flex-1 bg-white/10 border border-white/40 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 truncate">{project.name}</span>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-all"
                        title="Delete Project"
                      >
                        <X size={14} className="text-red-400 hover:text-red-300" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Panel - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="px-3 pb-3 flex-shrink-0">
          <ChatPanel 
            currentWidgets={currentWidgets}
            onWidgetAction={onWidgetAction}
          />
        </div>
      )}

      {/* User Profile */}
      <div className="px-4 py-4 bg-white/5 flex-shrink-0">
        {isCollapsed ? (
          <div 
            className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold cursor-pointer mx-auto"
            title="John Doe"
          >
            JD
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              JD
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">John Doe</p>
              <p className="text-xs text-gray-400">john@example.com</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}