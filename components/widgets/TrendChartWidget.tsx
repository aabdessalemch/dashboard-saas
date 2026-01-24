"use client";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface TrendChartWidgetProps {
  onDelete: () => void;
}

export default function TrendChartWidget({ onDelete }: TrendChartWidgetProps) {
  const [title, setTitle] = useState("Trend Chart");
  const [data, setData] = useState([
    { name: "Week 1", value: 400 },
    { name: "Week 2", value: 600 },
    { name: "Week 3", value: 500 },
    { name: "Week 4", value: 800 },
    { name: "Week 5", value: 700 },
    { name: "Week 6", value: 900 },
  ]);
  const [colors, setColors] = useState(["#f59e0b", "#fb923c", "#f97316", "#ea580c", "#dc2626", "#b91c1c"]);
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
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`colorValue-trend`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0}/>
              </linearGradient>
            </defs>
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
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={colors[0]} 
              fillOpacity={1} 
              fill={`url(#colorValue-trend)`} 
              animationDuration={settings.animationDuration}
            />
          </AreaChart>
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