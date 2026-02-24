"use client";
import { Sparkles, Share2 } from "lucide-react";
import AddChartButton from "./AddChartButton";

interface TopBarProps {
  onAddWidget: (type: string) => void;
  projectName: string;
  onOpenAI: () => void;
  onShareClick: () => void;  // ✅ ADD THIS
}

export default function TopBar({ onAddWidget, projectName, onOpenAI, onShareClick }: TopBarProps) {
  return (
    <header className="h-16 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-between px-6 border border-white/10 shadow-xl relative z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">{projectName}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onShareClick}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/20"
        >
          <Share2 size={18} />
          <span>Share</span>
        </button>
        <button
          onClick={onOpenAI}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Sparkles size={18} />
          AI Generate
        </button>
        <AddChartButton onAddChart={onAddWidget} />
      </div>
    </header>
  );
}