"use client";
import { useState, useRef, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Minus, Edit2 } from "lucide-react";

interface KPIWidgetProps {
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

export default function KPIWidget({ 
  onDelete,
  onDuplicate,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  initialX = 0, 
  initialY = 0,
  initialWidth = 300,
  initialHeight = 180,
  maxWidth = 1200,
  initialData
}: KPIWidgetProps) {
  const [title, setTitle] = useState(initialData?.title || "Total Revenue");
  const [value, setValue] = useState(initialData?.value || "124.5");
  const [unit, setUnit] = useState(initialData?.unit || "K");
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>(initialData?.trend || 'up');
  const [trendValue, setTrendValue] = useState(initialData?.trendValue || "12.5");
  const [bgColor, setBgColor] = useState(initialData?.bgColor || "rgba(59, 130, 246, 0.2)");
  const [textColor, setTextColor] = useState(initialData?.textColor || "#ffffff");
  const [accentColor, setAccentColor] = useState(initialData?.accentColor || "#3b82f6");
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Load initial data from AI
  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.value) setValue(initialData.value);
      if (initialData.unit) setUnit(initialData.unit);
      if (initialData.trend) setTrend(initialData.trend);
      if (initialData.trendValue) setTrendValue(initialData.trendValue);
      if (initialData.bgColor) setBgColor(initialData.bgColor);
      if (initialData.textColor) setTextColor(initialData.textColor);
      if (initialData.accentColor) setAccentColor(initialData.accentColor);
    }
  }, [initialData]);

  // Save data function
  const saveData = () => {
    if (onDataChange) {
      onDataChange({
        title,
        value,
        unit,
        trend,
        trendValue,
        bgColor,
        textColor,
        accentColor
      });
    }
  };

  // Save when data changes
  useEffect(() => {
    saveData();
  }, [title, value, unit, trend, trendValue, bgColor, textColor, accentColor]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-color-picker-button]')) {
          setShowColorPicker(false);
        }
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColorPicker]);

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input')) {
      return;
    }
    
    if (isEditingTitle || isEditingValue) return;
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
    const startHeight = height;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        let newWidth = width;
        let newHeight = height;

        if (direction.includes('s')) {
          newHeight = Math.max(150, Math.min(600, startHeight + deltaY));
          setHeight(newHeight);
        } else if (direction.includes('n')) {
          newHeight = Math.max(150, Math.min(600, startHeight - deltaY));
          setHeight(newHeight);
        }

        if (direction.includes('e')) {
          newWidth = Math.max(250, Math.min(maxWidth, startWidth + deltaX));
          setWidth(newWidth);
        } else if (direction.includes('w')) {
          newWidth = Math.max(250, Math.min(maxWidth, startWidth - deltaX));
          setWidth(newWidth);
        }

        onSizeChange?.(newWidth, newHeight);
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setHoveredEdge(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const bgColors = [
    { name: 'Blue', color: 'rgba(59, 130, 246, 0.2)' },
    { name: 'Purple', color: 'rgba(139, 92, 246, 0.2)' },
    { name: 'Green', color: 'rgba(16, 185, 129, 0.2)' },
    { name: 'Red', color: 'rgba(239, 68, 68, 0.2)' },
    { name: 'Orange', color: 'rgba(245, 158, 11, 0.2)' },
    { name: 'Pink', color: 'rgba(236, 72, 153, 0.2)' },
    { name: 'Teal', color: 'rgba(20, 184, 166, 0.2)' },
    { name: 'Gray', color: 'rgba(100, 116, 139, 0.2)' },
  ];

  const accentColors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', 
    '#f59e0b', '#ec4899', '#14b8a6', '#64748b'
  ];

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={20} className="text-green-400" />;
    if (trend === 'down') return <TrendingDown size={20} className="text-red-400" />;
    return <Minus size={20} className="text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <>
      <div 
        ref={containerRef}
        className={`group rounded-2xl border-2 backdrop-blur-xl ${
          isDragging ? 'border-blue-400' : 'border-white/20 hover:border-white/30'
        } ${isResizing || isDragging ? 'select-none' : ''}`}
        style={{ 
          width: `${width}px`,
          height: `${height}px`,
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: isDragging ? 1000 : 1,
          backgroundColor: bgColor,
          transition: isDragging || isResizing ? 'none' : 'all 0.2s',
        }}
      >
        {/* Drag Handle */}
        <div 
          onMouseDown={startDrag}
          className="absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing bg-gradient-to-r from-transparent via-white/5 to-transparent hover:via-white/10 transition-all rounded-t-2xl"
        />

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <button
            data-color-picker-button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-blue-500 text-white transition-all flex items-center justify-center"
            title="Edit Colors"
          >
            <Edit2 size={14} />
          </button>
          {onDuplicate && (
            <button 
              onClick={onDuplicate}
              className="w-7 h-7 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-white transition-all flex items-center justify-center"
              title="Duplicate"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500 text-white transition-all flex items-center justify-center"
            title="Delete"
          >
            <X size={14} />
          </button>
        </div>

        {/* Color Picker Modal */}
        {showColorPicker && (
          <div 
            ref={colorPickerRef}
            className="absolute top-12 right-2 bg-slate-900 border border-white/20 rounded-xl p-4 shadow-2xl z-20 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-white text-xs mb-2 font-semibold">Background</p>
              <div className="grid grid-cols-4 gap-2">
                {bgColors.map(bg => (
                  <button
                    key={bg.name}
                    onClick={() => setBgColor(bg.color)}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      bgColor === bg.color ? 'border-white ring-2 ring-blue-400' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: bg.color }}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-white text-xs mb-2 font-semibold">Accent Color</p>
              <div className="grid grid-cols-4 gap-2">
                {accentColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      accentColor === color ? 'border-white ring-2 ring-blue-400' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-white text-xs mb-2 font-semibold">Trend</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTrend('up')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    trend === 'up' ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <TrendingUp size={16} />
                </button>
                <button
                  onClick={() => setTrend('down')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    trend === 'down' ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <TrendingDown size={16} />
                </button>
                <button
                  onClick={() => setTrend('neutral')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    trend === 'neutral' ? 'bg-gray-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Minus size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-full flex flex-col justify-center items-center p-6 pt-10">
          {/* Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-white/10 border border-white/40 rounded-lg px-3 py-1 text-white text-sm font-medium focus:outline-none focus:border-blue-500 text-center mb-4"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-white/70 text-sm font-medium mb-4 cursor-text hover:text-white transition-colors"
              style={{ color: textColor, opacity: 0.8 }}
            >
              {title}
            </h3>
          )}

          {/* Value */}
          <div className="flex items-baseline gap-2 mb-3">
            {isEditingValue ? (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => setIsEditingValue(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setIsEditingValue(false);
                }}
                autoFocus
                className="bg-white/10 border border-white/40 rounded-lg px-3 py-2 text-white text-4xl font-bold focus:outline-none focus:border-blue-500 text-center w-32"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                onDoubleClick={() => setIsEditingValue(true)}
                className="text-5xl font-bold cursor-text hover:opacity-80 transition-opacity"
                style={{ color: accentColor }}
              >
                {value}
              </span>
            )}
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-transparent border-none text-2xl font-semibold text-white/60 focus:outline-none w-12 text-left"
              placeholder="K"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Trend */}
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <input
              type="text"
              value={trendValue}
              onChange={(e) => setTrendValue(e.target.value)}
              className={`bg-transparent border-none text-sm font-semibold ${getTrendColor()} focus:outline-none w-16 text-center`}
              placeholder="0"
              onClick={(e) => e.stopPropagation()}
            />
            <span className={`text-sm ${getTrendColor()}`}>%</span>
          </div>
        </div>

        {/* Resize Handles */}
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
    </>
  );
}