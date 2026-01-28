"use client";
import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface TextWidgetProps {
  onDelete: () => void;
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

export default function TextWidget({ 
  onDelete,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  initialX = 0, 
  initialY = 0,
  initialWidth = 400,
  maxWidth = 1200,
  initialData
}: TextWidgetProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');
  const [boxBgColor, setBoxBgColor] = useState(initialData?.bgColor || 'rgba(30, 41, 59, 0.8)');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  
  const [width, setWidth] = useState(initialWidth);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  // Save current selection
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      const hasContent = editorRef.current.innerHTML && editorRef.current.innerHTML !== '';
      if (!hasContent) {
        if (initialData?.content) {
          editorRef.current.innerHTML = initialData.content;
        } else {
          editorRef.current.innerHTML = '<span style="color: rgba(255,255,255,0.4)">Click to add text...</span>';
        }
      }
    }
    setIsInitialized(true);
  }, []);

  const saveContent = () => {
    if (onDataChange && editorRef.current) {
      onDataChange({ 
        content: editorRef.current.innerHTML,
        bgColor: boxBgColor
      });
    }
  };

  useEffect(() => {
    if (isInitialized) {
      saveContent();
    }
  }, [boxBgColor, isInitialized]);

  const handleEditorClick = () => {
    setIsFocused(true);
    setShowToolbar(true);
    
    // Smart positioning: check if toolbar will be visible at bottom, otherwise use top
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const toolbarHeight = 60;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow < 100 && spaceAbove > toolbarHeight + 20) {
        setToolbarPosition('top');
      } else {
        setToolbarPosition('bottom');
      }
    }
    
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent === '<span style="color: rgba(255,255,255,0.4)">Click to add text...</span>') {
        editorRef.current.innerHTML = "";
      }
      setTimeout(() => {
        editorRef.current?.focus();
        updateFormattingState();
      }, 0);
    }
  };

  const updateFormattingState = () => {
    try {
      setIsBoldActive(document.queryCommandState('bold'));
      setIsItalicActive(document.queryCommandState('italic'));
    } catch (e) {
      // Ignore errors
    }
  };

  const handleSelectionChange = () => {
    if (isFocused) {
      updateFormattingState();
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isFocused]);

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsFocused(false);
      setShowToolbar(false);
      
      if (editorRef.current) {
        const text = editorRef.current.textContent?.trim();
        if (!text) {
          editorRef.current.innerHTML = '<span style="color: rgba(255,255,255,0.4)">Click to add text...</span>';
        }
        saveContent();
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused, boxBgColor]);

  const format = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setTimeout(() => {
      editorRef.current?.focus();
      updateFormattingState();
      saveContent();
    }, 10);
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    // Restore selection and focus
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Now apply the font
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('fontName', false, value);
      saveContent();
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    
    // Restore selection and focus
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Apply font size using a span wrapper since execCommand fontSize is limited
    if (editorRef.current) {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = size;
        
        try {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
          
          // Select the span content
          range.selectNodeContents(span);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (err) {
          console.error('Font size error:', err);
        }
      }
      
      saveContent();
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    
    // Restore selection and focus
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
    
    // Now apply the color
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('foreColor', false, color);
      saveContent();
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    // Don't drag if currently focused (editing mode)
    if (isFocused) {
      return;
    }
    
    // Skip drag if clicking on buttons or input
    if ((e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input') ||
        (e.target as HTMLElement)?.closest('select')) {
      return;
    }
    
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

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        const newWidth = Math.max(200, Math.min(maxWidth, startWidth + (moveEvent.clientX - startX)));
        setWidth(newWidth);
        if (onSizeChange) {
          onSizeChange(newWidth, containerRef.current?.offsetHeight || 60);
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const fonts = [
    'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
    'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Palatino', 'Garamond',
    'Bookman', 'Tahoma',
  ];

  const fontSizes = [
    '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px',
    '36px', '42px', '48px', '56px', '64px', '72px',
  ];

  const bgColors = [
    { name: 'Dark Gray', color: 'rgba(30, 41, 59, 0.8)' },
    { name: 'Black', color: 'rgba(0, 0, 0, 0.6)' },
    { name: 'Blue', color: 'rgba(59, 130, 246, 0.3)' },
    { name: 'Indigo', color: 'rgba(99, 102, 241, 0.3)' },
    { name: 'Purple', color: 'rgba(139, 92, 246, 0.3)' },
    { name: 'Pink', color: 'rgba(236, 72, 153, 0.3)' },
    { name: 'Red', color: 'rgba(239, 68, 68, 0.3)' },
    { name: 'Orange', color: 'rgba(245, 158, 11, 0.3)' },
    { name: 'Yellow', color: 'rgba(234, 179, 8, 0.3)' },
    { name: 'Green', color: 'rgba(16, 185, 129, 0.3)' },
    { name: 'Teal', color: 'rgba(20, 184, 166, 0.3)' },
    { name: 'Cyan', color: 'rgba(6, 182, 212, 0.3)' },
  ];

  return (
    <div 
      ref={containerRef}
      className={`group rounded-xl border-2 transition-all ${
        isFocused ? 'border-blue-400' : 'border-white/20 hover:border-white/40'
      } ${isDragging || isResizing ? 'select-none' : ''}`}
      style={{ 
        width: `${width}px`,
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isDragging ? 1000 : isFocused ? 999 : 1,
        backdropFilter: 'blur(10px)',
        backgroundColor: boxBgColor,
        transition: isDragging || isResizing ? 'none' : 'all 0.2s',
      }}
    >
      {/* Drag Handle - same style as BarChart */}
      <div 
        onMouseDown={startDrag}
        className={`absolute top-0 left-0 right-0 h-3 ${
          isFocused ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        } bg-gradient-to-r from-transparent via-white/10 to-transparent hover:via-white/20 transition-all`}
        style={{ borderRadius: '12px 12px 0 0' }}
      />

      {/* Toolbar */}
      {showToolbar && (
        <div
          className={`absolute ${toolbarPosition === 'top' ? '-top-30' : '-bottom-30'} left-0 bg-slate-900 border border-white/30 rounded-lg shadow-xl px-2 py-1.5 flex items-center gap-2 flex-wrap`}
          style={{ zIndex: 10, maxWidth: `${width}px` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <select 
            onChange={handleFontChange} 
            onMouseDown={(e) => {
              e.stopPropagation();
              saveSelection();
            }}
            className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600"
            defaultValue="Arial"
            onClick={(e) => e.stopPropagation()}
          >
            {fonts.map(font => (
              <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
            ))}
          </select>

          <select 
            onChange={handleFontSizeChange} 
            onMouseDown={(e) => {
              e.stopPropagation();
              saveSelection();
            }}
            className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600"
            defaultValue="16px"
            onClick={(e) => e.stopPropagation()}
          >
            {fontSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          
          <button 
            onClick={() => format('bold')} 
            className={`w-7 h-7 rounded text-xs font-bold transition-all ${
              isBoldActive ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-blue-500 text-white'
            }`}
          >
            B
          </button>
          <button 
            onClick={() => format('italic')} 
            className={`w-7 h-7 rounded text-xs italic transition-all ${
              isItalicActive ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-blue-500 text-white'
            }`}
          >
            I
          </button>          
          <div className="w-px h-6 bg-slate-600" />
          
          <div className="flex items-center gap-1">
            <span className="text-white text-xs">A</span>
            <input 
              type="color" 
              onChange={handleColorChange} 
              onMouseDown={(e) => {
                e.stopPropagation();
                saveSelection();
              }}
              className="w-7 h-7 cursor-pointer rounded border border-slate-600" 
              title="Text Color" 
              defaultValue="#ffffff"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="w-px h-6 bg-slate-600" />
          
          <div className="flex items-center gap-1 flex-wrap">
            {bgColors.map((bg) => (
              <button
                key={bg.name}
                onClick={() => setBoxBgColor(bg.color)}
                className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                  boxBgColor === bg.color ? 'border-white ring-2 ring-blue-400' : 'border-slate-600'
                }`}
                style={{ backgroundColor: bg.color }}
                title={bg.name}
              />
            ))}
          </div>
          
          <div className="w-px h-6 bg-slate-600" />
          
          <button onClick={() => format('justifyLeft')} className="w-7 h-7 bg-slate-700 hover:bg-blue-500 text-white rounded text-xs transition-all">⬅</button>
          <button onClick={() => format('justifyCenter')} className="w-7 h-7 bg-slate-700 hover:bg-blue-500 text-white rounded text-xs transition-all">↔</button>
          <button onClick={() => format('justifyRight')} className="w-7 h-7 bg-slate-700 hover:bg-blue-500 text-white rounded text-xs transition-all">➡</button>
        </div>
      )}

      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onDelete(); 
          }} 
          className="w-7 h-7 bg-red-500 hover:bg-red-600 hover:scale-110 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          <X size={14} />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onClick={(e) => {
          e.stopPropagation();
          handleEditorClick();
        }}
        onMouseDown={(e) => {
          if (isFocused) {
            e.stopPropagation();
          }
        }}
        onMouseUp={() => {
          // Save selection after user finishes selecting text
          if (isFocused) {
            saveSelection();
          }
        }}
        onKeyUp={() => {
          // Save selection after keyboard selection changes
          if (isFocused) {
            saveSelection();
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleEditorClick();
        }}
        onInput={saveContent}
        onBlur={saveContent}
        className={`min-h-[50px] p-3 pt-5 text-white outline-none ${isFocused ? 'cursor-text' : 'cursor-move'}`}
        suppressContentEditableWarning
      />

      <div 
        onMouseDown={startResize} 
        className="absolute top-0 bottom-0 -right-1 w-2 cursor-ew-resize hover:bg-blue-400/30 transition-all" 
      />
    </div>
  );
}