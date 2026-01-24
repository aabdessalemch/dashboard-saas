"use client";
import { useState } from "react";
import { MoreVertical, Type, Database, Settings } from "lucide-react";

interface WidgetEditMenuProps {
  onEditTitle: () => void;
  onEditData: () => void;
  onSettings: () => void;
}

export default function WidgetEditMenu({ 
  onEditTitle,
  onEditData, 
  onSettings 
}: WidgetEditMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: Type, label: "Edit Title", action: onEditTitle },
    { icon: Database, label: "Edit Data", action: onEditData },
    { icon: Settings, label: "Chart Settings", action: onSettings },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 hover:scale-110 text-white flex items-center justify-center transition-all duration-200"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-10 right-0 w-56 bg-slate-900 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-slideIn">
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-xs text-gray-400 font-medium">EDIT WIDGET</p>
            </div>
            
            <div className="p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 hover:scale-[1.02] rounded-lg transition-all duration-200 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                      <Icon size={16} className="text-gray-300" />
                    </div>
                    <span className="text-sm text-white">{item.label}</span>
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