"use client";
import { useState, useEffect } from "react";
import { X, Check, Plus, Trash2 } from "lucide-react";

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: any[];
  currentColors: string[];
  onSave: (data: any[], colors: string[]) => void;
}

export default function DataEditorModal({
  isOpen,
  onClose,
  currentData,
  currentColors,
  onSave
}: DataEditorModalProps) {
  const [data, setData] = useState(currentData);
  const [colors, setColors] = useState(currentColors);

  useEffect(() => {
    setData(currentData);
    setColors(currentColors);
  }, [currentData, currentColors, isOpen]);

  const handleValueChange = (index: number, field: string, value: any) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const addRow = () => {
    const keys = Object.keys(data[0] || {});
    const newRow: any = {};
    keys.forEach(key => {
      newRow[key] = typeof data[0][key] === 'number' ? 100 : 'New Item';
    });
    setData([...data, newRow]);
    if (currentColors.length > 1) {
      setColors([...colors, '#3b82f6']);
    }
  };

  const deleteRow = (index: number) => {
    setData(data.filter((_, i) => i !== index));
    if (currentColors.length > 1) {
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(data, colors);
    onClose();
  };

  if (!isOpen) return null;

  const dataKeys = Object.keys(data[0] || {}).filter(key => key !== 'comment');
  const isSingleColor = currentColors.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Edit Data</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 hover:rotate-90 flex items-center justify-center transition-all duration-300"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-3">
            <div className="flex gap-3 text-xs text-gray-400 font-medium mb-2">
              {isSingleColor ? (
                <div className="w-16">LINE COLOR</div>
              ) : (
                <div className="w-16">COLOR</div>
              )}
              {dataKeys.map(key => (
                <div key={key} className="flex-1 uppercase">
                  {key}
                </div>
              ))}
              <div className="w-10"></div>
            </div>

            {data.map((row, index) => (
              <div key={index} className="flex gap-3 items-center hover:bg-white/5 p-2 rounded-lg transition-all duration-200">
                {/* Color Picker - Only show on first row if single color mode */}
                {isSingleColor ? (
                  index === 0 ? (
                    <div className="relative group">
                      <input
                        type="color"
                        value={colors[0] || '#3b82f6'}
                        onChange={(e) => handleColorChange(0, e.target.value)}
                        className="w-16 h-12 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-200"
                        style={{ backgroundColor: colors[0] }}
                      />
                    </div>
                  ) : (
                    <div className="w-16"></div>
                  )
                ) : (
                  <div className="relative group">
                    <input
                      type="color"
                      value={colors[index] || '#3b82f6'}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      className="w-16 h-12 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 hover:scale-105 transition-all duration-200"
                      style={{ backgroundColor: colors[index] }}
                    />
                  </div>
                )}

                {dataKeys.map(key => (
                  <input
                    key={key}
                    type={typeof row[key] === 'number' ? 'number' : 'text'}
                    value={row[key]}
                    onChange={(e) => {
                      const value = typeof row[key] === 'number' 
                        ? (e.target.value === '' ? '' : Number(e.target.value))
                        : e.target.value;
                      handleValueChange(index, key, value);
                    }}
                    className="flex-1 px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:scale-[1.02] transition-all duration-200"
                    placeholder={typeof row[key] === 'number' ? '0' : 'Enter text'}
                  />
                ))}

                <button
                  onClick={() => deleteRow(index)}
                  disabled={data.length === 1}
                  className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500 hover:scale-110 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="mt-4 w-full px-4 py-3 bg-white/5 border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/10 hover:scale-[1.01] rounded-lg text-white flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Plus size={16} />
            Add New Row
          </button>
        </div>

        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 hover:scale-[1.02] text-white rounded-lg transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}