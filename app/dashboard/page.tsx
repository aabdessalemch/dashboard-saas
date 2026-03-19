"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ShareModal from "@/components/ShareModal"; // Add to imports
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import DashboardCanvas from "@/components/DashboardCanvas";
import { canCreateProject, canUseAI, incrementAIUsage } from "@/lib/database";
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
  updateProject, 
  getFolders,              // ✅ ADD
  createFolder,            // ✅ ADD
  updateFolder,            // ✅ ADD
  deleteFolder,            // ✅ ADD
  moveProjectToFolder,     // ✅ ADD
  getSharedProjects,       // ✅ ADD
  type Folder  
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
  _stableId?: string; // Stable key for React rendering
}

interface Project {
  id: string;
  name: string;
}

// 🎨 DEMO DASHBOARD DATA
const DEMO_WIDGETS: WidgetPosition[] = [
  // Text Box - Description
  {
    id: 'demo-text-1',
    type: 'text',
    x: 530,
    y: 20,
    width: 570,
    height: 150,
    gridPosition: 0,
    zIndex: 1,
    data: {
      content:
        '<div style="font-size:20px;font-weight:bold;margin-bottom:8px;">' +
        'Quarterly Performance Dashboard' +
        '</div>' +
        '<div style="font-size:14px;line-height:1.5;">' +
        'This dashboard showcases quarterly revenue data across Q1–Q4. ' +
        'The data shows strong growth momentum with Q4 achieving the highest revenue ' +
        'of $65K, representing a significant increase from Q1’s $18K baseline.' +
        '</div>',
    },
  },

  // Table
  {
    id: 'demo-table-1',
    type: 'table',
    x: 20,
    y: 20,
    width: 500,
    height: 470,
    gridPosition: 1,
    zIndex: 1,
    data: {
      title: 'Monthly Revenue',
      columns: ['Month', 'Revenue ($K)'],
      rows: [
        ['Jan', '18'],
        ['Feb', '24'],
        ['Mar', '31'],
        ['Apr', '28'],
        ['May', '45'],
        ['Jun', '56'],
        ['Jul', '52'],
        ['Aug', '61'],
        ['Sep', '48'],
        ['Oct', '65'],
        ['Nov', '78'],
        ['Dec', '92'],
      ],
    },
  },

  // KPI Card - Q1 (Red)
  {
  id: 'demo-kpi-1',
  type: 'kpi',
  x: 530,
  y: 160,
  width: 200,
  height: 130,
  gridPosition: 2,
  zIndex: 1,
  data: {
    title: 'Jan Revenue',
    value: '18k',
    change: '-12%',
    bgColor: 'from-orange-500/20 to-red-600/20',
    arrowColor: 'text-red-400',
  },
},

  // KPI Card - Q4
  {
  id: 'demo-kpi-2',
  type: 'kpi',
  x: 530,
  y: 330,
  width: 200,
  height: 130,
  gridPosition: 3,
  zIndex: 1,
  data: {
    title: 'Dec Revenue',
    value: '92k',
    change: '+18%',
    bgColor: 'from-green-500/20 to-teal-600/20',
    arrowColor: 'text-green-400',
  },
},

  // KPI Card - Q1 duplicate
 {
  id: 'demo-kpi-3',
  type: 'kpi',
  x: 820,
  y: 160,
  width: 200,
  height: 130,
  gridPosition: 2,
  zIndex: 1,
  data: {
    title: 'finance',
    value: '70k',
    change: '-5%',
    bgColor: 'from-yellow-500/20 to-orange-600/20',
    arrowColor: 'text-orange-400',
  },
},

  // KPI Card - overall
  {
  id: 'demo-kpi-4',
  type: 'kpi',
  x: 820,
  y: 330,
  width: 200,
  height: 130,
  gridPosition: 2,
  zIndex: 1,
  data: {
    title: 'Yearly Total',
    value: '598k',
    change: '+35%',
    bgColor: 'from-indigo-500/20 to-blue-600/20',
    arrowColor: 'auto',
  },
},

  // Bar Chart
  {
    id: 'demo-bar-1',
    type: 'bar',
    x: 20,
    y: 510,
    width: 950,
    height: 320,
    gridPosition: 4,
    zIndex: 1,
    data: {
      title: 'Monthly Revenue (Bar)',
      data: [
        { name: 'Jan', value: 18 },
        { name: 'Feb', value: 24 },
        { name: 'Mar', value: 31 },
        { name: 'Apr', value: 28 },
        { name: 'May', value: 45 },
        { name: 'Jun', value: 56 },
        { name: 'Jul', value: 52 },
        { name: 'Aug', value: 61 },
        { name: 'Sep', value: 48 },
        { name: 'Oct', value: 65 },
        { name: 'Nov', value: 78 },
        { name: 'Dec', value: 92 },
      ],
      colors: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
    },
  },

  // Line Chart
  {
    id: 'demo-line-1',
    type: 'line',
    x: 985,
    y: 510,
    width: 830,
    height: 320,
    gridPosition: 5,
    zIndex: 1,
    data: {
      title: 'Revenue Trend (Line)',
      data: [
        { name: 'Jan', value: 18 },
        { name: 'Feb', value: 24 },
        { name: 'Mar', value: 31 },
        { name: 'Apr', value: 28 },
        { name: 'May', value: 45 },
        { name: 'Jun', value: 56 },
        { name: 'Jul', value: 52 },
        { name: 'Aug', value: 61 },
        { name: 'Sep', value: 48 },
        { name: 'Oct', value: 65 },
        { name: 'Nov', value: 78 },
        { name: 'Dec', value: 92 },
      ],
      colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'],
    },
  },

  // Pie Chart
  {
    id: 'demo-pie-1',
    type: 'pie',
    x: 20,
    y: 930,
    width: 400,
    height: 320,
    gridPosition: 6,
    zIndex: 1,
    data: {
      title: 'Revenue Distribution',
      data: [
        { name: 'Jan', value: 18 },
        { name: 'Feb', value: 24 },
        { name: 'Mar', value: 31 },
        { name: 'Apr', value: 28 },
        { name: 'May', value: 45 },
        { name: 'Jun', value: 56 },
        { name: 'Jul', value: 52 },
        { name: 'Aug', value: 61 },
        { name: 'Sep', value: 48 },
        { name: 'Oct', value: 65 },
        { name: 'Nov', value: 78 },
        { name: 'Dec', value: 92 },
      ],
      colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#06b6d4', '#84cc16'],
    },
  },
  // Pie Chart 2
  {
    id: 'demo-pie-2',
    type: 'pie',
    x: 1150,
    y: 930,
    width: 670,
    height: 320,
    gridPosition: 6,
    zIndex: 1,
    data: {
      title: 'Revenue by Quarter',
      data: [
        { name: 'Q1 (Jan-Mar)', value: 73 },
        { name: 'Q2 (Apr-Jun)', value: 129 },
        { name: 'Q3 (Jul-Sep)', value: 161 },
        { name: 'Q4 (Oct-Dec)', value: 235 },
        { name: 'Jan', value: 18 },
        { name: 'Feb', value: 24 },
        { name: 'Mar', value: 31 },
        { name: 'Apr', value: 28 },
        { name: 'May', value: 45 },
        { name: 'Jun', value: 56 },
      ],
      colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#a855f7'],
    },
  },

  // Trend Chart
  {
    id: 'demo-trend-1',
    type: 'trend',
    x: 435,
    y: 930,
    width: 700,
    height: 320,
    gridPosition: 7,
    zIndex: 1,
    data: {
      title: 'Growth Trajectory',
      data: [
        { name: 'Jan', value: 18 },
        { name: 'Feb', value: 24 },
        { name: 'Mar', value: 31 },
        { name: 'Apr', value: 28 },
        { name: 'May', value: 45 },
        { name: 'Jun', value: 56 },
        { name: 'Jul', value: 52 },
        { name: 'Aug', value: 61 },
        { name: 'Sep', value: 48 },
        { name: 'Oct', value: 65 },
        { name: 'Nov', value: 78 },
        { name: 'Dec', value: 92 },
      ],
      colors: ['#22c55e'],
    },
  },
  // Trend Chart
  {
    id: 'demo-trend-2',
    type: 'trend',
    x: 1110,
    y: 20,
    width: 700,
    height: 380,
    gridPosition: 7,
    zIndex: 1,
    data: {
      title: 'Weekly Operations',
      data: [
        { name: 'Wk1', value: 120 },
        { name: 'Wk2', value: 135 },
        { name: 'Wk3', value: 128 },
        { name: 'Wk4', value: 142 },
        { name: 'Wk5', value: 138 },
        { name: 'Wk6', value: 155 },
        { name: 'Wk7', value: 149 },
        { name: 'Wk8', value: 162 },
        { name: 'Wk9', value: 158 },
        { name: 'Wk10', value: 170 },
        { name: 'Wk11', value: 175 },
        { name: 'Wk12', value: 183 },
      ],
      colors: ['#22c55e'],
    },
  },
];

export default function DashboardPage() {
  const [showShareModal, setShowShareModal] = useState(false);
  const [widgets, setWidgets] = useState<WidgetPosition[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("guest-1");
  const [selectedProjectName, setSelectedProjectName] = useState("My Dashboard");
  const [projects, setProjects] = useState<Project[]>([{ id: "guest-1", name: "My Dashboard" }]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sharedProjects, setSharedProjects] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [activeSPCWidget, setActiveSPCWidget] = useState<{id: string, config: any} | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentProjectPermission, setCurrentProjectPermission] = useState<'owner' | 'viewer' | 'editor'>('owner');
  const widgetsRef = useRef<WidgetPosition[]>([]);
  const selectedProjectIdRef = useRef<string>("guest-1");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isSwitchingProjectRef = useRef(false);

  const DEFAULT_WIDTH = 450;
  const DEFAULT_HEIGHT = 280;

const [projectLimit, setProjectLimit] = useState({ canCreate: true, current: 0, max: 3 });
const [aiLimit, setAiLimit] = useState({ allowed: true, remaining: 10, resetTime: null as Date | null });




  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
  if (!selectedProjectId || selectedProjectId === 'guest-1') return;
  if (!userId) return; // ✅ Prevent getWidgets before auth

  const channel = supabase
    .channel(`project-${selectedProjectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'widgets',
        filter: `project_id=eq.${selectedProjectId}`,
      },
      async (payload) => {
        console.log('🔄 Widget change detected:', payload);
        // ✅ DON'T reload if we're switching projects
        if (isSwitchingProjectRef.current) {
          console.log('⏸️ Skipping reload - project switch in progress');
          return;
        }
        // ✅ DON'T reload if we're actively editing (have temp widgets)
        const hasTempWidgets = widgetsRef.current.some(w => w.id.startsWith('temp-'));
        if (hasTempWidgets) {
          console.log('⏸️ Skipping reload - temp widgets exist');
          return;
        }
        // ✅ DON'T reload if we just saved (prevent loop)
        if (isSavingRef.current) {
          console.log('⏸️ Skipping reload - currently saving');
          return;
        }
        // ✅ Only reload if change came from another user/session
        const dbWidgets = await getWidgets(selectedProjectId);
        const mappedWidgets = dbWidgets.map(w => ({
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
          _stableId: w.id,  // Use dbId as stable ID for widgets loaded from DB
        }));
        console.log('✅ Reloaded widgets from realtime:', mappedWidgets.length);
        isSavingRef.current = true; // ✅ Prevent save effect from firing
        setWidgets(mappedWidgets);
        setTimeout(() => {
          isSavingRef.current = false; // ✅ Re-enable after state update settles
        }, 1000);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedProjectId, userId]); // ✅ Add userId to dependencies
// Check user limits
useEffect(() => {
  const checkLimits = async () => {
    if (!userId) return;
    
    console.log('🔄 Checking limits for user:', userId);
    // Check project limit
    const canCreate = await canCreateProject(userId);
    const userProjects = await getProjects(userId);
    
    console.log('📊 Setting project limit:', { 
      canCreate, 
      current: userProjects.length, 
      max: 3 
    });
    setProjectLimit({ canCreate, current: userProjects.length, max: 3 });
    
     // Check AI limit
    const aiStatus = await canUseAI(userId);
    console.log('🤖 AI limit status:', aiStatus);
    setAiLimit(aiStatus);
  };
  
  if (userId) {
    checkLimits();
  }
}, [userId, projects]); // ✅ ADD 'projects' dependency so it rechecks when projects change


  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setUserId(null);
      setProjects([{ id: "guest-1", name: "Demo Dashboard" }]);
      setSelectedProjectId("guest-1");
      setSelectedProjectName("Demo Dashboard");
      setWidgets(DEMO_WIDGETS);
      setIsLoaded(true);
      setIsLoadingData(false);
      return;
    }

   setUserId(user.id);
const userProjects = await getProjects(user.id);

// ✅ MAKE SURE THESE 4 LINES ARE HERE:
const userFolders = await getFolders(user.id);
const userSharedProjects = await getSharedProjects(user.id);
setFolders(userFolders);
setSharedProjects(userSharedProjects);

console.log('🔗 Shared projects loaded:', userSharedProjects);  // ✅ ADD THIS FOR DEBUGGING
console.log('🔗 Shared projects loaded:', userSharedProjects); 
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
        gridPosition: 0, zIndex: w.z_index, data: w.data, dbId: w.id, _stableId: w.id,
      }));
      setWidgets(mappedWidgets);
    }

    setIsLoaded(true);
    setIsLoadingData(false);
  };

  initializeUser();

  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      setUserId(null);
      setProjects([{ id: "guest-1", name: "Demo Dashboard" }]);
      setSelectedProjectId("guest-1");
      setSelectedProjectName("Demo Dashboard");
      setWidgets(DEMO_WIDGETS);
      setIsLoaded(true);
    } else if (event === 'SIGNED_IN') {
      const hasReloaded = sessionStorage.getItem('auth_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('auth_reloaded', 'true');
        window.location.reload();
      }
    }
  });

  return () => authListener?.subscription.unsubscribe();
}, []);

  const saveToDatabase = useCallback(async (projectId: string, widgetsToSave: WidgetPosition[]) => {
    const currentUserId = userIdRef.current;
    console.log('[saveToDatabase] called', { userId: currentUserId, projectId, widgetsToSave });
    if (!currentUserId || projectId.startsWith('guest-')) {
      console.log('[saveToDatabase] Skipping: no userId or guest project', { userId: currentUserId, projectId });
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      console.log('[saveToDatabase] Skipping: invalid projectId', { projectId });
      return;
    }
    if (isSavingRef.current) {
      console.log('[saveToDatabase] Skipping: already saving');
      return;
    }

    isSavingRef.current = true;
    const idMappings = new Map<string, string>(); // temp-id -> db-id

    try {
      const existingWidgets = await getWidgets(projectId);
      console.log('[saveToDatabase] existingWidgets', existingWidgets);
      const existingDbIds = new Set(existingWidgets.map(w => w.id));
      const updatedIds = new Set<string>();

      for (const widget of widgetsToSave) {
        const hasValidDbId = widget.dbId && !widget.dbId.startsWith('temp-') && existingDbIds.has(widget.dbId);
        console.log('[saveToDatabase] Processing widget', widget, { hasValidDbId });
        if (hasValidDbId) {
          // Update existing widget
          await updateWidget(widget.dbId!, {
            widget_type: widget.type, x: widget.x, y: widget.y, width: widget.width,
            height: widget.height, z_index: widget.zIndex || 0, data: widget.data,
          });
          updatedIds.add(widget.dbId!);
          console.log('[saveToDatabase] Updated widget', widget.dbId);
        } else if (widget.id && !widget.id.startsWith('temp-') && existingDbIds.has(widget.id)) {
          // Update widget with existing DB ID
          await updateWidget(widget.id, {
            widget_type: widget.type, x: widget.x, y: widget.y, width: widget.width,
            height: widget.height, z_index: widget.zIndex || 0, data: widget.data,
          });
          updatedIds.add(widget.id);
          console.log('[saveToDatabase] Updated widget by id', widget.id);
        } else {
          // Create new widget
          const created = await createWidget(projectId, currentUserId, {
            widget_type: widget.type, x: widget.x, y: widget.y, width: widget.width,
            height: widget.height, z_index: widget.zIndex || 0, data: widget.data,
          });
          if (created) {
            updatedIds.add(created.id);
            if (widget.id.startsWith('temp-')) {
              idMappings.set(widget.id, created.id);
            }
            console.log('[saveToDatabase] Created widget', created);
          } else {
            console.warn('[saveToDatabase] Failed to create widget', widget);
          }
        }
      }

      // Update state with new DB IDs for created widgets
      if (idMappings.size > 0) {
        setWidgets(prev => prev.map(w => {
          const newId = idMappings.get(w.id);
          return newId ? { ...w, id: newId, dbId: newId } : w;
        }));
        console.log('[saveToDatabase] Updated widget IDs in state', Array.from(idMappings.entries()));
      }

      // Delete widgets that no longer exist
      for (const existingWidget of existingWidgets) {
        if (!updatedIds.has(existingWidget.id)) {
          await dbDeleteWidget(existingWidget.id);
          console.log('[saveToDatabase] Deleted widget', existingWidget.id);
        }
      }
      console.log('[saveToDatabase] Save complete');
    } catch (error) {
      console.error('[saveToDatabase] Save error:', error);
    } finally {
      isSavingRef.current = false;
      console.log('[saveToDatabase] isSavingRef reset');
    }
  }, []);

const scheduleSave = useCallback(() => {
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(() => {
    console.log('[scheduleSave] Triggered saveToDatabase');
    saveToDatabase(selectedProjectIdRef.current, widgetsRef.current);
  }, 500);
}, []);
// ✅ ADD THIS - Force save before page unload
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!userIdRef.current) return; // ✅ ADD THIS
    if (selectedProjectIdRef.current && widgetsRef.current.length > 0) {
      // Cancel scheduled save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Force immediate save
      saveToDatabase(selectedProjectIdRef.current, widgetsRef.current);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [userId, saveToDatabase]);

 useEffect(() => {
  console.log('[save effect] widgets changed', { isLoaded, userId, widgets, selectedProjectId });
  if (isSwitchingProjectRef.current) {
    console.log('[save effect] Skipping - project switch in progress');
    return;
  }
  if (isLoaded && userId && widgets.length > 0 && !selectedProjectId.startsWith('guest-')) {
    scheduleSave();
  }
}, [widgets, isLoaded, userId, selectedProjectId]); // ✅ REMOVED scheduleSave from dependencies

const handleProjectSelect = async (projectId: string, projectName: string) => {
  // Prevent save effect from firing during project switch
  isSwitchingProjectRef.current = true;

  // Cancel any pending saves
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

  // Save current project before switching
  if (userIdRef.current && !selectedProjectIdRef.current.startsWith('guest-')) {
    await saveToDatabase(selectedProjectIdRef.current, widgetsRef.current);
  }

  setSelectedProjectId(projectId);
  setSelectedProjectName(projectName);

  // Guest/demo mode
  if (projectId === 'guest-1' || !userId) {
    setWidgets(DEMO_WIDGETS);
    setCurrentProjectPermission('owner');
    isSwitchingProjectRef.current = false;
    return;
  }

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    setWidgets([]);
    isSwitchingProjectRef.current = false;
    return;
  }

  // Check if this is owned or shared project
  const isOwnProject = projects.some(p => p.id === projectId);
  const sharedProject = sharedProjects.find(p => p.id === projectId);
  
  if (sharedProject) {
    setCurrentProjectPermission(sharedProject.permission);
    console.log('📋 Shared project permission:', sharedProject.permission);
  } else if (isOwnProject) {
    setCurrentProjectPermission('owner');
  } else {
    setCurrentProjectPermission('viewer');
  }

  // Load widgets
  const dbWidgets = await getWidgets(projectId);

  const mappedWidgets = dbWidgets.map(w => ({
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
    _stableId: w.id,  // Use dbId as stable ID for widgets loaded from DB
  }));

  setWidgets(mappedWidgets);

  // Allow save effect to work again after a brief delay
  // (wait for React to process the setWidgets update)
  setTimeout(() => {
    isSwitchingProjectRef.current = false;
  }, 100);
};

const handleProjectsChange = async (updatedProjectsList: Project[]) => {
  // First, check if we're trying to add a new project
  const newProjects = updatedProjectsList.filter(p => p.id.startsWith('temp-'));
  
  if (newProjects.length > 0 && userId) {
    // Check limit BEFORE allowing creation
    const canCreate = await canCreateProject(userId);
    
    if (!canCreate) {
      alert(`Free users are limited to ${projectLimit.max} projects. Upgrade to Pro for unlimited projects!`);
      // Don't update the projects list
      return;
    }
  }
  
  // Process new projects
  for (const newProj of newProjects) {
    if (!userId) continue;
    
    console.log('🆕 Creating project:', newProj.name);
    const created = await createProject(userId, newProj.name);
    
    if (created) {
      console.log('✅ Project created with UUID:', created.id);
      
      updatedProjectsList = updatedProjectsList.map(p => 
        p.id === newProj.id ? created : p
      );
      
      if (newProj.id === selectedProjectId) {
        console.log('🔄 Updating selectedProjectId to:', created.id);
        setSelectedProjectId(created.id);
        selectedProjectIdRef.current = created.id;
        setSelectedProjectName(created.name);
        setWidgets([]);
      }
      
      // Update project limit after creation
      const canCreate = await canCreateProject(userId);
      const userProjects = await getProjects(userId);
      setProjectLimit({ canCreate, current: userProjects.length, max: 3 });
    }
  }
  
  setProjects(updatedProjectsList);
   // ✅ UPDATE: Refresh project limit after any change
  if (userId) {
    const canCreate = await canCreateProject(userId);
    const userProjects = await getProjects(userId);
    setProjectLimit({ canCreate, current: userProjects.length, max: 3 });
  }
};

  const handleProjectRename = async (projectId: string, newName: string) => {
    if (!userId || projectId.startsWith('guest-') || projectId.startsWith('temp-')) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(projectId)) await updateProject(projectId, newName);
  };

  const handleProjectDelete = async (projectId: string) => {
  if (!userId || projectId.startsWith('guest-') || projectId.startsWith('temp-')) return;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(projectId)) {
    await dbDeleteProject(projectId);
    
    // ✅ UPDATE: Refresh project limit after deletion
    if (userId) {
      const canCreate = await canCreateProject(userId);
      const userProjects = await getProjects(userId);
      setProjectLimit({ canCreate, current: userProjects.length, max: 3 });
    }
  }
};
// ✅ ADD ALL THESE FOLDER HANDLERS:

const handleFolderCreate = async (name: string) => {
  if (!userId) return;
  
  const newFolder = await createFolder(userId, name);
  if (newFolder) {
    setFolders([...folders, newFolder]);
  }
};

const handleFolderRename = async (folderId: string, newName: string) => {
  const success = await updateFolder(folderId, { name: newName });
  if (success) {
    setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
  }
};

const handleFolderDelete = async (folderId: string) => {
  const success = await deleteFolder(folderId);
  if (success) {
    setFolders(folders.filter(f => f.id !== folderId));
    // Refresh projects to show they moved to root
    if (userId) {
      const updatedProjects = await getProjects(userId);
      setProjects(updatedProjects);
    }
  }
};

const handleMoveProjectToFolder = async (projectId: string, folderId: string | null) => {
  const success = await moveProjectToFolder(projectId, folderId);
  if (success) {
    // Update local state
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, folder_id: folderId } : p
    ));
  }
};
  const checkCollision = (
    x: number,
    y: number,
    width: number,
    height: number,
    currentWidgets: WidgetPosition[],
    excludeId?: string
  ): boolean => {
    const PADDING = 20;
    return currentWidgets.some(widget => {
      if (excludeId && widget.id === excludeId) return false;
      return !(
        x + width + PADDING < widget.x ||
        x > widget.x + widget.width + PADDING ||
        y + height + PADDING < widget.y ||
        y > widget.y + widget.height + PADDING
      );
    });
  };

  const findNextPosition = (
    width: number,
    height: number,
    currentWidgets: WidgetPosition[]
  ): { x: number; y: number } => {
    const CANVAS_WIDTH = 1800;
    const GAP = 30;
    const MARGIN = 20;

    // Build candidate positions from existing widget boundaries
    const xCandidates = new Set<number>([MARGIN]);
    const yCandidates = new Set<number>([MARGIN]);

    currentWidgets.forEach(w => {
      xCandidates.add(w.x + w.width + GAP);
      yCandidates.add(w.y + w.height + GAP);
      xCandidates.add(w.x);
      yCandidates.add(w.y);
    });

    const sortedX = Array.from(xCandidates)
      .filter(x => x >= MARGIN && x + width <= CANVAS_WIDTH + 200)
      .sort((a, b) => a - b);
    const sortedY = Array.from(yCandidates)
      .filter(y => y >= MARGIN)
      .sort((a, b) => a - b);

    // Try every (x, y) candidate pair, find first non-colliding position
    for (const y of sortedY) {
      for (const x of sortedX) {
        if (x + width > CANVAS_WIDTH) continue;
        if (!checkCollision(x, y, width, height, currentWidgets)) {
          return { x, y };
        }
      }
    }

    // Fallback: place below all existing widgets
    if (currentWidgets.length === 0) {
      return { x: MARGIN, y: MARGIN };
    }

    const maxBottom = Math.max(...currentWidgets.map(w => w.y + w.height));
    return { x: MARGIN, y: maxBottom + GAP };
  };

  const findNearbyPosition = (
    sourceWidget: WidgetPosition,
    newWidth: number,
    newHeight: number,
    currentWidgets: WidgetPosition[]
  ): { x: number; y: number } => {
    const GAP = 30;
    const CANVAS_WIDTH = 1800;

    const tryPositions = [
      { x: sourceWidget.x + sourceWidget.width + GAP, y: sourceWidget.y },
      { x: sourceWidget.x, y: sourceWidget.y + sourceWidget.height + GAP },
      { x: Math.max(20, sourceWidget.x - newWidth - GAP), y: sourceWidget.y },
      { x: sourceWidget.x, y: Math.max(20, sourceWidget.y - newHeight - GAP) },
    ];

    for (const pos of tryPositions) {
      if (pos.x < 0 || pos.x + newWidth > CANVAS_WIDTH) continue;
      if (pos.y < 0) continue;
      if (!checkCollision(pos.x, pos.y, newWidth, newHeight, currentWidgets)) {
        return pos;
      }
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
  // Check permission FIRST
  if (currentProjectPermission === 'viewer') {
    alert('You only have view access to this project. Cannot add widgets.');
    return;
  }

  setWidgets(prev => {
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;

    switch (type) {
      case 'kpi':    width = 280;  height = 160; break;
      case 'text':   width = 420;  height = 100; break;
      case 'table':  width = 620;  height = 300; break;
      case 'pie':    width = 420;  height = 340; break;
      case 'bar':
      case 'line':
      case 'trend':  width = 500;  height = 300; break;
      default:       width = DEFAULT_WIDTH; height = DEFAULT_HEIGHT;
    }
    
    const position = findNextPosition(width, height, prev);
    
    const newWidget: WidgetPosition = { 
      id: `temp-${Date.now()}`, 
      type, 
      x: position.x, 
      y: position.y, 
      width, 
      height, 
      gridPosition: prev.length, 
      zIndex: prev.length + 1, 
      data: type === 'text' ? { content: '' } : undefined,
      _stableId: `stable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('✅ Created widget:', newWidget.id);
    const updated = [...prev, newWidget];
    widgetsRef.current = updated;
    return updated;
  });
  
  // Schedule save after adding widget
  scheduleSave();
}, [currentProjectPermission]);
 const deleteWidget = useCallback((id: string) => {
  // Check permission
  if (currentProjectPermission === 'viewer') {
    alert('You only have view access to this project. Cannot delete widgets.');
    return;
  }

  // Remove from UI immediately
  setWidgets(prev => {
    const updated = prev.filter(w => w.id !== id);
    widgetsRef.current = updated;
    return updated;
  });
  
  // Delete from database if it's a real widget (not temp-)
  if (!id.startsWith('temp-')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      // Delete immediately
      dbDeleteWidget(id).catch(err => {
        console.error('Delete widget error:', err);
      });
    }
  }
  
  // Schedule save for remaining widgets
  scheduleSave();
}, [currentProjectPermission]);

  const duplicateWidget = useCallback((id: string) => {
    // Check permission
    if (currentProjectPermission === 'viewer') {
      alert('You only have view access to this project. Cannot duplicate widgets.');
      return;
    }
    
    setWidgets(prev => {
      const widget = prev.find(w => w.id === id);
      if (!widget) return prev;
      const position = findNearbyPosition(widget, widget.width, widget.height, prev);
      const updated = [...prev, { 
        ...widget, 
        id: `temp-${Date.now()}`, 
        x: position.x, 
        y: position.y, 
        dbId: undefined, 
        _stableId: `stable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      }];
      widgetsRef.current = updated;
      return updated;
    });
    
    // Schedule save after duplicate
    scheduleSave();
  }, [currentProjectPermission]);

  const updateWidgetPosition = useCallback((id: string, x: number, y: number) => {
  // Check permission
  if (currentProjectPermission === 'viewer') {
    return; // Silently ignore for viewers
  }

  setWidgets(prev => prev.map(w => 
    w.id === id ? { ...w, x, y } : w
  ));
}, [currentProjectPermission]);

  const updateWidgetSize = useCallback((id: string, width: number, height: number) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, width, height } : w));
  }, []);

const updateWidgetData = useCallback((id: string, data: any) => {
  console.log('🔄 updateWidgetData called:', id, data.action);
  
  // Handle chart creation from table
  if (data.action === 'create_chart') {
    setWidgets(prev => {
      const sourceTable = prev.find(w => w.id === id);
      const position = sourceTable 
        ? findNearbyPosition(sourceTable, DEFAULT_WIDTH, DEFAULT_HEIGHT, prev) 
        : findNextPosition(DEFAULT_WIDTH, DEFAULT_HEIGHT, prev);
      
      const newChart = { 
        id: `temp-${Date.now()}`, 
        type: data.chartType, 
        x: position.x, 
        y: position.y, 
        width: DEFAULT_WIDTH, 
        height: DEFAULT_HEIGHT, 
        gridPosition: prev.length, 
        zIndex: Math.max(...prev.map(w => w.zIndex || 0), 0) + 1, 
        data: { 
          title: data.chartTitle, 
          data: data.chartData, 
          colors: data.chartType === 'bar' 
            ? ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e"] 
            : ["#ec4899", "#f97316", "#eab308", "#22c55e", "#3b82f6"],
          sourceTableId: id,
          tableConfig: data.tableConfig
        },
        _stableId: `stable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('✅ Creating chart:', newChart);
      return [...prev, newChart];
    });
    return;
  }
  
  // Handle table data changes - UPDATE LINKED CHARTS
  if (data.action === 'table_data_changed') {
    console.log('📊 Table data changed, updating charts...');
    
    setWidgets(prev => {
      // First, update the table widget itself
      const updatedWidgets = prev.map(w => 
        w.id === id ? { ...w, data } : w
      );
      
      // Then update all linked charts
      return updatedWidgets.map(widget => {
        // Skip if not a chart linked to this table
        if (!widget.data?.sourceTableId || widget.data.sourceTableId !== id) {
          return widget;
        }
        
        if (!widget.data?.tableConfig) {
          console.warn('Chart missing tableConfig:', widget.id);
          return widget;
        }
        
        let { xColumn, yColumn, startRow, endRow } = widget.data.tableConfig;
        const rows = data.rows;
        
        if (!rows || !Array.isArray(rows)) {
          console.error('Invalid rows data:', rows);
          return widget;
        }
        
        // Adjust config if row was deleted
        if (data.deletedRowIndex !== undefined) {
          const delIdx = data.deletedRowIndex;
          
          if (delIdx < startRow) {
            startRow = Math.max(1, startRow - 1);
            endRow = Math.max(1, endRow - 1);
          } else if (delIdx >= startRow && delIdx <= endRow) {
            endRow = Math.max(startRow, endRow - 1);
          }
          
          // Ensure we don't go beyond available rows
          endRow = Math.min(endRow, rows.length - 1);
          
          widget.data.tableConfig = { xColumn, yColumn, startRow, endRow };
        }
        
        // Regenerate chart data
        const safeStartRow = Math.max(0, Math.min(startRow, rows.length - 1));
        const safeEndRow = Math.max(safeStartRow, Math.min(endRow, rows.length - 1));
        
        const chartData = rows.slice(safeStartRow, safeEndRow + 1)
          .map((row: any) => {
            if (!Array.isArray(row)) return null;
            
            const name = row[xColumn]?.value || '';
            const valueStr = row[yColumn]?.value || '0';
            const cleanValue = String(valueStr).replace(/[$,KkMm%]/g, '');
            const value = parseFloat(cleanValue) || 0;
            
            return widget.type === 'trend' 
              ? { date: name, value }
              : { name, value };
          })
          .filter((item: any) => item && (item.name || item.date) && !isNaN(item.value));
        
        console.log(`✅ Updated ${widget.type} chart:`, chartData);
        
        return {
          ...widget,
          data: {
            ...widget.data,
            data: chartData
          }
        };
      });
    });
    return;
  }
  
  // Regular data update (for other widgets)
  setWidgets(prev => prev.map(w => w.id === id ? { ...w, data } : w));
}, []);

  const handleGenerateWidgets = useCallback(async (aiWidgets: any[]) => {
  // Check AI limit before generating
  if (userId && !aiLimit.allowed) {
    const resetTime = aiLimit.resetTime;
    const hoursLeft = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;
    alert(`Free users are limited to 10 AI generations per 24 hours. Your limit resets in ${hoursLeft} hours. Upgrade to Pro for unlimited AI generations!`);
    return;
  }
  
  // Increment AI usage count
  if (userId) {
    await incrementAIUsage(userId);
    const aiStatus = await canUseAI(userId);
    setAiLimit(aiStatus);
  }
  
  setWidgets(prev => {
    const newWidgets: WidgetPosition[] = [];
    
    aiWidgets.forEach((widget, index) => {
      console.log('🎨 Creating widget:', widget.type, 'Data:', widget.data);
      
      if (['bar', 'line', 'pie', 'trend'].includes(widget.type)) {
        if (!widget.data?.data || widget.data.data.length === 0) {
          console.error('❌ Empty chart data for', widget.type);
          console.error('Received data:', widget.data);
          return;
        }
        
        const firstItem = widget.data.data[0];
        if (!firstItem.name || firstItem.value === undefined) {
          console.error('❌ Invalid chart data format:', firstItem);
          console.error('Expected: {name: "...", value: NUMBER}');
          return;
        }
      }
      
      let width = DEFAULT_WIDTH;
      let height = DEFAULT_HEIGHT;

      switch (widget.type) {
        case 'kpi':
          width = 280;
          height = 160;
          break;
        case 'text':
          width = 420;
          height = 100;
          break;
        case 'table': {
          const rowCount = widget.data?.rows?.length ?? 5;
          width = 620;
          height = Math.min(500, Math.max(250, 60 + rowCount * 40));
          break;
        }
        case 'pie':
          width = 420;
          height = 340;
          break;
        case 'bar':
        case 'line':
        case 'trend': {
          const pointCount = widget.data?.data?.length ?? 6;
          width = Math.min(900, Math.max(400, 300 + pointCount * 30));
          height = 300;
          break;
        }
        default:
          width = DEFAULT_WIDTH;
          height = DEFAULT_HEIGHT;
      }

      // Calculate position AFTER sizing, passing ALL already-placed widgets
      const allPlaced = [...prev, ...newWidgets];
      const position = findNextPosition(width, height, allPlaced);
      
      newWidgets.push({
        id: `temp-${Date.now()}-${index}`,
        type: widget.type,
        x: position.x,
        y: position.y,
        width,
        height,
        gridPosition: prev.length + index,
        zIndex: prev.length + index + 1,
        data: widget.data,
        _stableId: `stable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`
      });
    });
    
    return [...prev, ...newWidgets];
  });
}, [userId, aiLimit]);

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
        console.log('✅ AI read widget data successfully');
        break;
      
      case 'edit':
        if (action.widgetId && action.updates) {
          setWidgets(prev => prev.map(w => {
            if (w.id !== action.widgetId) return w;
            const updated = { ...w, data: { ...w.data } };
            if (action.updates.title) updated.data.title = action.updates.title;
            if (action.updates.data) updated.data.data = action.updates.data;
            if (action.updates.colors) updated.data.colors = action.updates.colors;
            if (action.updates.value !== undefined) updated.data.value = action.updates.value;
            if (action.updates.change !== undefined) updated.data.change = action.updates.change;
            if (action.updates.content !== undefined) updated.data.content = action.updates.content;
            return updated;
          }));
        }
        break;

      case 'spc':
        // SPC action from chat - handled by activeSPCWidget state
        if (action.widgetId) {
          setActiveSPCWidget({ id: action.widgetId, config: action.spcConfig || {} });
        }
        break;

      case 'answer':
        // Answer action - content is already in the streamed chat message
        break;
        
      default:
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
      {!userId && widgets.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-lg px-6 py-3 text-yellow-200 text-sm font-medium shadow-lg">
          📊 Demo Dashboard - Sign in to save your work!
        </div>
      )}
      <div className="relative z-10 flex w-full p-4 gap-4">
<Sidebar 
  projects={projects} 
  folders={folders}                                    // ✅ ADD
  sharedProjects={sharedProjects}                      // ✅ ADD
  selectedProjectId={selectedProjectId} 
  onProjectSelect={handleProjectSelect} 
  onProjectsChange={handleProjectsChange} 
  onProjectRename={handleProjectRename} 
  onProjectDelete={handleProjectDelete}
  onFolderCreate={handleFolderCreate}                  // ✅ ADD
  onFolderRename={handleFolderRename}                  // ✅ ADD
  onFolderDelete={handleFolderDelete}                  // ✅ ADD
  onMoveProjectToFolder={handleMoveProjectToFolder}    // ✅ ADD
  currentWidgets={widgets} 
  onWidgetAction={handleWidgetAction}
  projectLimit={projectLimit}
  aiLimit={aiLimit}
/>       <div className="flex-1 flex flex-col gap-4">
          <TopBar onAddWidget={addWidget} projectName={selectedProjectName} onOpenAI={() => setShowAIAssistant(true)} onShareClick={() => setShowShareModal(true)} />
          <DashboardCanvas widgets={widgets} onDeleteWidget={deleteWidget} onDuplicateWidget={duplicateWidget} onAddWidget={addWidget} onUpdatePosition={updateWidgetPosition} onUpdateSize={updateWidgetSize} onUpdateData={updateWidgetData} onBringToFront={bringWidgetToFront} permission={currentProjectPermission} activeSPCWidget={activeSPCWidget} onClearActiveSPC={() => setActiveSPCWidget(null)} />
        </div>
      </div>
<AIAssistant 
  isOpen={showAIAssistant} 
  onClose={() => setShowAIAssistant(false)} 
  onGenerateWidgets={handleGenerateWidgets}
  userId={userId}  // ✅ ADD THIS
/>  
<ShareModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  projectId={selectedProjectId}
  projectName={selectedProjectName}
  userId={userId || ""}
/>  </div>
  );
}
