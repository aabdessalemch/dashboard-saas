"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface BarChartWidgetProps {
  onDelete: () => void;
}

export default function BarChartWidget({ onDelete }: BarChartWidgetProps) {
  const [title, setTitle] = useState("Bar Chart");
  const [data, setData] = useState([
    { name: "Product A", value: 400 },
    { name: "Product B", value: 300 },
    { name: "Product C", value: 600 },
    { name: "Product D", value: 800 },
    { name: "Product E", value: 500 },
  ]);
  const [colors, setColors] = useState(["#8b5cf6", "#a855f7", "#9333ea", "#7c3aed", "#6d28d9"]);
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
          <BarChart data={data}>
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
            <Bar 
              dataKey="value" 
              fill={colors[0]} 
              animationDuration={settings.animationDuration}
            >
              {data.map((entry, index) => (
                <Bar key={`bar-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
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