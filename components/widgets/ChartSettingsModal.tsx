"use client";
import { useState } from "react";
import { X, Check } from "lucide-react";

interface ChartSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    showGrid: boolean;
    showLegend: boolean;
    showTooltip: boolean;
    animationDuration: number;
  };
  onSave: (settings: any) => void;
}

export default function ChartSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave
}: ChartSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleToggle = (key: keyof typeof localSettings) => {
    setLocalSettings({
      ...localSettings,
      [key]: !localSettings[key]
    });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Chart Settings</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Show Grid</p>
              <p className="text-xs text-gray-400">Display grid lines on chart</p>
            </div>
            <button
              onClick={() => handleToggle('showGrid')}
              className={`relative w-12 h-6 rounded-full transition-all ${
                localSettings.showGrid ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  localSettings.showGrid ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Show Legend</p>
              <p className="text-xs text-gray-400">Display chart legend</p>
            </div>
            <button
              onClick={() => handleToggle('showLegend')}
              className={`relative w-12 h-6 rounded-full transition-all ${
                localSettings.showLegend ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  localSettings.showLegend ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-white font-medium">Show Tooltip</p>
              <p className="text-xs text-gray-400">Display values on hover</p>
            </div>
            <button
              onClick={() => handleToggle('showTooltip')}
              className={`relative w-12 h-6 rounded-full transition-all ${
                localSettings.showTooltip ? 'bg-blue-600' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  localSettings.showTooltip ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <label className="text-white font-medium block mb-2">
              Animation Duration
            </label>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={localSettings.animationDuration}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  animationDuration: Number(e.target.value)
                })
              }
              className="w-full accent-blue-600"
            />
            <p className="text-xs text-gray-400 mt-1">
              {localSettings.animationDuration}ms
            </p>
          </div>
        </div>

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