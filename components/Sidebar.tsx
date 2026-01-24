"use client";
import { Plus } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-72 bg-white/5 backdrop-blur-2xl rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-2xl">
      <div className="px-6 py-6">
        <h2 className="text-2xl font-semibold text-white">DashGen</h2>
      </div>
      
      <div className="flex-1 px-4 pb-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Projects
          </p>
          <button className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors">
            <Plus size={14} className="text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-1">
          <div className="px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer text-white text-sm transition-all">
            Factory Scrap Analysis
          </div>
          <div className="px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer text-white text-sm transition-all">
            Quality KPIs Dashboard
          </div>
          <div className="px-3 py-2.5 rounded-xl hover:bg-white/10 cursor-pointer text-white text-sm transition-all">
            Production Line A
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            JD
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">John Doe</p>
            <p className="text-xs text-gray-400">john@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}