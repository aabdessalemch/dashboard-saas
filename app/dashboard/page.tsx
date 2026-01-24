"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import DashboardCanvas from "../../components/DashboardCanvas";

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<string[]>([]);

  const addWidget = (type: string) => {
    setWidgets([...widgets, type]);
  };

  const deleteWidget = (index: number) => {
    setWidgets(widgets.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Soft Animated Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />
      
      {/* Content */}
      <div className="relative z-10 flex w-full p-4 gap-4">
        <Sidebar />
        
        <div className="flex-1 flex flex-col gap-4">
          <TopBar onAddWidget={addWidget} />
          <DashboardCanvas 
            widgets={widgets} 
            onDeleteWidget={deleteWidget}
            onAddWidget={addWidget}
          />
        </div>
      </div>
    </div>
  );
}