"use client";
import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Settings, Palette, Save, ArrowDown, ArrowRight } from "lucide-react";

interface TableWidgetProps {
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

interface Cell {
  value: string;
}

export default function TableWidget({ 
  onDelete,
  onDuplicate,
  onPositionChange, 
  onSizeChange,
  onDataChange,
  initialX = 0, 
  initialY = 0,
  initialWidth = 700,
  initialHeight = 500,
  maxWidth = 1200,
  initialData
}: TableWidgetProps) {
  // NORMALIZE AI DATA - ONLY 3 LINES CHANGED (28-56)
  const normalizeRows = (data: any): Cell[][] => {
    const defaultRows = [
      [{ value: "Product" }, { value: "Q1" }, { value: "Q2" }, { value: "Q3" }],
      [{ value: "Widget A" }, { value: "120" }, { value: "135" }, { value: "150" }],
      [{ value: "Widget B" }, { value: "95" }, { value: "110" }, { value: "125" }],
      [{ value: "Widget C" }, { value: "80" }, { value: "90" }, { value: "100" }],
    ];
    
    if (!data) return defaultRows;
    if (!Array.isArray(data)) return defaultRows;
    if (data.length === 0) return defaultRows;
    
    return data.map(row => {
      if (!Array.isArray(row)) return [{ value: '' }];
      return row.map(cell => {
        if (typeof cell === 'object' && cell !== null && 'value' in cell) {
          return { value: String(cell.value) };
        }
        return { value: String(cell || '') };
      });
    });
  };

  const [title, setTitle] = useState(initialData?.title || "Data Table");
  const [rows, setRows] = useState<Cell[][]>(normalizeRows(initialData?.rows));
  
  // Column and row sizing
  const [columnWidths, setColumnWidths] = useState<number[]>(
    initialData?.columnWidths || [180, 120, 120, 120]
  );
  const [rowHeights, setRowHeights] = useState<number[]>(
    initialData?.rowHeights || Array(4).fill(44)
  );
  
  // Colors
  const [headerBgColor, setHeaderBgColor] = useState(initialData?.headerBgColor || "#3b82f6");
  const [rowBgColor, setRowBgColor] = useState(initialData?.rowBgColor || "rgba(255, 255, 255, 0.05)");
  const [alternateRowColor, setAlternateRowColor] = useState(initialData?.alternateRowColor || "rgba(255, 255, 255, 0.02)");
  const [textColor, setTextColor] = useState(initialData?.textColor || "#ffffff");
  const [borderColor, setBorderColor] = useState(initialData?.borderColor || "rgba(255, 255, 255, 0.1)");
  
  // Individual row/column colors
  const [customRowColors, setCustomRowColors] = useState<{[key: number]: string}>(initialData?.customRowColors || {});
  const [customColumnColors, setCustomColumnColors] = useState<{[key: number]: string}>(initialData?.customColumnColors || {});
  
  // Individual row/column text colors
  const [customRowTextColors, setCustomRowTextColors] = useState<{[key: number]: string}>(initialData?.customRowTextColors || {});
  const [customColumnTextColors, setCustomColumnTextColors] = useState<{[key: number]: string}>(initialData?.customColumnTextColors || {});
  
  // Bold state for rows and columns
  const [customRowBold, setCustomRowBold] = useState<{[key: number]: boolean}>(initialData?.customRowBold || {});
  const [customColumnBold, setCustomColumnBold] = useState<{[key: number]: boolean}>(initialData?.customColumnBold || {});
  
  // Cell-specific colors (stored as "row-col": color)
  const [customCellColors, setCustomCellColors] = useState<{[key: string]: string}>(initialData?.customCellColors || {});
  const [customCellTextColors, setCustomCellTextColors] = useState<{[key: string]: string}>(initialData?.customCellTextColors || {});
  const [customCellBold, setCustomCellBold] = useState<{[key: string]: boolean}>(initialData?.customCellBold || {});
  
  // Text sizes
  const [customRowTextSizes, setCustomRowTextSizes] = useState<{[key: number]: number}>(initialData?.customRowTextSizes || {});
  const [customColumnTextSizes, setCustomColumnTextSizes] = useState<{[key: number]: number}>(initialData?.customColumnTextSizes || {});
  const [customCellTextSizes, setCustomCellTextSizes] = useState<{[key: string]: number}>(initialData?.customCellTextSizes || {});
  
  // UI State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [headerColorMode, setHeaderColorMode] = useState<'cell' | 'row' | 'column'>('cell');
  
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  
  // Resizing columns/rows
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const editPanelRef = useRef<HTMLDivElement>(null);

  // Click outside to close edit panel and deselect rows/columns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (showEditPanel && editPanelRef.current && !editPanelRef.current.contains(target as Node)) {
        if (!target.closest('[data-settings-button]')) {
          setShowEditPanel(false);
        }
      }
      
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        setSelectedRow(null);
        setSelectedColumn(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEditPanel]);

  const saveData = () => {
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors,
        customRowTextColors,
        customColumnTextColors,
        customRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex].value = value;
    setRows(newRows);
    saveData();
  };

  const addRow = () => {
    const newRow = rows[0].map(() => ({ value: "" }));
    setRows([...rows, newRow]);
    setRowHeights([...rowHeights, 44]);
    saveData();
  };

  const addColumn = () => {
    const newRows = rows.map(row => [...row, { value: "" }]);
    setRows(newRows);
    setColumnWidths([...columnWidths, 120]);
    saveData();
  };

  const deleteRow = (rowIndex: number) => {
    if (rows.length > 2) {
      const newRows = rows.filter((_, i) => i !== rowIndex);
      const newRowHeights = rowHeights.filter((_, i) => i !== rowIndex);
      setRows(newRows);
      setRowHeights(newRowHeights);
      
      const newCustomRowColors = { ...customRowColors };
      delete newCustomRowColors[rowIndex];
      setCustomRowColors(newCustomRowColors);
      
      const newCustomRowTextColors = { ...customRowTextColors };
      delete newCustomRowTextColors[rowIndex];
      setCustomRowTextColors(newCustomRowTextColors);
      
      const newCustomRowBold = { ...customRowBold };
      delete newCustomRowBold[rowIndex];
      setCustomRowBold(newCustomRowBold);
      
      const newCustomRowTextSizes = { ...customRowTextSizes };
      delete newCustomRowTextSizes[rowIndex];
      setCustomRowTextSizes(newCustomRowTextSizes);
      
      const newCustomCellColors = { ...customCellColors };
      const newCustomCellTextColors = { ...customCellTextColors };
      const newCustomCellBold = { ...customCellBold };
      const newCustomCellTextSizes = { ...customCellTextSizes };
      
      Object.keys(newCustomCellColors).forEach(key => {
        if (key.startsWith(`${rowIndex}-`)) {
          delete newCustomCellColors[key];
          delete newCustomCellTextColors[key];
          delete newCustomCellBold[key];
          delete newCustomCellTextSizes[key];
        }
      });
      
      setCustomCellColors(newCustomCellColors);
      setCustomCellTextColors(newCustomCellTextColors);
      setCustomCellBold(newCustomCellBold);
      setCustomCellTextSizes(newCustomCellTextSizes);
      
      if (selectedRow === rowIndex) setSelectedRow(null);
      saveData();
    }
  };

  const deleteColumn = (colIndex: number) => {
    if (rows[0].length > 2) {
      const newRows = rows.map(row => row.filter((_, i) => i !== colIndex));
      const newColumnWidths = columnWidths.filter((_, i) => i !== colIndex);
      setRows(newRows);
      setColumnWidths(newColumnWidths);
      
      const newCustomColumnColors = { ...customColumnColors };
      delete newCustomColumnColors[colIndex];
      setCustomColumnColors(newCustomColumnColors);
      
      const newCustomColumnTextColors = { ...customColumnTextColors };
      delete newCustomColumnTextColors[colIndex];
      setCustomColumnTextColors(newCustomColumnTextColors);
      
      const newCustomColumnBold = { ...customColumnBold };
      delete newCustomColumnBold[colIndex];
      setCustomColumnBold(newCustomColumnBold);
      
      const newCustomColumnTextSizes = { ...customColumnTextSizes };
      delete newCustomColumnTextSizes[colIndex];
      setCustomColumnTextSizes(newCustomColumnTextSizes);
      
      const newCustomCellColors = { ...customCellColors };
      const newCustomCellTextColors = { ...customCellTextColors };
      const newCustomCellBold = { ...customCellBold };
      const newCustomCellTextSizes = { ...customCellTextSizes };
      
      Object.keys(newCustomCellColors).forEach(key => {
        const [, col] = key.split('-');
        if (parseInt(col) === colIndex) {
          delete newCustomCellColors[key];
          delete newCustomCellTextColors[key];
          delete newCustomCellBold[key];
          delete newCustomCellTextSizes[key];
        }
      });
      
      setCustomCellColors(newCustomCellColors);
      setCustomCellTextColors(newCustomCellTextColors);
      setCustomCellBold(newCustomCellBold);
      setCustomCellTextSizes(newCustomCellTextSizes);
      
      if (selectedColumn === colIndex) setSelectedColumn(null);
      saveData();
    }
  };

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button') || 
        (e.target as HTMLElement)?.closest('input') ||
        (e.target as HTMLElement)?.closest('td') ||
        (e.target as HTMLElement)?.closest('.edit-panel')) {
      return;
    }
    
    if (isEditingTitle || editingCell) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = Math.max(0, moveEvent.clientX - startX);
      const newY = Math.max(0, moveEvent.clientY - startY);
      setPosition({ x: newX, y: newY });
      onPositionChange?.(newX, newY);
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
          newHeight = Math.max(300, Math.min(1000, startHeight + deltaY));
          setHeight(newHeight);
        } else if (direction.includes('n')) {
          newHeight = Math.max(300, Math.min(1000, startHeight - deltaY));
          setHeight(newHeight);
        }

        if (direction.includes('e')) {
          newWidth = Math.max(500, Math.min(maxWidth, startWidth + deltaX));
          setWidth(newWidth);
        } else if (direction.includes('w')) {
          newWidth = Math.max(500, Math.min(maxWidth, startWidth - deltaX));
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

  const startColumnResize = (colIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(colIndex);
    
    const startX = e.clientX;
    const startWidth = columnWidths[colIndex];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + delta);
      const newWidths = [...columnWidths];
      newWidths[colIndex] = newWidth;
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      saveData();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startRowResize = (rowIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRow(rowIndex);
    
    const startY = e.clientY;
    const startHeight = rowHeights[rowIndex];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(32, startHeight + delta);
      const newHeights = [...rowHeights];
      newHeights[rowIndex] = newHeight;
      setRowHeights(newHeights);
    };

    const handleMouseUp = () => {
      setResizingRow(null);
      saveData();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const setRowColor = (rowIndex: number, color: string) => {
    const newCustomRowColors = { ...customRowColors };
    if (color === 'default') {
      delete newCustomRowColors[rowIndex];
    } else {
      newCustomRowColors[rowIndex] = color;
    }
    setCustomRowColors(newCustomRowColors);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors: newCustomRowColors,
        customColumnColors,
        customRowTextColors,
        customColumnTextColors,
        customRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const setColumnColor = (colIndex: number, color: string) => {
    const newCustomColumnColors = { ...customColumnColors };
    if (color === 'default') {
      delete newCustomColumnColors[colIndex];
    } else {
      newCustomColumnColors[colIndex] = color;
    }
    setCustomColumnColors(newCustomColumnColors);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors: newCustomColumnColors,
        customRowTextColors,
        customColumnTextColors,
        customRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const setRowTextColor = (rowIndex: number, color: string) => {
    const newCustomRowTextColors = { ...customRowTextColors };
    if (color === 'default') {
      delete newCustomRowTextColors[rowIndex];
    } else {
      newCustomRowTextColors[rowIndex] = color;
    }
    setCustomRowTextColors(newCustomRowTextColors);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors,
        customRowTextColors: newCustomRowTextColors,
        customColumnTextColors,
        customRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const setColumnTextColor = (colIndex: number, color: string) => {
    const newCustomColumnTextColors = { ...customColumnTextColors };
    if (color === 'default') {
      delete newCustomColumnTextColors[colIndex];
    } else {
      newCustomColumnTextColors[colIndex] = color;
    }
    setCustomColumnTextColors(newCustomColumnTextColors);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors,
        customRowTextColors,
        customColumnTextColors: newCustomColumnTextColors,
        customRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const toggleRowBold = (rowIndex: number) => {
    const newCustomRowBold = { ...customRowBold };
    newCustomRowBold[rowIndex] = !newCustomRowBold[rowIndex];
    setCustomRowBold(newCustomRowBold);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors,
        customRowTextColors,
        customColumnTextColors,
        customRowBold: newCustomRowBold,
        customColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const toggleColumnBold = (colIndex: number) => {
    const newCustomColumnBold = { ...customColumnBold };
    newCustomColumnBold[colIndex] = !newCustomColumnBold[colIndex];
    setCustomColumnBold(newCustomColumnBold);
    
    if (onDataChange) {
      onDataChange({
        title,
        rows,
        columnWidths,
        rowHeights,
        headerBgColor,
        rowBgColor,
        alternateRowColor,
        textColor,
        borderColor,
        customRowColors,
        customColumnColors,
        customRowTextColors,
        customColumnTextColors,
        customRowBold,
        customColumnBold: newCustomColumnBold,
        customCellColors,
        customCellTextColors,
        customCellBold,
        customRowTextSizes,
        customColumnTextSizes,
        customCellTextSizes
      });
    }
  };

  const handleRowClick = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (showEditPanel) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('input') || 
        target.closest('button') ||
        target.closest('.cell-content') ||
        target.classList.contains('resize-handle') ||
        target.closest('.resize-handle')) {
      return;
    }
    
    if (selectedRow === rowIndex && selectedColumn === colIndex) {
      setSelectedRow(null);
      setSelectedColumn(null);
    } else {
      setSelectedRow(rowIndex);
      setSelectedColumn(colIndex);
    }
  };

  const handleColumnClick = (colIndex: number, e: React.MouseEvent) => {
    if (showEditPanel) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('input') || 
        target.closest('button') ||
        target.closest('.cell-content') ||
        target.classList.contains('resize-handle') ||
        target.closest('.resize-handle')) {
      return;
    }
    
    if (selectedRow === 0 && selectedColumn === colIndex) {
      setSelectedRow(null);
      setSelectedColumn(null);
    } else {
      setSelectedRow(0);
      setSelectedColumn(colIndex);
    }
  };

  const colorPresets = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Gray', value: '#64748b' },
    { name: 'Dark', value: 'rgba(0, 0, 0, 0.4)' },
    { name: 'Light', value: 'rgba(255, 255, 255, 0.1)' },
  ];

  const getCellBackgroundColor = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (customCellColors[cellKey]) {
      return customCellColors[cellKey];
    }
    if (customRowColors[rowIndex]) {
      return customRowColors[rowIndex];
    }
    if (customColumnColors[colIndex]) {
      return customColumnColors[colIndex];
    }
    if (rowIndex === 0) {
      return headerBgColor;
    }
    return rowIndex % 2 === 0 ? alternateRowColor : rowBgColor;
  };

  const getCellTextColor = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (customCellTextColors[cellKey]) {
      return customCellTextColors[cellKey];
    }
    if (customRowTextColors[rowIndex]) {
      return customRowTextColors[rowIndex];
    }
    if (customColumnTextColors[colIndex]) {
      return customColumnTextColors[colIndex];
    }
    return textColor;
  };

  const getCellFontWeight = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    
    if (customCellBold[cellKey] !== undefined) {
      return customCellBold[cellKey] ? '700' : '400';
    }
    
    if (rowIndex === 0) {
      if (customColumnBold[colIndex] !== undefined) {
        return customColumnBold[colIndex] ? '700' : '600';
      }
      if (customRowBold[rowIndex] !== undefined) {
        return customRowBold[rowIndex] ? '700' : '400';
      }
      return '600';
    }
    
    if (customRowBold[rowIndex]) {
      return '700';
    }
    if (customColumnBold[colIndex]) {
      return '700';
    }
    return '400';
  };

  const getCellFontSize = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (customCellTextSizes[cellKey]) {
      return customCellTextSizes[cellKey];
    }
    if (customRowTextSizes[rowIndex]) {
      return customRowTextSizes[rowIndex];
    }
    if (customColumnTextSizes[colIndex]) {
      return customColumnTextSizes[colIndex];
    }
    return 13;
  };

  return (
    <>
      <div 
        ref={containerRef}
        className={`group rounded-xl border-2 backdrop-blur-xl ${
          isDragging ? 'border-blue-400 shadow-2xl' : 'border-white/20 hover:border-white/30'
        } ${isResizing || isDragging ? 'select-none' : ''}`}
        style={{ 
          width: `${width}px`,
          height: `${height}px`,
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: isDragging ? 1000 : 1,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          transition: isDragging || isResizing ? 'none' : 'all 0.2s',
        }}
      >
        <div 
          onMouseDown={startDrag}
          className="absolute top-0 left-0 right-0 h-3 cursor-grab active:cursor-grabbing bg-gradient-to-r from-transparent via-white/10 to-transparent hover:via-white/20 transition-all"
          style={{ borderRadius: '12px 12px 0 0' }}
        />

        <div className="absolute top-4 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <button
            data-settings-button
            onClick={() => setShowEditPanel(!showEditPanel)}
            className={`w-8 h-8 rounded-lg ${showEditPanel ? 'bg-blue-500' : 'bg-white/10 hover:bg-blue-500/80'} text-white transition-all flex items-center justify-center shadow-lg`}
            title="Edit Settings"
          >
            <Settings size={16} />
          </button>
          {onDuplicate && (
            <button 
              onClick={onDuplicate}
              className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-white transition-all flex items-center justify-center shadow-lg"
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
            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 text-white transition-all flex items-center justify-center shadow-lg"
            title="Delete"
          >
            <X size={16} />
          </button>
        </div>

        {showEditPanel && (
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-xl z-[90]"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {showEditPanel && (
          <div 
            ref={editPanelRef}
            className="edit-panel absolute top-16 right-2 bg-slate-900/95 border-2 border-white/20 rounded-xl p-4 shadow-2xl z-[100] max-h-[calc(100%-100px)] overflow-y-auto w-80 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
          >
            {(selectedRow !== null || selectedColumn !== null) && (
              <>
                <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <p className="text-white text-sm font-medium">
                      {selectedRow !== null && selectedColumn !== null
                        ? `${selectedRow === 0 ? 'Header' : `R${selectedRow}`} • C${selectedColumn + 1}`
                        : 'No Selection'
                      }
                    </p>
                  </div>
                  
                  <div className="mb-4 p-2.5 bg-slate-800/40 rounded-lg border border-white/5">
                    <label className="text-xs text-gray-400 block mb-2">Apply to:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setHeaderColorMode('cell')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          headerColorMode === 'cell'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                        }`}
                      >
                        Cell
                      </button>
                      <button
                        onClick={() => setHeaderColorMode('row')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          headerColorMode === 'row'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                        }`}
                      >
                        Row
                      </button>
                      <button
                        onClick={() => setHeaderColorMode('column')}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          headerColorMode === 'column'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                        }`}
                      >
                        Column
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-xs text-gray-400 block mb-2">Background</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {colorPresets.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            const cellKey = `${selectedRow}-${selectedColumn}`;
                            if (headerColorMode === 'cell') {
                              const newCustomCellColors = { ...customCellColors };
                              newCustomCellColors[cellKey] = preset.value;
                              setCustomCellColors(newCustomCellColors);
                            } else if (headerColorMode === 'row' && selectedRow !== null) {
                              setRowColor(selectedRow, preset.value);
                            } else if (headerColorMode === 'column' && selectedColumn !== null) {
                              setColumnColor(selectedColumn, preset.value);
                            }
                            saveData();
                          }}
                          className="h-7 rounded-md border border-white/20 transition-all hover:scale-110 hover:border-white/50 shadow-sm"
                          style={{ backgroundColor: preset.value }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">Text</label>
                      <div className="relative">
                        <input
                          type="color"
                          value={
                            headerColorMode === 'cell'
                              ? (customCellTextColors[`${selectedRow}-${selectedColumn}`] || getCellTextColor(selectedRow!, selectedColumn!))
                              : headerColorMode === 'row' && selectedRow !== null
                                ? (customRowTextColors[selectedRow] || textColor)
                                : (customColumnTextColors[selectedColumn!] || textColor)
                          }
                          onChange={(e) => {
                            const cellKey = `${selectedRow}-${selectedColumn}`;
                            if (headerColorMode === 'cell') {
                              const newCustomCellTextColors = { ...customCellTextColors };
                              newCustomCellTextColors[cellKey] = e.target.value;
                              setCustomCellTextColors(newCustomCellTextColors);
                            } else if (headerColorMode === 'row' && selectedRow !== null) {
                              setRowTextColor(selectedRow, e.target.value);
                            } else if (headerColorMode === 'column' && selectedColumn !== null) {
                              setColumnTextColor(selectedColumn, e.target.value);
                            }
                            saveData();
                          }}
                          className="w-full h-7 rounded-md cursor-pointer border border-white/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">Border</label>
                      <div className="relative">
                        <input
                          type="color"
                          value={borderColor}
                          onChange={(e) => {
                            setBorderColor(e.target.value);
                            saveData();
                          }}
                          className="w-full h-7 rounded-md cursor-pointer border border-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-xs text-gray-400 block mb-2">Size</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={
                          headerColorMode === 'cell'
                            ? (customCellTextSizes[`${selectedRow}-${selectedColumn}`] || getCellFontSize(selectedRow!, selectedColumn!))
                            : headerColorMode === 'row' && selectedRow !== null
                              ? (customRowTextSizes[selectedRow] || 13)
                              : (customColumnTextSizes[selectedColumn!] || 13)
                        }
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          const cellKey = `${selectedRow}-${selectedColumn}`;
                          if (headerColorMode === 'cell') {
                            const newCustomCellTextSizes = { ...customCellTextSizes };
                            newCustomCellTextSizes[cellKey] = value;
                            setCustomCellTextSizes(newCustomCellTextSizes);
                          } else if (headerColorMode === 'row' && selectedRow !== null) {
                            const newCustomRowTextSizes = { ...customRowTextSizes };
                            newCustomRowTextSizes[selectedRow] = value;
                            setCustomRowTextSizes(newCustomRowTextSizes);
                          } else if (headerColorMode === 'column' && selectedColumn !== null) {
                            const newCustomColumnTextSizes = { ...customColumnTextSizes };
                            newCustomColumnTextSizes[selectedColumn] = value;
                            setCustomColumnTextSizes(newCustomColumnTextSizes);
                          }
                          saveData();
                        }}
                        className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <span className="text-white text-xs font-mono w-9 text-right bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {headerColorMode === 'cell'
                          ? (customCellTextSizes[`${selectedRow}-${selectedColumn}`] || getCellFontSize(selectedRow!, selectedColumn!))
                          : headerColorMode === 'row' && selectedRow !== null
                            ? (customRowTextSizes[selectedRow] || 13)
                            : (customColumnTextSizes[selectedColumn!] || 13)
                        }px
                      </span>
                    </div>
                  </div>

                  {headerColorMode !== 'cell' && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-400 block mb-2">
                        {headerColorMode === 'row' ? 'Height' : 'Width'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={headerColorMode === 'row' ? "32" : "60"}
                          max={headerColorMode === 'row' ? "120" : "400"}
                          value={
                            headerColorMode === 'row' && selectedRow !== null
                              ? rowHeights[selectedRow]
                              : columnWidths[selectedColumn!]
                          }
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (headerColorMode === 'row' && selectedRow !== null) {
                              const newHeights = [...rowHeights];
                              newHeights[selectedRow] = value;
                              setRowHeights(newHeights);
                            } else if (headerColorMode === 'column' && selectedColumn !== null) {
                              const newWidths = [...columnWidths];
                              newWidths[selectedColumn] = value;
                              setColumnWidths(newWidths);
                            }
                            saveData();
                          }}
                          className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-white text-xs font-mono w-11 text-right bg-slate-700/50 px-1.5 py-0.5 rounded">
                          {headerColorMode === 'row' && selectedRow !== null
                            ? rowHeights[selectedRow]
                            : columnWidths[selectedColumn!]
                          }px
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <button
                      onClick={() => {
                        const cellKey = `${selectedRow}-${selectedColumn}`;
                        if (headerColorMode === 'cell') {
                          const newCustomCellBold = { ...customCellBold };
                          newCustomCellBold[cellKey] = !newCustomCellBold[cellKey];
                          setCustomCellBold(newCustomCellBold);
                        } else if (headerColorMode === 'row' && selectedRow !== null) {
                          toggleRowBold(selectedRow);
                        } else if (headerColorMode === 'column' && selectedColumn !== null) {
                          toggleColumnBold(selectedColumn);
                        }
                        saveData();
                      }}
                      className={`w-full px-3 py-2 rounded-md text-white text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                        (headerColorMode === 'cell'
                          ? customCellBold[`${selectedRow}-${selectedColumn}`]
                          : headerColorMode === 'row' && selectedRow !== null
                            ? customRowBold[selectedRow]
                            : customColumnBold[selectedColumn!])
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-slate-700/50 hover:bg-slate-600/50'
                      }`}
                    >
                      <span className="font-bold text-sm">B</span>
                      {(headerColorMode === 'cell'
                        ? customCellBold[`${selectedRow}-${selectedColumn}`]
                        : headerColorMode === 'row' && selectedRow !== null
                          ? customRowBold[selectedRow]
                          : customColumnBold[selectedColumn!])
                        ? 'Bold'
                        : 'Make Bold'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const cellKey = `${selectedRow}-${selectedColumn}`;
                      if (headerColorMode === 'cell') {
                        const newCustomCellColors = { ...customCellColors };
                        const newCustomCellTextColors = { ...customCellTextColors };
                        const newCustomCellBold = { ...customCellBold };
                        const newCustomCellTextSizes = { ...customCellTextSizes };
                        delete newCustomCellColors[cellKey];
                        delete newCustomCellTextColors[cellKey];
                        delete newCustomCellBold[cellKey];
                        delete newCustomCellTextSizes[cellKey];
                        setCustomCellColors(newCustomCellColors);
                        setCustomCellTextColors(newCustomCellTextColors);
                        setCustomCellBold(newCustomCellBold);
                        setCustomCellTextSizes(newCustomCellTextSizes);
                      } else if (headerColorMode === 'row' && selectedRow !== null) {
                        setRowColor(selectedRow, 'default');
                        setRowTextColor(selectedRow, 'default');
                        const newCustomRowBold = { ...customRowBold };
                        const newCustomRowTextSizes = { ...customRowTextSizes };
                        delete newCustomRowBold[selectedRow];
                        delete newCustomRowTextSizes[selectedRow];
                        setCustomRowBold(newCustomRowBold);
                        setCustomRowTextSizes(newCustomRowTextSizes);
                      } else if (headerColorMode === 'column' && selectedColumn !== null) {
                        setColumnColor(selectedColumn, 'default');
                        setColumnTextColor(selectedColumn, 'default');
                        const newCustomColumnBold = { ...customColumnBold };
                        const newCustomColumnTextSizes = { ...customColumnTextSizes };
                        delete newCustomColumnBold[selectedColumn];
                        delete newCustomColumnTextSizes[selectedColumn];
                        setCustomColumnBold(newCustomColumnBold);
                        setCustomColumnTextSizes(newCustomColumnTextSizes);
                      }
                      saveData();
                    }}
                    className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-md text-white text-xs font-medium transition-all shadow-sm"
                  >
                    Reset
                  </button>
                </div>
                <div className="border-t border-white/10 my-4" />
              </>
            )}

            {selectedRow === null && selectedColumn === null && (
              <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-blue-300 text-xs leading-relaxed">
                  💡 Click on any cell in the table to select it, then customize its appearance here. You can apply changes to just that cell, the entire row, or the entire column.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-white text-sm font-semibold">Global Settings</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Text</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      saveData();
                    }}
                    className="w-full h-7 rounded-md cursor-pointer border border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Border</label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => {
                      setBorderColor(e.target.value);
                      saveData();
                    }}
                    className="w-full h-7 rounded-md cursor-pointer border border-white/20"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowEditPanel(false)}
              className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} />
              Done
            </button>
          </div>
        )}

        <div className="px-4 pt-6 pb-3">
          {isEditingTitle ? (
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
              className="bg-white/10 border border-white/40 rounded-lg px-3 py-2 text-white text-base font-semibold focus:outline-none focus:border-blue-500 w-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 
              onDoubleClick={() => setIsEditingTitle(true)}
              className="text-white font-semibold text-base cursor-text hover:text-blue-400 transition-colors"
              title="Double-click to edit"
            >
              {title}
            </h3>
          )}
        </div>

        <div 
          className="px-4 pb-4 overflow-auto" 
          style={{ height: 'calc(100% - 70px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRow(null);
              setSelectedColumn(null);
            }
          }}
        >
          <div className="relative">
            <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
              <thead>
                <tr>
                  {rows[0]?.map((cell, colIndex) => (
                    <th
                      key={colIndex}
                      onClick={(e) => handleColumnClick(colIndex, e)}
                      className={`relative group/header cursor-pointer transition-all ${
                        selectedColumn === colIndex ? 'ring-2 ring-blue-400 ring-inset' : ''
                      }`}
                      style={{ 
                        backgroundColor: getCellBackgroundColor(0, colIndex),
                        color: getCellTextColor(0, colIndex),
                        fontWeight: getCellFontWeight(0, colIndex),
                        fontSize: `${getCellFontSize(0, colIndex)}px`,
                        padding: '12px',
                        textAlign: 'left',
                        borderRight: colIndex < rows[0].length - 1 ? `1px solid ${borderColor}` : 'none',
                        borderBottom: `2px solid ${borderColor}`,
                        width: `${columnWidths[colIndex]}px`,
                        height: `${rowHeights[0]}px`,
                        position: 'relative'
                      }}
                    >
                      {editingCell?.row === 0 && editingCell?.col === colIndex ? (
                        <input
                          type="text"
                          value={cell.value}
                          onChange={(e) => handleCellChange(0, colIndex, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="bg-white/20 border border-white/40 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                          style={{ color: getCellTextColor(0, colIndex) }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => setEditingCell({ row: 0, col: colIndex })}
                          onClick={(e) => e.stopPropagation()}
                          className="cell-content cursor-text min-h-[20px] w-full"
                          title="Double-click to edit"
                        >
                          {cell.value || '\u00A0'}
                        </div>
                      )}
                      
                      {colIndex > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteColumn(colIndex);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center justify-center shadow-lg z-10"
                          title="Delete Column"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      )}
                      
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startColumnResize(colIndex)(e);
                        }}
                        className={`resize-handle absolute top-0 h-full transition-colors ${
                          resizingColumn === colIndex ? 'bg-blue-400 cursor-col-resize z-50' : 'cursor-col-resize hover:bg-blue-400/50 z-20'
                        }`}
                        style={{ 
                          right: '-8px',
                          width: '16px',
                          pointerEvents: 'auto'
                        }}
                        title="Drag to resize column"
                      />
                    </th>
                  ))}
                  <th 
                    style={{ 
                      backgroundColor: headerBgColor,
                      padding: '12px',
                      width: '50px',
                      borderBottom: `2px solid ${borderColor}`,
                      position: 'relative'
                    }}
                  >
                    <button
                      onClick={addColumn}
                      className="w-full h-7 bg-green-500/30 hover:bg-green-500 rounded-lg flex items-center justify-center transition-all group"
                      title="Add Column"
                    >
                      <ArrowRight size={14} className="text-white" />
                    </button>
                    
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        startRowResize(0)(e);
                      }}
                      className={`resize-handle absolute -bottom-1 h-3 cursor-row-resize transition-colors ${
                        resizingRow === 0 ? 'bg-blue-400 z-50' : 'hover:bg-blue-400/50 z-20'
                      }`}
                      style={{ 
                        left: `-${columnWidths.reduce((sum, w) => sum + w, 0)}px`,
                        right: '-50px',
                        pointerEvents: 'auto'
                      }}
                      title="Drag to resize header row"
                    />
                  </th>
                  
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="group/row">
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        onClick={(e) => handleRowClick(rowIndex + 1, colIndex, e)}
                        className={`relative cursor-pointer transition-all ${
                          selectedRow === rowIndex + 1 && selectedColumn === colIndex ? 'ring-2 ring-blue-400 ring-inset' : ''
                        }`}
                        style={{ 
                          backgroundColor: getCellBackgroundColor(rowIndex + 1, colIndex),
                          color: getCellTextColor(rowIndex + 1, colIndex),
                          fontWeight: getCellFontWeight(rowIndex + 1, colIndex),
                          fontSize: `${getCellFontSize(rowIndex + 1, colIndex)}px`,
                          padding: '10px 12px',
                          borderRight: colIndex < row.length - 1 ? `1px solid ${borderColor}` : 'none',
                          borderBottom: `1px solid ${borderColor}`,
                          height: `${rowHeights[rowIndex + 1]}px`
                        }}
                      >
                        {editingCell?.row === rowIndex + 1 && editingCell?.col === colIndex ? (
                          <input
                            type="text"
                            value={cell.value}
                            onChange={(e) => handleCellChange(rowIndex + 1, colIndex, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="bg-white/10 border border-white/40 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                            style={{ color: getCellTextColor(rowIndex + 1, colIndex) }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => setEditingCell({ row: rowIndex + 1, col: colIndex })}
                            onClick={(e) => e.stopPropagation()}
                            className="cell-content cursor-text min-h-[20px] w-full"
                            title="Double-click to edit"
                          >
                            {cell.value || '\u00A0'}
                          </div>
                        )}
                      </td>
                    ))}
                    <td 
                      style={{ 
                        backgroundColor: getCellBackgroundColor(rowIndex + 1, 0),
                        padding: '10px 12px',
                        paddingRight: '8px',
                        borderBottom: `1px solid ${borderColor}`,
                        position: 'relative',
                        textAlign: 'right'
                      }}
                    >
                      <div className="flex justify-end">
                        <button
                          onClick={() => deleteRow(rowIndex + 1)}
                          className="w-6 h-6 bg-red-500/20 hover:bg-red-500 rounded opacity-0 group-hover/row:opacity-100 transition-all flex items-center justify-center shadow-lg"
                          title="Delete Row"
                        >
                          <Trash2 size={14} className="text-white" />
                        </button>
                      </div>
                      
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          startRowResize(rowIndex + 1)(e);
                        }}
                        className={`resize-handle absolute -bottom-1 h-3 cursor-row-resize transition-colors ${
                          resizingRow === rowIndex + 1 ? 'bg-blue-400 z-50' : 'hover:bg-blue-400/50 z-20'
                        }`}
                        style={{ 
                          left: `-${columnWidths.reduce((sum, w) => sum + w, 0)}px`,
                          right: '-50px',
                          pointerEvents: 'auto'
                        }}
                        title="Drag to resize row"
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td 
                    colSpan={rows[0].length + 1}
                    style={{ 
                      padding: '8px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${borderColor}`
                    }}
                  >
                    <button
                      onClick={addRow}
                      className="w-full py-2 bg-green-500/20 hover:bg-green-500 rounded-lg text-white transition-all flex items-center justify-center gap-1 group"
                      title="Add Row"
                    >
                      <ArrowDown size={14} />
                      <span className="text-xs font-medium">Add Row</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div onMouseDown={startResize('nw')} onMouseEnter={() => setHoveredEdge('nw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize" />
        <div onMouseDown={startResize('ne')} onMouseEnter={() => setHoveredEdge('ne')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 -right-1 w-4 h-4 cursor-nesw-resize" />
        <div onMouseDown={startResize('sw')} onMouseEnter={() => setHoveredEdge('sw')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -left-1 w-4 h-4 cursor-nesw-resize" />
        <div onMouseDown={startResize('se')} onMouseEnter={() => setHoveredEdge('se')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize" />
        <div onMouseDown={startResize('n')} onMouseEnter={() => setHoveredEdge('n')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -top-1 left-4 right-4 h-2 cursor-ns-resize" />
        <div onMouseDown={startResize('s')} onMouseEnter={() => setHoveredEdge('s')} onMouseLeave={() => setHoveredEdge(null)} className="absolute -bottom-1 left-4 right-4 h-2 cursor-ns-resize" />
        <div onMouseDown={startResize('w')} onMouseEnter={() => setHoveredEdge('w')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -left-1 w-2 cursor-ew-resize" />
        <div onMouseDown={startResize('e')} onMouseEnter={() => setHoveredEdge('e')} onMouseLeave={() => setHoveredEdge(null)} className="absolute top-4 bottom-4 -right-1 w-2 cursor-ew-resize" />

        {hoveredEdge === 'n' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-t-xl pointer-events-none" />}
        {hoveredEdge === 's' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400/50 rounded-b-xl pointer-events-none" />}
        {hoveredEdge === 'w' && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-l-xl pointer-events-none" />}
        {hoveredEdge === 'e' && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-400/50 rounded-r-xl pointer-events-none" />}
      </div>
    </>
  );
}