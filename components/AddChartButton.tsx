"use client";
import { useState } from "react";
import { Plus } from "lucide-react";

interface AddChartButtonProps {
  onAddChart: (type: string) => void;
}

export default function AddChartButton({ onAddChart }: AddChartButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuItemClick = (type: string) => {
    onAddChart(type);
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
      >
        <Plus size={18} />
        Add Widget
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
          <div 
            className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("table");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              Table
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("kpi");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              KPI Card
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("line");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Line Chart
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("bar");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              Bar Chart
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("pie");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              Pie Chart
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("trend");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              Trend Chart
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMenuItemClick("text");
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Text Box
            </button>
          </div>
        </>
      )}
    </div>
  );
}