"use client";
import { useState } from "react";
import { X, Check } from "lucide-react";

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColors: string[];
  onSave: (colors: string[]) => void;
  title?: string;
}

export default function ColorPickerModal({
  isOpen,
  onClose,
  currentColors,
  onSave,
  title = "Change Colors"
}: ColorPickerModalProps) {
  const [colors, setColors] = useState(currentColors);

  const presetColors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
    "#06b6d4", "#6366f1", "#f43f5e", "#eab308", "#14b8a6",
    "#8b5cf6", "#f97316", "#84cc16", "#0ea5e9", "#a855f7"
  ];

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const handleSave = () => {
    onSave(colors);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Color Inputs */}
        <div className="space-y-4 mb-6">
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">
                  Color {index + 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-2 border-white/20"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preset Colors */}
        <div className="mb-6">
          <label className="text-xs text-gray-400 mb-2 block">QUICK PRESETS</label>
          <div className="flex flex-wrap gap-2">
            {presetColors.map((presetColor, idx) => (
              <button
                key={idx}
                onClick={() => handleColorChange(0, presetColor)}
                className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white transition-all"
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}