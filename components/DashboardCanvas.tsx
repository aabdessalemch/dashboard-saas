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
}

export default function DashboardCanvas({ 
  widgets, 
  onDeleteWidget,
  onDuplicateWidget,
  onAddWidget,
  onUpdatePosition,
  onUpdateSize,
  onUpdateData
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
      onDelete: () => onDeleteWidget(widget.id),
      onDuplicate: () => onDuplicateWidget(widget.id),
      onPositionChange: (x: number, y: number) => onUpdatePosition(widget.id, x, y),
      onSizeChange: (width: number, height: number) => onUpdateSize(widget.id, width, height),
      onDataChange: (data: any) => onUpdateData(widget.id, data),
      initialX: widget.x,
      initialY: widget.y,
      initialWidth: widget.width,
      initialHeight: widget.height,
      initialData: widget.data,
      maxWidth: canvasWidth - 40,
    };

    switch (widget.type) {
      case "line":
        return <LineChartWidget key={widget.id} {...commonProps} />;
      case "bar":
        return <BarChartWidget key={widget.id} {...commonProps} />;
      case "pie":
        return <PieChartWidget key={widget.id} {...commonProps} />;
      case "trend":
        return <TrendChartWidget key={widget.id} {...commonProps} />;
      case "text":
        return <TextWidget key={widget.id} {...commonProps} />;
      case "kpi":
        return <KPIWidget key={widget.id} {...commonProps} />;
      case "table":
        return <TableWidget key={widget.id} {...commonProps} />;
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