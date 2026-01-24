"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { X } from "lucide-react";
import WidgetEditMenu from "./WidgetEditMenu";
import DataEditorModal from "./DataEditorModal";
import ChartSettingsModal from "./ChartSettingsModal";

interface PieChartWidgetProps {
  onDelete: () => void;
}

export default function PieChartWidget({ onDelete }: PieChartWidgetProps) {
  const [title, setTitle] = useState("Pie Chart");
  const [data, setData] = useState([
    { name: "Category A", value: 400 },
    { name: "Category B", value: 300 },
    { name: "Category C", value: 300 },
    { name: "Category D", value: 200 },
  ]);
  const [colors, setColors] = useState(["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"]);
  const [settings, setSettings] = useState({
    showGrid: false,
    showLegend: true,
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationDuration={settings.animationDuration}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {settings.showLegend && <Legend />}
            {settings.showTooltip && <Tooltip />}
          </PieChart>
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