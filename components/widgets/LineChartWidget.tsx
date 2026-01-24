"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface LineChartWidgetProps {
  onDelete: () => void;
}

export default function LineChartWidget({ onDelete }: LineChartWidgetProps) {
  const [title, setTitle] = useState("Line Chart");
  const [data, setData] = useState([
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 600 },
    { name: "Apr", value: 800 },
    { name: "May", value: 500 },
    { name: "Jun", value: 700 },
  ]);
  const [colors, setColors] = useState(["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"]);
  const [settings, setSettings] = useState({
    showGrid: true,
    showLegend: false,
    showTooltip: true,
    animationDuration: 800
  });

  const [showDataEditor, setShowDataEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleEditTitle = () => {
    const newTitle = prompt("Enter new title:", title);
    if (newTitle) setTitle(newTitle);
  };

  const handleSaveData = (newData: any[], newColors: string[]) => {
    setData(newData);
    setColors(newColors);
  };

  return (
    <>
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 relative group hover:border-white/30 transition-all duration-300">
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <WidgetEditMenu
            onEditTitle={handleEditTitle}
            onEditData={() => setShowDataEditor(true)}
            onSettings={() => setShowSettings(true)}
          />
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 hover:scale-110 text-white transition-all duration-200 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <h3 className="text-white font-semibold mb-4">{title}</h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            {settings.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />}
            <XAxis dataKey="name" stroke="#fff" />
            <YAxis stroke="#fff" />
            {settings.showTooltip && (
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }} 
              />
            )}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={colors[0]} 
              strokeWidth={2} 
              animationDuration={settings.animationDuration}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <DataEditorModal
        isOpen={showDataEditor}
        onClose={() => setShowDataEditor(false)}
        currentData={data}
        currentColors={colors}
        onSave={handleSaveData}
      />

      <ChartSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={setSettings}
      />
    </>
  );
}