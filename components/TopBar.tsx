"use client";
import AddChartButton from "./AddChartButton";

interface TopBarProps {
  onAddWidget: (type: string) => void;
}

export default function TopBar({ onAddWidget }: TopBarProps) {
  return (
    <header className="h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-between px-6 border border-white/10 shadow-xl relative z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">Main Dashboard</h1>
        <button className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
          Rename
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <AddChartButton onAddChart={onAddWidget} />
      </div>
    </header>
  );
}