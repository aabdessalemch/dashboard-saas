"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import DashboardCanvas from "@/components/DashboardCanvas";
import AIAssistant from "@/components/AIAssistant";

export interface WidgetPosition {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gridPosition: number;
  data?: any;
}

interface Project {
  id: string;
  name: string;
  widgets: WidgetPosition[];
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<WidgetPosition[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("1");
  const [selectedProjectName, setSelectedProjectName] = useState("Factory Scrap Analysis");
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Factory Scrap Analysis", widgets: [] },
    { id: "2", name: "Quality KPIs Dashboard", widgets: [] },
    { id: "3", name: "Production Line A", widgets: [] },
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const DEFAULT_WIDTH = 450;
  const DEFAULT_HEIGHT = 280;
  const GAP_X = 30;
  const GAP_Y = 100;
  const START_X = 20;
  const START_Y = 20;
  const COLS = 3;

  useEffect(() => {
    const savedProjects = localStorage.getItem('dashgen_projects');
    const savedSelectedId = localStorage.getItem('dashgen_selected_project');
    
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      setProjects(parsedProjects);
      
      if (savedSelectedId) {
        const selectedProject = parsedProjects.find((p: Project) => p.id === savedSelectedId);
        if (selectedProject) {
          setSelectedProjectId(selectedProject.id);
          setSelectedProjectName(selectedProject.name);
          setWidgets(selectedProject.widgets || []);
        }
      } else if (parsedProjects.length > 0) {
        setSelectedProjectId(parsedProjects[0].id);
        setSelectedProjectName(parsedProjects[0].name);
        setWidgets(parsedProjects[0].widgets || []);
      }
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dashgen_projects', JSON.stringify(projects));
    }
  }, [projects, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('dashgen_selected_project', selectedProjectId);
    }
  }, [selectedProjectId, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === selectedProjectId 
            ? { ...p, widgets: widgets }
            : p
        )
      );
    }
  }, [widgets, selectedProjectId, isLoaded]);

  const checkCollision = (x: number, y: number, width: number, height: number, excludeId?: string) => {
    return widgets.some(widget => {
      if (excludeId && widget.id === excludeId) return false;
      
      const PADDING = 20;
      return !(
        x + width + PADDING < widget.x ||
        x > widget.x + widget.width + PADDING ||
        y + height + PADDING < widget.y ||
        y > widget.y + widget.height + PADDING
      );
    });
  };

  const findNextPosition = (width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) => {
    for (let row = 0; row < 50; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = START_X + (col * (DEFAULT_WIDTH + GAP_X));
        const y = START_Y + (row * (DEFAULT_HEIGHT + GAP_Y));

        if (!checkCollision(x, y, width, height)) {
          return { x, y };
        }
      }
    }

    return { 
      x: START_X, 
      y: START_Y + (widgets.length * 100) 
    };
  };

  const addWidget = (type: string) => {
    const position = findNextPosition();
    
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;
    
    if (type === 'text') {
      width = 400;
      height = 80;
    } else if (type === 'kpi') {
      width = 300;
      height = 180;
    } else if (type === 'table') {
      width = 600;
      height = 400;
    }
    
    const newWidget: WidgetPosition = {
      id: Date.now().toString(),
      type,
      x: position.x,
      y: position.y,
      width: width,
      height: height,
      gridPosition: widgets.length,
      data: type === 'text' ? { content: '' } : undefined,
    };
    setWidgets([...widgets, newWidget]);
  };

  const deleteWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const duplicateWidget = (id: string) => {
    const widget = widgets.find(w => w.id === id);
    if (!widget) return;

    const position = findNextPosition(widget.width, widget.height);
    
    const newWidget: WidgetPosition = {
      ...widget,
      id: Date.now().toString(),
      x: position.x,
      y: position.y,
      gridPosition: widgets.length,
      data: widget.data ? JSON.parse(JSON.stringify(widget.data)) : undefined,
    };
    setWidgets([...widgets, newWidget]);
  };

  const updateWidgetPosition = (id: string, x: number, y: number) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, x, y } : w));
  };

  const updateWidgetSize = (id: string, width: number, height: number) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, width, height } : w));
  };

  const updateWidgetData = (id: string, data: any) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, data } : w));
  };

  const handleProjectSelect = (projectId: string, projectName: string) => {
    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.id === selectedProjectId 
          ? { ...p, widgets: widgets }
          : p
      )
    );

    const newProject = projects.find(p => p.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
    setWidgets(newProject?.widgets || []);
  };

  const handleProjectsChange = (updatedProjectsList: any[]) => {
    setProjects(prevProjects => {
      return updatedProjectsList.map(updatedProj => {
        const existingProj = prevProjects.find(p => p.id === updatedProj.id);
        return {
          ...updatedProj,
          widgets: existingProj?.widgets || []
        };
      });
    });
  };

  const handleGenerateWidgets = (aiWidgets: any[]) => {
    const newWidgets: WidgetPosition[] = [];
    
    aiWidgets.forEach((widget, index) => {
      let width = DEFAULT_WIDTH;
      let height = DEFAULT_HEIGHT;
      
      if (widget.type === 'text') {
        width = 400;
        height = 80;
      } else if (widget.type === 'kpi') {
        width = 300;
        height = 180;
      } else if (widget.type === 'table') {
        width = 600;
        height = 400;
      }
      
      const position = findNextPosition(width, height);
      
      const newWidget: WidgetPosition = {
        id: Date.now().toString() + index,
        type: widget.type,
        x: position.x,
        y: position.y,
        width: width,
        height: height,
        gridPosition: widgets.length + newWidgets.length,
        data: widget.data,
      };
      
      newWidgets.push(newWidget);
    });
    
    setWidgets([...widgets, ...newWidgets]);
  };

  const handleWidgetAction = (action: any) => {
    console.log('Widget action:', action);

    switch (action.type) {
      case 'modify':
        if (action.widgetId) {
          setWidgets(widgets.map(w => 
            w.id === action.widgetId 
              ? { ...w, data: { ...w.data, ...action.data } }
              : w
          ));
        }
        break;

      case 'delete':
        if (action.widgetId) {
          deleteWidget(action.widgetId);
        } else if (action.widgetType) {
          const widgetToDelete = widgets.find(w => w.type === action.widgetType);
          if (widgetToDelete) deleteWidget(widgetToDelete.id);
        }
        break;

      case 'add':
        if (action.widgets) {
          handleGenerateWidgets(action.widgets);
        }
        break;

      case 'update_value':
        if (action.widgetId && action.field) {
          setWidgets(widgets.map(w => 
            w.id === action.widgetId 
              ? { ...w, data: { ...w.data, [action.field]: action.value } }
              : w
          ));
        }
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />

      <div className="relative z-10 flex w-full p-4 gap-4">
        <Sidebar 
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
          onProjectsChange={handleProjectsChange}
          currentWidgets={widgets}
          onWidgetAction={handleWidgetAction}
        />
        <div className="flex-1 flex flex-col gap-4">
          <TopBar 
            onAddWidget={addWidget}
            projectName={selectedProjectName}
            onOpenAI={() => setShowAIAssistant(true)}
          />
          <DashboardCanvas 
            widgets={widgets} 
            onDeleteWidget={deleteWidget}
            onDuplicateWidget={duplicateWidget}
            onAddWidget={addWidget}
            onUpdatePosition={updateWidgetPosition}
            onUpdateSize={updateWidgetSize}
            onUpdateData={updateWidgetData}
          />
        </div>
      </div>

      <AIAssistant 
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onGenerateWidgets={handleGenerateWidgets}
      />
    </div>
  );
}