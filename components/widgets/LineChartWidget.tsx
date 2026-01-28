"use client";
import { useState, useRef, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { X, Check } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface DataPoint {
  name: string;
  value: number;
  comment?: string;
}

interface LineChartWidgetProps {
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

export default function LineChartWidget({ 
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
}: LineChartWidgetProps) {
  const [title, setTitle] = useState(initialData?.title || "Line Chart");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [data, setData] = useState<DataPoint[]>(initialData?.data || [
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 600 },
    { name: "Apr", value: 800 },
    { name: "May", value: 500 },
    { name: "Jun", value: 700 },
  ]);
  const [lineColor, setLineColor] = useState(initialData?.colors?.[0] || "#3b82f6");
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

  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [boxPosition, setBoxPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load initial data from AI
  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.data) setData(initialData.data);
      if (initialData.colors && initialData.colors[0]) setLineColor(initialData.colors[0]);
      if (initialData.settings) setSettings(initialData.settings);
    }
  }, [initialData]);

  // Save data function
  const saveData = () => {
    if (onDataChange) {
      onDataChange({
        title,
        data,
        colors: [lineColor],
        settings
      });
    }
  };

  // Save when data changes
  useEffect(() => {
    saveData();
  }, [title, data, lineColor, settings]);

  const handleSaveData = (newData: any[], newColors: string[]) => {
    setData(newData);
    setLineColor(newColors[0]);
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

  const startHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
      setIsEditingComment(false);
    }, 300);
  };

  const cancelHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handlePointHover = (index: number, cx: number, cy: number) => {
    cancelHideTimer();
    setHoveredPoint(index);
    setBoxPosition({ x: cx + 20, y: cy - 20 });
    if (!isEditingComment) {
      setCommentText(data[index].comment || "");
    }
  };

  const saveComment = () => {
    if (hoveredPoint !== null) {
      const newData = [...data];
      const trimmed = commentText.trim();
      
      if (trimmed === "") {
        const { comment, ...rest } = newData[hoveredPoint];
        newData[hoveredPoint] = rest as DataPoint;
      } else {
        newData[hoveredPoint] = { ...newData[hoveredPoint], comment: trimmed };
      }
      
      setData(newData);
      setIsEditingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveComment();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setHoveredPoint(null);
        setIsEditingComment(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const maxValue = Math.max(...data.map(d => d.value));
  const yAxisMax = Math.ceil(maxValue * 1.2);

  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    const hasComment = data[index]?.comment;
    const isHovered = hoveredPoint === index;

    return (
      <g
        onMouseEnter={() => handlePointHover(index, cx, cy)}
        onMouseLeave={startHideTimer}
      >
        <circle
          cx={cx}
          cy={cy}
          r={isHovered ? 10 : 8}
          fill={lineColor}
          stroke="white"
          strokeWidth={2}
          className="cursor-pointer transition-all"
        />
        {hasComment && (
          <circle
            cx={cx + 10}
            cy={cy - 10}
            r={5}
            fill="#f59e0b"
            stroke="white"
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  };

  return (
    <>
      <div 
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

        <div className="relative">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
              {settings.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />}
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" domain={[0, yAxisMax]} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={lineColor} 
                strokeWidth={3} 
                animationDuration={settings.animationDuration}
                dot={<CustomDot />}
                activeDot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {hoveredPoint !== null && (
            <div
              ref={boxRef}
              className="absolute bg-slate-900 border border-white/20 rounded-lg p-3 shadow-2xl z-50 w-56"
              style={{
                left: `${boxPosition.x}px`,
                top: `${boxPosition.y}px`,
              }}
              onMouseEnter={cancelHideTimer}
              onMouseLeave={startHideTimer}
            >
              <div className="mb-2">
                <p className="text-white font-semibold text-sm">{data[hoveredPoint].name}</p>
                <p className="text-blue-400 text-xs">Value: {data[hoveredPoint].value}</p>
              </div>

              {isEditingComment ? (
                <div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Add a comment..."
                    autoFocus
                    className="w-full px-2 py-1.5 bg-white/10 border border-white/30 rounded text-white text-xs focus:outline-none focus:border-blue-500 resize-none mb-2"
                    rows={3}
                  />
                  <button
                    onClick={saveComment}
                    className="w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-xs transition-all flex items-center justify-center gap-1"
                  >
                    <Check size={12} />
                    Save (Enter)
                  </button>
                </div>
              ) : (
                <div>
                  {data[hoveredPoint].comment && (
                    <div className="bg-white/10 rounded p-2 mb-2">
                      <p className="text-white text-xs">{data[hoveredPoint].comment}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setIsEditingComment(true)}
                    className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-all"
                  >
                    {data[hoveredPoint].comment ? "Edit Comment" : "Add Comment"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
        isOpen={showDataEditor}
        onClose={() => setShowDataEditor(false)}
        currentData={data}
        currentColors={[lineColor]}
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