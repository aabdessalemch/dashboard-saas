"use client";
import { useRef, useEffect, useState } from "react";
import LineChartWidget from "./widgets/LineChartWidget";
import BarChartWidget from "./widgets/BarChartWidget";
import PieChartWidget from "./widgets/PieChartWidget";
import TrendChartWidget from "./widgets/TrendChartWidget";
import TextWidget from "./widgets/TextWidget";
import KPIWidget from "./widgets/KPIWidget";
import TableWidget from "./widgets/TableWidget";
import { WidgetPosition } from "@/app/dashboard/page";

interface DashboardCanvasProps {
  widgets: WidgetPosition[];
  onDeleteWidget: (id: string) => void;
  onDuplicateWidget: (id: string) => void;
  onAddWidget: (type: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onUpdateData: (id: string, data: any) => void;
  onBringToFront?: (id: string) => void;
  permission?: 'owner' | 'editor' | 'viewer';
  activeSPCWidget?: {id: string, config: any} | null;
  onClearActiveSPC?: () => void;
}

export default function DashboardCanvas({ 
  widgets, 
  onDeleteWidget,
  onDuplicateWidget,
  onAddWidget,
  onUpdatePosition,
  onUpdateSize,
  onUpdateData,
  onBringToFront,
  permission = 'owner',
  activeSPCWidget,
  onClearActiveSPC
}: DashboardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const renderWidget = (widget: WidgetPosition) => {
    const commonProps = {
      onDelete: permission !== 'viewer' ? () => onDeleteWidget(widget.id) : undefined,
      onDuplicate: permission !== 'viewer' ? () => onDuplicateWidget(widget.id) : undefined,
      onPositionChange: permission !== 'viewer' ? (x: number, y: number) => onUpdatePosition(widget.id, x, y) : undefined,
      onSizeChange: permission !== 'viewer' ? (width: number, height: number) => onUpdateSize(widget.id, width, height) : undefined,
      onDataChange: permission !== 'viewer' ? (data: any) => onUpdateData(widget.id, data) : undefined,
      onBringToFront: permission !== 'viewer' && onBringToFront ? () => onBringToFront(widget.id) : undefined,
      initialX: widget.x,
      initialY: widget.y,
      initialWidth: widget.width,
      initialHeight: widget.height,
      initialZIndex: widget.zIndex || 1,
      initialData: widget.data,
      maxWidth: canvasWidth - 40,
      isReadOnly: permission === 'viewer',
      spcTrigger: activeSPCWidget?.id === widget.id ? activeSPCWidget.config : null,
      onSPCTriggered: activeSPCWidget?.id === widget.id ? onClearActiveSPC : undefined,
    };

    // Use _stableId as a consistent key that never changes during widget's lifetime
    const stableKey = widget._stableId || widget.id;

    switch (widget.type) {
      case "line":
        return <LineChartWidget key={stableKey} {...commonProps} />;
      case "bar":
        return <BarChartWidget key={stableKey} {...commonProps} />;
      case "pie":
        return <PieChartWidget key={stableKey} {...commonProps} />;
      case "trend":
        return <TrendChartWidget key={stableKey} {...commonProps} />;
      case "text":
        return <TextWidget key={stableKey} {...commonProps} />;
      case "kpi":
        return <KPIWidget key={stableKey} {...commonProps} />;
      case "table":
        return <TableWidget key={stableKey} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div 
      ref={canvasRef}
      className="flex-1 overflow-auto rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 relative"
    >
      {widgets.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-white/40 text-lg mb-2">No widgets yet</div>
            <div className="text-white/20 text-sm">Click "Add Widget" to get started</div>
          </div>
        </div>
      ) : (
        <>
          {widgets.map((widget) => renderWidget(widget))}
        </>
      )}
    </div>
  );
}