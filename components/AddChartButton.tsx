"use client";
import { useState } from "react";
import { Plus, PieChart, LineChart, BarChart3, TrendingUp } from "lucide-react";

interface AddChartButtonProps {
  onAddChart: (type: string) => void;
}

export default function AddChartButton({ onAddChart }: AddChartButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const chartTypes = [
    { name: "Pie Chart", icon: PieChart, color: "bg-blue-50 text-blue-600", type: "pie" },
    { name: "Line Chart", icon: LineChart, color: "bg-green-50 text-green-600", type: "line" },
    { name: "Bar Chart", icon: BarChart3, color: "bg-purple-50 text-purple-600", type: "bar" },
    { name: "Trend Chart", icon: TrendingUp, color: "bg-orange-50 text-orange-600", type: "trend" },
  ];

  const handleAddChart = (type: string) => {
    onAddChart(type);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center hover:bg-gray-800 transition"
      >
        <Plus size={20} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-2xl border z-20">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-gray-900">Add Chart</p>
              <p className="text-xs text-gray-500 mt-1">Choose a chart type</p>
            </div>

            <div className="p-2">
              {chartTypes.map((chart) => {
                const Icon = chart.icon;
                return (
                  <button
                    key={chart.type}
                    onClick={() => handleAddChart(chart.type)}
                    className="w-full px-3 py-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className={`w-10 h-10 rounded-lg ${chart.color} flex items-center justify-center`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {chart.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}