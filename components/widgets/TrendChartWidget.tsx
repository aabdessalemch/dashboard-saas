"use client";
import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface TrendChartWidgetProps {
  onDelete: () => void;
  onDuplicate?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onSizeChange?: (width: number, height: number) => void;
  onDataChange?: (data: any) => void;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  maxWidth?: number;
  initialData?: any;
}

export default function TrendChartWidget({ 
  onDelete,
  onDuplicate,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  initialX = 0, 
  initialY = 0,
  initialWidth = 450,
  initialHeight = 280,
  maxWidth = 1200,
  initialData
}: TrendChartWidgetProps) {
  const [title, setTitle] = useState(initialData?.title || "Trend Chart");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [data, setData] = useState(initialData?.data || [
    { name: "Week 1", value: 400 },
    { name: "Week 2", value: 600 },
    { name: "Week 3", value: 500 },
    { name: "Week 4", value: 800 },
    { name: "Week 5", value: 700 },
    { name: "Week 6", value: 900 },
  ]);
  const [colors, setColors] = useState(initialData?.colors || ["#f59e0b", "#fb923c", "#f97316", "#ea580c", "#dc2626", "#b91c1c"]);
  const [settings, setSettings] = useState(initialData?.settings || {
    showGrid: true,
    showLegend: false,
    showTooltip: true,
    animationDuration: 800
  });

  const [showDataEditor, setShowDataEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chartHeight, setChartHeight] = useState(initialHeight);
  const [chartWidth, setChartWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load AI data on mount
  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.data) setData(initialData.data);
      if (initialData.colors) setColors(initialData.colors);
      if (initialData.settings) setSettings(initialData.settings);
    }
  }, []);

  const handleSaveData = (newData: any[], newColors: string[]) => {
    setData(newData);
    setColors(newColors);
    if (onDataChange) {
      onDataChange({
        title,
        data: newData,
        colors: newColors,
        settings
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input')) {
      return;
    }
    
    if (isEditingTitle) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = Math.max(0, moveEvent.clientX - startX);
      const newY = Math.max(0, moveEvent.clientY - startY);
      setPosition({ x: newX, y: newY });
      if (onPositionChange) {
        onPositionChange(newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startResize = (direction: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = chartHeight;
    const startWidth = chartWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        let newWidth = chartWidth;
        let newHeight = chartHeight;

        if (direction.includes('s')) {
          newHeight = Math.max(250, Math.min(1000, startHeight + deltaY));
          setChartHeight(newHeight);
        } else if (direction.includes('n')) {
          newHeight = Math.max(250, Math.min(1000, startHeight - deltaY));
          setChartHeight(newHeight);
        }

        if (direction.includes('e')) {
          newWidth = Math.max(400, Math.min(maxWidth, startWidth + deltaX));
          setChartWidth(newWidth);
        } else if (direction.includes('w')) {
          newWidth = Math.max(400, Math.min(maxWidth, startWidth - deltaX));
          setChartWidth(newWidth);
        }

        if (onSizeChange) {
          onSizeChange(newWidth, newHeight);
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setHoveredEdge(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const maxValue = Math.max(...data.map(d => d.value));
  const yAxisMax = Math.ceil(maxValue * 1.2);

  return (
    <>
      <div 
        ref={containerRef}
        className={`bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 group hover:border-white/30 transition-all duration-200 ${isResizing || isDragging ? 'select-none' : ''}`}
        style={{ 
          width: `${chartWidth}px`, 
          minWidth: '400px', 
          transition: isResizing || isDragging ? 'none' : 'all 0.2s',
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: isDragging ? 1000 : 1,
        }}
      >
        <div 
          onMouseDown={startDrag}
          className="absolute top-0 left-0 right-0 h-3 cursor-grab active:cursor-grabbing bg-gradient-to-r from-transparent via-white/10 to-transparent hover:via-white/20 transition-all"
          style={{ borderRadius: '16px 16px 0 0' }}
        />

        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <WidgetEditMenu
            onEditTitle={() => setIsEditingTitle(true)}
            onEditData={() => setShowDataEditor(true)}
            onSettings={() => setShowSettings(true)}
          />
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
              title="Duplicate"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div 
          className={`mb-4 cursor-move`}
          onMouseDown={(e) => {
            if (e.detail !== 2) {
              startDrag(e);
            }
          }}
        >
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="bg-white/10 border border-white/40 rounded-lg px-3 py-1 text-white font-semibold focus:outline-none focus:border-blue-500 w-full"
            />
          ) : (
            <h3 
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              className="text-white font-semibold cursor-text hover:text-blue-400 transition-colors"
            >
              {title}
            </h3>
          )}
        </div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <defs>
              <linearGradient id="colorValue-trend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {settings.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />}
            <XAxis dataKey="name" stroke="#fff" />
            <YAxis stroke="#fff" domain={[0, yAxisMax]} />
            {settings.showTooltip && (
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }} 
              />
            )}
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={colors[0]} 
              fillOpacity={1} 
              fill="url(#colorValue-trend)" 
              animationDuration={settings.animationDuration}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div onMouseDown={startResize('nw')} onMouseEnter={() => setHoveredEdge('nw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize" />
        <div onMouseDown={startResize('ne')} onMouseEnter={() => setHoveredEdge('ne')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -right-1 w-4 h-4 cursor-nesw-resize" />
        <div onMouseDown={startResize('sw')} onMouseEnter={() => setHoveredEdge('sw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -left-1 w-4 h-4 cursor-nesw-resize" />
        <div onMouseDown={startResize('se')} onMouseEnter={() => setHoveredEdge('se')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize" />
        <div onMouseDown={startResize('n')} onMouseEnter={() => setHoveredEdge('n')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 left-4 right-4 h-2 cursor-ns-resize" />
        <div onMouseDown={startResize('s')} onMouseEnter={() => setHoveredEdge('s')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 left-4 right-4 h-2 cursor-ns-resize" />
        <div onMouseDown={startResize('w')} onMouseEnter={() => setHoveredEdge('w')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -left-1 w-2 cursor-ew-resize" />
        <div onMouseDown={startResize('e')} onMouseEnter={() => setHoveredEdge('e')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -right-1 w-2 cursor-ew-resize" />

        {hoveredEdge === 'n' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-t-2xl pointer-events-none" />}
        {hoveredEdge === 's' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-b-2xl pointer-events-none" />}
        {hoveredEdge === 'w' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-l-2xl pointer-events-none" />}
        {hoveredEdge === 'e' && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-r-2xl pointer-events-none" />}
      </div>

      <DataEditorModal
        key={`${showDataEditor}-${data.length}`}
        isOpen={showDataEditor}
        onClose={() => setShowDataEditor(false)}
        currentData={data}
        currentColors={colors}
        onSave={handleSaveData}
      />

      <ChartSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={setSettings}
      />
    </>
  );
}