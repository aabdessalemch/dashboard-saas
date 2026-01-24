"use client";
import { Plus } from "lucide-react";
import PieChartWidget from "./widgets/PieChartWidget";
import LineChartWidget from "./widgets/LineChartWidget";
import BarChartWidget from "./widgets/BarChartWidget";
import TrendChartWidget from "./widgets/TrendChartWidget";

interface DashboardCanvasProps {
  widgets: string[];
  onDeleteWidget: (index: number) => void;
  onAddWidget?: (type: string) => void;
}

export default function DashboardCanvas({ widgets, onDeleteWidget, onAddWidget }: DashboardCanvasProps) {
  const renderWidget = (type: string, index: number) => {
    switch (type) {
      case "pie":
        return <PieChartWidget key={index} onDelete={() => onDeleteWidget(index)} />;
      case "line":
        return <LineChartWidget key={index} onDelete={() => onDeleteWidget(index)} />;
      case "bar":
        return <BarChartWidget key={index} onDelete={() => onDeleteWidget(index)} />;
      case "trend":
        return <TrendChartWidget key={index} onDelete={() => onDeleteWidget(index)} />;
      default:
        return null;
    }
  };

  const chartTypes = [
    { name: "Pie Chart", type: "pie" },
    { name: "Line Chart", type: "line" },
    { name: "Bar Chart", type: "bar" },
    { name: "Trend Chart", type: "trend" },
  ];

  return (
    <main className="flex-1 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-xl overflow-auto p-6">
      {widgets.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="group relative inline-block">
              <button className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-600 hover:border-white flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 peer">
                <Plus size={32} className="text-gray-300 group-hover:text-white transition-colors" />
              </button>

              {/* Dropdown appears on hover */}
              <div className="absolute top-24 left-1/2 -translate-x-1/2 w-64 bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="font-semibold text-white">Add Chart</p>
                  <p className="text-xs text-gray-400 mt-1">Choose a chart type</p>
                </div>

                <div className="p-2">
                  {chartTypes.map((chart) => (
                    <button
                      key={chart.type}
                      onClick={() => onAddWidget && onAddWidget(chart.type)}
                      className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/10 hover:scale-[1.02] rounded-lg transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Plus size={18} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {chart.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="font-medium text-lg text-gray-300 mt-6">Add your first widget</p>
            <p className="text-sm text-gray-500 mt-1">Click or hover the + button</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {widgets.map((widget, index) => renderWidget(widget, index))}
        </div>
      )}
    </main>
  );
}