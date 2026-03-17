"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";
import SPCPanel from "../SPCPanel";

interface BarChartWidgetProps {
  onDelete?: () => void;
  onDuplicate?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onSizeChange?: (width: number, height: number) => void;
  onDataChange?: (data: any) => void;
  onBringToFront?: () => void;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  initialZIndex?: number;
  maxWidth?: number;
  initialData?: any;
  isReadOnly?: boolean;
}

export default function BarChartWidget({ 
  onDelete,
  onDuplicate,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  onBringToFront,
  initialX = 0, 
  initialY = 0,
  initialWidth = 450,
  initialHeight = 280,
  initialZIndex = 1,
  maxWidth = 1200,
  initialData,
  isReadOnly = false
}: BarChartWidgetProps) {
  const [title, setTitle] = useState(initialData?.title || "Bar Chart");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [data, setData] = useState(initialData?.data || [
    { name: "Product A", value: 400 },
    { name: "Product B", value: 300 },
    { name: "Product C", value: 600 },
    { name: "Product D", value: 800 },
    { name: "Product E", value: 500 },
  ]);
  const [colors, setColors] = useState(initialData?.colors || ["#8b5cf6", "#a855f7", "#9333ea", "#7c3aed", "#6d28d9"]);
  const [settings, setSettings] = useState(initialData?.settings || {
    showGrid: true,
    showLegend: false,
    showTooltip: true,
    animationDuration: 800
  });

  const [showSPC, setShowSPC] = useState(false);
  const [spcLimits, setSpcLimits] = useState<{ usl: number; lsl: number } | undefined>(initialData?.spcLimits);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [chartHeight, setChartHeight] = useState(initialHeight);
  const [chartWidth, setChartWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [zIndex, setZIndex] = useState(initialZIndex);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.data) setData(initialData.data);
      if (initialData.colors) setColors(initialData.colors);
      if (initialData.settings) setSettings(initialData.settings);
    }
  }, []);

  // Sync zIndex from parent when it changes
  useEffect(() => {
    setZIndex(initialZIndex);
  }, [initialZIndex]);

  const saveData = () => {
    if (onDataChange) {
      onDataChange({
        title,
        data,
        colors,
        settings,
        spcLimits
      });
    }
  };

  const handleSaveData = (newData: any[], newColors: string[]) => {
    setData(newData);
    setColors(newColors);
    if (onDataChange) {
      onDataChange({
        title,
        data: newData,
        colors: newColors,
        settings,
        spcLimits
      });
    }
  };

  const handleSPCLimitsChange = useCallback((newUsl: number, newLsl: number) => {
    const limits = { usl: newUsl, lsl: newLsl };
    setSpcLimits(limits);
    if (onDataChange) {
      onDataChange({ title, data, colors, settings, spcLimits: limits });
    }
  }, [title, data, colors, settings, onDataChange]);

  const handleOpenDataEditor = () => {
    setModalKey(prev => prev + 1);
    setShowDataEditor(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    saveData();
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditingTitle(false);
      saveData();
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate();
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    
    if ((e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input')) {
      return;
    }
    
    if (isEditingTitle) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Bring to front when starting to drag
    if (onBringToFront) {
      onBringToFront();
    }
    
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
    if (isReadOnly) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Bring to front when starting to resize
    if (onBringToFront) {
      onBringToFront();
    }

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

const maxValue = Math.max(...data.map((d: any) => d.value));
const yAxisMax = Math.ceil(maxValue * 1.2);
  
  const getBarSize = () => {
    if (data.length <= 5) return 60;
    if (data.length <= 8) return 45;
    if (data.length <= 12) return 30;
    return 20;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-purple-400 text-sm">Value: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const text = payload.value;
    const shouldRotate = data.length > 6;
    
    if (shouldRotate) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={10} textAnchor="end" fill="#fff" fontSize={11} transform="rotate(-45)">
            {text}
          </text>
        </g>
      );
    }
    
    const maxCharsPerLine = 12;
    
    if (text.length <= maxCharsPerLine) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#fff" fontSize={12}>
            {text}
          </text>
        </g>
      );
    }
    
    const words = text.split(' ');
    let line1 = '';
    let line2 = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line1 + (line1 ? ' ' : '') + words[i];
      if (testLine.length > maxCharsPerLine && line1) {
        line2 = words.slice(i).join(' ');
        break;
      } else {
        line1 = testLine;
      }
    }
    
    if (!line2 && line1.length > maxCharsPerLine) {
      line2 = line1.substring(maxCharsPerLine);
      line1 = line1.substring(0, maxCharsPerLine);
    }
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#fff" fontSize={12}>
          {line1}
        </text>
        {line2 && (
          <text x={0} y={0} dy={26} textAnchor="middle" fill="#fff" fontSize={12}>
            {line2}
          </text>
        )}
      </g>
    );
  };

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
          zIndex: isDragging ? 9999 : zIndex,
        }}
        onMouseDown={() => {
          // Bring to front on any click
          if (onBringToFront) {
            onBringToFront();
          }
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
            onEditData={handleOpenDataEditor}
            onSettings={() => setShowSettings(true)}
            isReadOnly={isReadOnly}
          />
          <button
            onClick={() => setShowSPC(!showSPC)}
            className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
              showSPC
                ? 'bg-green-500/40 text-green-300'
                : 'bg-green-500/20 hover:bg-green-500/40 text-green-400'
            }`}
            title="Analyze with SPC"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {showSPC ? 'Hide SPC' : 'Analyze with SPC'}
          </button>
          {onDuplicate && !isReadOnly && (
            <button
              onClick={handleDuplicate}
              className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
              title="Duplicate"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
          {onDelete && !isReadOnly && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          )}
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
              onBlur={handleTitleBlur}
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
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: data.length > 6 ? 70 : 50, left: 0 }} barSize={getBarSize()}>
            {settings.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />}
            <XAxis dataKey="name" stroke="#fff" tick={<CustomXAxisTick />} interval={0} />
            <YAxis stroke="#fff" domain={[0, yAxisMax]} />
            {settings.showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Bar dataKey="value" animationDuration={settings.animationDuration} radius={[8, 8, 0, 0]}>
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
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
        key={modalKey}
        isOpen={showDataEditor}
        onClose={() => setShowDataEditor(false)}
        currentData={data}
        currentColors={colors}
        onSave={handleSaveData}
        isReadOnly={isReadOnly}
      />

      <ChartSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          saveData();
        }}
        isReadOnly={isReadOnly}
      />

      {showSPC && (
        <div style={{
          position: 'absolute',
          top: `${position.y + chartHeight + 60}px`,
          left: `${position.x}px`,
          width: `${chartWidth}px`,
          zIndex: zIndex + 1
        }}>
          <SPCPanel
            data={data}
            chartType="bar"
            onClose={() => setShowSPC(false)}
            initialLimits={spcLimits}
            onLimitsChange={handleSPCLimitsChange}
          />
        </div>
      )}
    </>
  );
}