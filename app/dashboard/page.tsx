"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import DashboardCanvas from "@/components/DashboardCanvas";
import AIAssistant from "@/components/AIAssistant";
import { supabase } from "@/lib/supabase";
import { 
  getProjects, 
  createProject, 
  getWidgets, 
  createWidget, 
  updateWidget, 
  deleteWidget as dbDeleteWidget, 
  deleteProject as dbDeleteProject, 
  updateProject 
} from "@/lib/database";

export interface WidgetPosition {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gridPosition: number;
  zIndex?: number;
  data?: any;
  dbId?: string;
}

interface Project {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<WidgetPosition[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("guest-1");
  const [selectedProjectName, setSelectedProjectName] = useState("My Dashboard");
  const [projects, setProjects] = useState<Project[]>([{ id: "guest-1", name: "My Dashboard" }]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const widgetsRef = useRef<WidgetPosition[]>([]);
  const selectedProjectIdRef = useRef<string>("guest-1");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const DEFAULT_WIDTH = 450;
  const DEFAULT_HEIGHT = 280;
  const GAP_X = 30;
  const GAP_Y = 30;
  const START_X = 20;
  const START_Y = 20;
  const COLS = 3;

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserId(null);
        setProjects([{ id: "guest-1", name: "My Dashboard" }]);
        setSelectedProjectId("guest-1");
        setSelectedProjectName("My Dashboard");
        setWidgets([]);
        setIsLoaded(true);
        setIsLoadingData(false);
        return;
      }

      setUserId(user.id);
      const userProjects = await getProjects(user.id);

      if (userProjects.length === 0) {
        const project1 = await createProject(user.id, "My First Dashboard");
        if (project1) {
          setProjects([project1]);
          setSelectedProjectId(project1.id);
          setSelectedProjectName(project1.name);
          setWidgets([]);
        }
      } else {
        setProjects(userProjects);
        setSelectedProjectId(userProjects[0].id);
        setSelectedProjectName(userProjects[0].name);
        const dbWidgets = await getWidgets(userProjects[0].id);
        const mappedWidgets = dbWidgets.map(w => ({
          id: w.id, type: w.widget_type, x: w.x, y: w.y, width: w.width, height: w.height,
          gridPosition: 0, zIndex: w.z_index, data: w.data, dbId: w.id,
        }));
        setWidgets(mappedWidgets);
      }

      setIsLoaded(true);
      setIsLoadingData(false);
    };

    initializeUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null);
        setProjects([{ id: "guest-1", name: "My Dashboard" }]);
        setSelectedProjectId("guest-1");
        setSelectedProjectName("My Dashboard");
        setWidgets([]);
        setIsLoaded(true);
      } else if (event === 'SIGNED_IN') {
        window.location.reload();
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  const saveToDatabase = useCallback(async (projectId: string, widgetsToSave: WidgetPosition[]) => {
    if (!userId || projectId.startsWith('guest-') || projectId.startsWith('temp-')) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) return;
    if (isSavingRef.current) return;

    isSavingRef.current = true;

    try {
      const existingWidgets = await getWidgets(projectId);
      const existingDbIds = new Set(existingWidgets.map(w => w.id));
      const updatedIds = new Set<string>();

      for (const widget of widgetsToSave) {
        if (widget.dbId && existingDbIds.has(widget.dbId)) {
          await updateWidget(widget.dbId, {
            widget_type: widget.type, x: widget.x, y: widget.y, width: widget.width,
            height: widget.height, z_index: widget.zIndex || 0, data: widget.data,
          });
          updatedIds.add(widget.dbId);
        } else {
          const created = await createWidget(projectId, userId, {
            widget_type: widget.type, x: widget.x, y: widget.y, width: widget.width,
            height: widget.height, z_index: widget.zIndex || 0, data: widget.data,
          });
          if (created) {
            updatedIds.add(created.id);
            widget.id = created.id;
            widget.dbId = created.id;
          }
        }
      }

      for (const existingWidget of existingWidgets) {
        if (!updatedIds.has(existingWidget.id)) {
          await dbDeleteWidget(existingWidget.id);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [userId]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(selectedProjectIdRef.current, widgetsRef.current);
    }, 2000);
  }, [saveToDatabase]);

  useEffect(() => {
    if (isLoaded && userId) scheduleSave();
  }, [widgets, isLoaded, userId, scheduleSave]);

  const handleProjectSelect = async (projectId: string, projectName: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveToDatabase(selectedProjectIdRef.current, widgetsRef.current);

    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);

    // Clear widgets for ANY non-UUID project
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(projectId)) {
      setWidgets([]);
      return;
    }

    const dbWidgets = await getWidgets(projectId);
console.log('📦 Raw widgets from DB:', dbWidgets);

const mappedWidgets = dbWidgets.map(w => {
  console.log(`📊 Mapping ${w.widget_type}:`, w.data);
  
  return {
    id: w.id, 
    type: w.widget_type, 
    x: w.x, 
    y: w.y, 
    width: w.width, 
    height: w.height,
    gridPosition: 0, 
    zIndex: w.z_index, 
    data: w.data, 
    dbId: w.id,
  };
});

console.log('✅ Mapped widgets:', mappedWidgets);
setWidgets(mappedWidgets);
  };

 const handleProjectsChange = async (updatedProjectsList: Project[]) => {
  const newProjects = updatedProjectsList.filter(p => p.id.startsWith('temp-') && userId);
  
  for (const newProj of newProjects) {
    console.log('🆕 Creating project:', newProj.name);
    const created = await createProject(userId!, newProj.name);
    
    if (created) {
      console.log('✅ Project created with UUID:', created.id);
      
      // Update the project in the list FIRST
      updatedProjectsList = updatedProjectsList.map(p => 
        p.id === newProj.id ? created : p
      );
      
      // THEN update state and refs
      if (newProj.id === selectedProjectId) {
        console.log('🔄 Updating selectedProjectId to:', created.id);
        setSelectedProjectId(created.id);
        selectedProjectIdRef.current = created.id;
        setSelectedProjectName(created.name);
        
        // Force widgets to empty for new project
        setWidgets([]);
      }
    }
  }
  
  setProjects(updatedProjectsList);
};

  const handleProjectRename = async (projectId: string, newName: string) => {
    if (!userId || projectId.startsWith('guest-') || projectId.startsWith('temp-')) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(projectId)) await updateProject(projectId, newName);
  };

  const handleProjectDelete = async (projectId: string) => {
    if (!userId || projectId.startsWith('guest-') || projectId.startsWith('temp-')) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(projectId)) await dbDeleteProject(projectId);
  };

  const checkCollision = (x: number, y: number, width: number, height: number, currentWidgets: WidgetPosition[], excludeId?: string) => {
    return currentWidgets.some(widget => {
      if (excludeId && widget.id === excludeId) return false;
      const PADDING = 10;
      return !(x + width + PADDING < widget.x || x > widget.x + widget.width + PADDING || y + height + PADDING < widget.y || y > widget.y + widget.height + PADDING);
    });
  };

  const findNextPosition = (width: number, height: number, currentWidgets: WidgetPosition[]) => {
    for (let row = 0; row < 50; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = START_X + (col * (DEFAULT_WIDTH + GAP_X));
        const y = START_Y + (row * (DEFAULT_HEIGHT + GAP_Y));
        if (!checkCollision(x, y, width, height, currentWidgets)) return { x, y };
      }
    }
    return { x: START_X, y: START_Y + (currentWidgets.length * 100) };
  };

  const findNearbyPosition = (sourceWidget: WidgetPosition, newWidth: number, newHeight: number, currentWidgets: WidgetPosition[]) => {
    const GAP = 30;
    const tryPositions = [
      { x: sourceWidget.x + sourceWidget.width + GAP, y: sourceWidget.y },
      { x: sourceWidget.x, y: sourceWidget.y + sourceWidget.height + GAP },
    ];
    for (const pos of tryPositions) {
      if (!checkCollision(pos.x, pos.y, newWidth, newHeight, currentWidgets)) return pos;
    }
    return findNextPosition(newWidth, newHeight, currentWidgets);
  };

  const bringWidgetToFront = useCallback((id: string) => {
    setWidgets(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex || 0), 0);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  }, []);

  const addWidget = useCallback((type: string) => {
    setWidgets(prev => {
      let width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT;
      if (type === 'text') { width = 400; height = 80; }
      else if (type === 'kpi') { width = 300; height = 180; }
      else if (type === 'table') { width = 600; height = 400; }
      const position = findNextPosition(width, height, prev);
      return [...prev, { id: `temp-${Date.now()}`, type, x: position.x, y: position.y, width, height, gridPosition: prev.length, zIndex: prev.length + 1, data: type === 'text' ? { content: '' } : undefined }];
    });
  }, []);

  const deleteWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const duplicateWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const widget = prev.find(w => w.id === id);
      if (!widget) return prev;
      const position = findNearbyPosition(widget, widget.width, widget.height, prev);
      return [...prev, { ...widget, id: `temp-${Date.now()}`, x: position.x, y: position.y, dbId: undefined }];
    });
  }, []);

  const updateWidgetPosition = useCallback((id: string, x: number, y: number) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  }, []);

  const updateWidgetSize = useCallback((id: string, width: number, height: number) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, width, height } : w));
  }, []);

  const updateWidgetData = useCallback((id: string, data: any) => {
    if (data.action === 'create_chart') {
      setWidgets(prev => {
        const sourceTable = prev.find(w => w.id === id);
        const position = sourceTable ? findNearbyPosition(sourceTable, DEFAULT_WIDTH, DEFAULT_HEIGHT, prev) : findNextPosition(DEFAULT_WIDTH, DEFAULT_HEIGHT, prev);
        return [...prev, { id: `temp-${Date.now()}`, type: data.chartType, x: position.x, y: position.y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, gridPosition: prev.length, zIndex: Math.max(...prev.map(w => w.zIndex || 0), 0) + 1, data: { title: data.chartTitle, data: data.chartData, colors: data.chartType === 'bar' ? ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e"] : ["#ec4899", "#f97316", "#eab308", "#22c55e", "#3b82f6"] }}];
      });
      return;
    }
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, data } : w));
  }, []);

  const handleGenerateWidgets = useCallback((aiWidgets: any[]) => {
  setWidgets(prev => {
    const newWidgets: WidgetPosition[] = [];
    
    aiWidgets.forEach((widget, index) => {
      console.log('🎨 Creating widget:', widget.type, 'Data:', widget.data);
      
      // VALIDATION: Check if chart has data
      if (['bar', 'line', 'pie', 'trend'].includes(widget.type)) {
        if (!widget.data?.data || widget.data.data.length === 0) {
          console.error('❌ Empty chart data for', widget.type);
          console.error('Received data:', widget.data);
          return; // Skip this widget
        }
        
        // VALIDATION: Check data format
        const firstItem = widget.data.data[0];
        if (!firstItem.name || firstItem.value === undefined) {
          console.error('❌ Invalid chart data format:', firstItem);
          console.error('Expected: {name: "...", value: NUMBER}');
          return; // Skip this widget
        }
      }
      
      let width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT;
      if (widget.type === 'text') { width = 400; height = 80; }
      else if (widget.type === 'kpi') { width = 300; height = 180; }
      else if (widget.type === 'table') { width = 600; height = 400; }
      
      const position = findNextPosition(width, height, [...prev, ...newWidgets]);
      
      newWidgets.push({
        id: `temp-${Date.now()}-${index}`,
        type: widget.type,
        x: position.x,
        y: position.y,
        width,
        height,
        gridPosition: prev.length + index,
        zIndex: prev.length + index + 1,
        data: widget.data
      });
    });
    
    return [...prev, ...newWidgets];
  });
}, []);

const handleWidgetAction = useCallback((action: any) => {
  console.log('📩 Widget action received:', action);
  
  switch (action.type) {
    case 'modify': 
      if (action.widgetId) {
        setWidgets(prev => prev.map(w => 
          w.id === action.widgetId 
            ? { ...w, data: { ...w.data, ...action.data } } 
            : w
        ));
      }
      break;
      
    case 'delete': 
      if (action.widgetId) {
        setWidgets(prev => prev.filter(w => w.id !== action.widgetId));
      }
      break;
      
    case 'add': 
      if (action.widgets) {
        handleGenerateWidgets(action.widgets);
      }
      break;
      
    case 'update_value': 
      if (action.widgetId && action.field) {
        setWidgets(prev => prev.map(w => 
          w.id === action.widgetId 
            ? { ...w, data: { ...w.data, [action.field]: action.value } } 
            : w
        ));
      }
      break;
      
    case 'read':
      // AI is reading data - just acknowledge, no action needed
      console.log('✅ AI read widget data successfully');
      break;
      
    default:
      // Unknown action - just log it, don't break
      console.log('ℹ️ Unknown action type:', action.type);
  }
}, [handleGenerateWidgets]);


  if (isLoadingData) {
    return <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950"><div className="text-white text-xl">Loading...</div></div>;
  }

  return (
    <div className="h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />
      {!userId && widgets.length > 0 && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-200 text-sm">⚠️ Guest mode</div>}
      <div className="relative z-10 flex w-full p-4 gap-4">
        <Sidebar projects={projects} selectedProjectId={selectedProjectId} onProjectSelect={handleProjectSelect} onProjectsChange={handleProjectsChange} onProjectRename={handleProjectRename} onProjectDelete={handleProjectDelete} currentWidgets={widgets} onWidgetAction={handleWidgetAction} />
        <div className="flex-1 flex flex-col gap-4">
          <TopBar onAddWidget={addWidget} projectName={selectedProjectName} onOpenAI={() => setShowAIAssistant(true)} />
          <DashboardCanvas widgets={widgets} onDeleteWidget={deleteWidget} onDuplicateWidget={duplicateWidget} onAddWidget={addWidget} onUpdatePosition={updateWidgetPosition} onUpdateSize={updateWidgetSize} onUpdateData={updateWidgetData} onBringToFront={bringWidgetToFront} />
        </div>
      </div>
      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} onGenerateWidgets={handleGenerateWidgets} />
    </div>
  );
}