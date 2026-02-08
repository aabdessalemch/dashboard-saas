"use client";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, Check, Plus, Trash2 } from "lucide-react";

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: any[];
  currentColors: string[];
  onSave: (data: any[], colors: string[]) => void;
  singleColor?: boolean; // ✅ ADDED THIS
}

export default function DataEditorModal({
  isOpen,
  onClose,
  currentData,
  currentColors,
  onSave,
  singleColor = false // ✅ ADDED THIS
}: DataEditorModalProps) {
  const [data, setData] = useState(currentData);
  const [colors, setColors] = useState(currentColors);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setData(currentData);
    setColors(currentColors);
  }, [currentData, currentColors, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    if (!singleColor && currentColors.length > 1) { // ✅ CHANGED THIS
      setColors([...colors, '#3b82f6']);
    }
  };

  const deleteRow = (index: number) => {
    setData(data.filter((_, i) => i !== index));
    if (!singleColor && currentColors.length > 1) { // ✅ CHANGED THIS
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(data, colors);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const dataKeys = Object.keys(data[0] || {}).filter(key => key !== 'comment');
  const isSingleColor = singleColor || currentColors.length === 1; // ✅ CHANGED THIS

  const modalContent = (
    <div style={{ position: 'relative', zIndex: 10000 }}>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '56rem',
          maxHeight: '85vh',
          overflow: 'hidden',
          zIndex: 10001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 border border-white/20 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-xl font-semibold text-white">Edit Data</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 hover:rotate-90 flex items-center justify-center transition-all duration-300"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          <div className="overflow-auto p-6 flex-1">
            {isSingleColor && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-300">Line Color:</label>
                  <input
                    type="color"
                    value={colors[0] || '#3b82f6'}
                    onChange={(e) => handleColorChange(0, e.target.value)}
                    className="w-20 h-12 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                  />
                  <span className="text-sm text-gray-400">{colors[0]}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-3 text-xs text-gray-400 font-medium mb-2">
                {!isSingleColor && <div className="w-16">COLOR</div>}
                {dataKeys.map(key => (
                  <div key={key} className="flex-1 uppercase">{key}</div>
                ))}
                <div className="w-10"></div>
              </div>

              {data.map((row, index) => (
                <div key={index} className="flex gap-3 items-center hover:bg-white/5 p-2 rounded-lg transition-all">
                  {!isSingleColor && (
                    <input
                      type="color"
                      value={colors[index] || '#3b82f6'}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      className="w-16 h-12 rounded-lg cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all"
                    />
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
                      className="flex-1 px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                      placeholder={typeof row[key] === 'number' ? '0' : 'Enter text'}
                    />
                  ))}

                  <button
                    onClick={() => deleteRow(index)}
                    disabled={data.length === 1}
                    className="w-10 h-10 rounded-lg bg-red-500/20 hover:bg-red-500 hover:scale-110 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-4 w-full px-4 py-3 bg-white/5 border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-white/10 rounded-lg text-white flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16} />
              Add New Row
            </button>
          </div>

          <div className="flex gap-3 p-6 border-t border-white/10">
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
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}