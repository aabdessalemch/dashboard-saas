"use client";
import { useState, useRef, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Minus, Settings } from "lucide-react";

interface KPIWidgetProps {
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

export default function KPIWidget({ 
  onDelete,
  onDuplicate,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  onBringToFront,
  initialX = 0, 
  initialY = 0,
  initialWidth = 300,
  initialHeight = 180,
  initialZIndex = 1,
  maxWidth = 1200,
  initialData,
  isReadOnly = false
}: KPIWidgetProps) {
  const [title, setTitle] = useState(initialData?.title || "KPI Metric");
  const [value, setValue] = useState(initialData?.value || "1,234");
  const [change, setChange] = useState(initialData?.change || "+12.5%");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "from-blue-500/20 to-purple-600/20");
  const [arrowColor, setArrowColor] = useState(initialData?.arrowColor || "auto");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [isEditingChange, setIsEditingChange] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [zIndex, setZIndex] = useState(initialZIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [cardWidth, setCardWidth] = useState(initialWidth);
  const [cardHeight, setCardHeight] = useState(initialHeight);

  // Add this after all useState declarations
const settingsPanelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (showSettings && settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) {
      // Check if click is not on the settings button itself
      const target = event.target as HTMLElement;
      if (!target.closest('button[title="Settings"]')) {
        setShowSettings(false);
      }
    }
  };

  if (showSettings) {
    document.addEventListener('mousedown', handleClickOutside);
  }

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showSettings]);


  const bgColorOptions = [
    { name: "Blue Purple", value: "from-blue-500/20 to-purple-600/20", preview: "bg-gradient-to-br from-blue-500 to-purple-600" },
    { name: "Green Teal", value: "from-green-500/20 to-teal-600/20", preview: "bg-gradient-to-br from-green-500 to-teal-600" },
    { name: "Pink Rose", value: "from-pink-500/20 to-rose-600/20", preview: "bg-gradient-to-br from-pink-500 to-rose-600" },
    { name: "Orange Red", value: "from-orange-500/20 to-red-600/20", preview: "bg-gradient-to-br from-orange-500 to-red-600" },
    { name: "Indigo Blue", value: "from-indigo-500/20 to-blue-600/20", preview: "bg-gradient-to-br from-indigo-500 to-blue-600" },
    { name: "Yellow Orange", value: "from-yellow-500/20 to-orange-600/20", preview: "bg-gradient-to-br from-yellow-500 to-orange-600" },
    { name: "Purple Fuchsia", value: "from-purple-500/20 to-fuchsia-600/20", preview: "bg-gradient-to-br from-purple-500 to-fuchsia-600" },
    { name: "Cyan Blue", value: "from-cyan-500/20 to-blue-600/20", preview: "bg-gradient-to-br from-cyan-500 to-blue-600" },
  ];

  const arrowColorOptions = [
    { name: "Auto", value: "auto", color: "bg-gradient-to-r from-green-400 to-red-400" },
    { name: "Green", value: "text-green-400", color: "bg-green-400" },
    { name: "Red", value: "text-red-400", color: "bg-red-400" },
    { name: "Blue", value: "text-blue-400", color: "bg-blue-400" },
    { name: "Yellow", value: "text-yellow-400", color: "bg-yellow-400" },
    { name: "Purple", value: "text-purple-400", color: "bg-purple-400" },
    { name: "Orange", value: "text-orange-400", color: "bg-orange-400" },
    { name: "Gray", value: "text-gray-400", color: "bg-gray-400" },
  ];

  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.value) setValue(initialData.value);
      if (initialData.change) setChange(initialData.change);
      if (initialData.bgColor) setBgColor(initialData.bgColor);
      if (initialData.arrowColor) setArrowColor(initialData.arrowColor);
    }
  }, []);

  useEffect(() => {
    setZIndex(initialZIndex);
  }, [initialZIndex]);

  const saveData = () => {
    if (onDataChange) {
      onDataChange({ title, value, change, bgColor, arrowColor });
    }
  };

  const getTrendIcon = () => {
    if (change.includes('+')) return <TrendingUp size={20} />;
    if (change.includes('-')) return <TrendingDown size={20} />;
    return <Minus size={20} />;
  };

  const getTrendColor = () => {
    if (arrowColor !== "auto") return arrowColor;
    if (change.includes('+')) return 'text-green-400';
    if (change.includes('-')) return 'text-red-400';
    return 'text-gray-400';
  };

  const startDrag = (e: React.MouseEvent) => {
    if (isReadOnly || (e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input') ||
        (e.target as HTMLElement)?.closest('.settings-panel')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (onBringToFront) onBringToFront();
    
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = Math.max(0, moveEvent.clientX - startX);
      const newY = Math.max(0, moveEvent.clientY - startY);
      setPosition({ x: newX, y: newY });
      if (onPositionChange) onPositionChange(newX, newY);
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

    if (onBringToFront) onBringToFront();

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = cardHeight;
    const startWidth = cardWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        let newWidth = cardWidth;
        let newHeight = cardHeight;

        if (direction.includes('s')) {
          newHeight = Math.max(160, Math.min(600, startHeight + deltaY));
          setCardHeight(newHeight);
        } else if (direction.includes('n')) {
          newHeight = Math.max(160, Math.min(600, startHeight - deltaY));
          setCardHeight(newHeight);
        }

        if (direction.includes('e')) {
          newWidth = Math.max(280, Math.min(maxWidth, startWidth + deltaX));
          setCardWidth(newWidth);
        } else if (direction.includes('w')) {
          newWidth = Math.max(280, Math.min(maxWidth, startWidth - deltaX));
          setCardWidth(newWidth);
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

  return (
    <>
      <div 
        className={`bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl border border-white/20 p-6 group hover:border-white/30 transition-all duration-200 ${isDragging || isResizing ? 'select-none' : ''}`}
        style={{ 
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          minWidth: '280px',
          minHeight: '160px',
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: isDragging ? 9999 : zIndex,
          transition: isResizing || isDragging ? 'none' : 'all 0.2s',
        }}
        onMouseDownCapture={() => {
          if (onBringToFront) onBringToFront();
        }}
      >
        <div 
          onMouseDown={startDrag}
          className="absolute top-0 left-0 right-0 h-3 cursor-grab active:cursor-grabbing bg-gradient-to-r from-transparent via-white/10 to-transparent hover:via-white/20 transition-all"
          style={{ borderRadius: '16px 16px 0 0' }}
        />

        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          {!isReadOnly && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          )}
          {onDuplicate && !isReadOnly && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDuplicate();
              }}
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

        <div className="h-full flex flex-col justify-between">
          <div>
            {isEditingTitle && !isReadOnly ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  saveData();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setIsEditingTitle(false);
                    saveData();
                  }
                }}
                autoFocus
                className="bg-white/10 border border-white/40 rounded-lg px-2 py-1 text-white/70 text-sm focus:outline-none focus:border-blue-500 w-full"
              />
            ) : (
              <p 
                onDoubleClick={() => !isReadOnly && setIsEditingTitle(true)}
                className={`text-white/70 text-sm font-medium ${!isReadOnly ? 'cursor-text hover:text-blue-400' : 'cursor-default'} transition-colors`}
              >
                {title}
              </p>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center">
            {isEditingValue ? (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => {
                  setIsEditingValue(false);
                  saveData();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setIsEditingValue(false);
                    saveData();
                  }
                }}
                autoFocus
                className="bg-white/10 border border-white/40 rounded-lg px-3 py-2 text-white text-4xl font-bold focus:outline-none focus:border-blue-500 text-center w-full"
              />
            ) : (
              <h2 
                onDoubleClick={() => setIsEditingValue(true)}
                className="text-white text-5xl font-bold cursor-text hover:text-blue-400 transition-colors"
              >
                {value}
              </h2>
            )}
          </div>

          <div className="flex items-center justify-center">
            {isEditingChange ? (
              <input
                type="text"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                onBlur={() => {
                  setIsEditingChange(false);
                  saveData();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    setIsEditingChange(false);
                    saveData();
                  }
                }}
                autoFocus
                className="bg-white/10 border border-white/40 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 text-center w-full"
              />
            ) : (
              <div 
                onDoubleClick={() => setIsEditingChange(true)}
                className="flex items-center gap-2 cursor-text"
              >
                <span className={`${getTrendColor()}`}>{getTrendIcon()}</span>
                <span className={`${getTrendColor()} font-semibold`}>{change}</span>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handles */}
        <div onMouseDown={startResize('nw')} onMouseEnter={() => setHoveredEdge('nw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize z-20" />
        <div onMouseDown={startResize('ne')} onMouseEnter={() => setHoveredEdge('ne')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -right-1 w-4 h-4 cursor-nesw-resize z-20" />
        <div onMouseDown={startResize('sw')} onMouseEnter={() => setHoveredEdge('sw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -left-1 w-4 h-4 cursor-nesw-resize z-20" />
        <div onMouseDown={startResize('se')} onMouseEnter={() => setHoveredEdge('se')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize z-20" />
        <div onMouseDown={startResize('n')} onMouseEnter={() => setHoveredEdge('n')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 left-4 right-4 h-2 cursor-ns-resize z-20" />
        <div onMouseDown={startResize('s')} onMouseEnter={() => setHoveredEdge('s')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 left-4 right-4 h-2 cursor-ns-resize z-20" />
        <div onMouseDown={startResize('w')} onMouseEnter={() => setHoveredEdge('w')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -left-1 w-2 cursor-ew-resize z-20" />
        <div onMouseDown={startResize('e')} onMouseEnter={() => setHoveredEdge('e')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -right-1 w-2 cursor-ew-resize z-20" />

        {hoveredEdge === 'n' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-t-2xl pointer-events-none" />}
        {hoveredEdge === 's' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-b-2xl pointer-events-none" />}
        {hoveredEdge === 'w' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-l-2xl pointer-events-none" />}
        {hoveredEdge === 'e' && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-r-2xl pointer-events-none" />}
      </div>

      {/* Settings Panel */}
{showSettings && (
  <div 
    ref={settingsPanelRef}
    className="settings-panel absolute bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 p-4 shadow-2xl z-[10000]"
    style={{
      left: `${position.x + cardWidth + 10}px`,
      top: `${position.y}px`,
      width: '240px',
    }}
    onClick={(e) => e.stopPropagation()}
  >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold text-sm">KPI Settings</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-xs font-medium mb-2">Background</label>
              <div className="grid grid-cols-4 gap-2">
                {bgColorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setBgColor(option.value);
                      saveData();
                    }}
                    className={`w-10 h-10 rounded-lg ${option.preview} transition-all ${
                      bgColor === option.value 
                        ? 'ring-2 ring-white scale-110' 
                        : 'hover:scale-105'
                    }`}
                    title={option.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-xs font-medium mb-2">Arrow Color</label>
              <div className="grid grid-cols-4 gap-2">
                {arrowColorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setArrowColor(option.value);
                      saveData();
                    }}
                    className={`w-10 h-10 rounded-lg ${option.color} transition-all ${
                      arrowColor === option.value 
                        ? 'ring-2 ring-white scale-110' 
                        : 'hover:scale-105'
                    }`}
                    title={option.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}