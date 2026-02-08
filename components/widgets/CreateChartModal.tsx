"use client";
import { useState } from "react";
import { X, BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";

interface CreateChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableData: { value: string }[][];
  onCreateChart: (chartType: string, xColumn: number, yColumn: number, startRow: number, endRow: number) => void;
}

export default function CreateChartModal({ 
  isOpen, 
  onClose, 
  tableData,
  onCreateChart 
}: CreateChartModalProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'trend'>('bar');
  const [xColumn, setXColumn] = useState(0);
  const [yColumn, setYColumn] = useState(1);
  const [startRow, setStartRow] = useState(1);
  const [endRow, setEndRow] = useState(tableData.length - 1);

  if (!isOpen) return null;

  const headers = tableData[0] || [];
  const columnOptions = headers.map((header, idx) => ({
    value: idx,
    label: header.value
  }));

  const totalRows = tableData.length - 1;
  const rowOptions = Array.from({ length: totalRows }, (_, i) => ({
    value: i + 1,
    label: `Row ${i + 1}`
  }));

  const handleCreate = () => {
    onCreateChart(chartType, xColumn, yColumn, startRow, endRow);
    onClose();
  };

  const selectedRowCount = endRow - startRow + 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl border-2 border-white/20 p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={24} />
            Create Chart from Table
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chart Type Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-300 mb-3 block">Chart Type</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setChartType('bar')}
              className={`p-3 rounded-xl border-2 transition-all ${
                chartType === 'bar'
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <BarChart3 className={`mx-auto mb-1 ${chartType === 'bar' ? 'text-blue-400' : 'text-gray-400'}`} size={28} />
              <p className={`text-xs font-medium ${chartType === 'bar' ? 'text-white' : 'text-gray-400'}`}>Bar</p>
            </button>
            
            <button
              onClick={() => setChartType('line')}
              className={`p-3 rounded-xl border-2 transition-all ${
                chartType === 'line'
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <TrendingUp className={`mx-auto mb-1 ${chartType === 'line' ? 'text-green-400' : 'text-gray-400'}`} size={28} />
              <p className={`text-xs font-medium ${chartType === 'line' ? 'text-white' : 'text-gray-400'}`}>Line</p>
            </button>
            
            <button
              onClick={() => setChartType('pie')}
              className={`p-3 rounded-xl border-2 transition-all ${
                chartType === 'pie'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <PieChart className={`mx-auto mb-1 ${chartType === 'pie' ? 'text-purple-400' : 'text-gray-400'}`} size={28} />
              <p className={`text-xs font-medium ${chartType === 'pie' ? 'text-white' : 'text-gray-400'}`}>Pie</p>
            </button>

            <button
              onClick={() => setChartType('trend')}
              className={`p-3 rounded-xl border-2 transition-all ${
                chartType === 'trend'
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <Activity className={`mx-auto mb-1 ${chartType === 'trend' ? 'text-orange-400' : 'text-gray-400'}`} size={28} />
              <p className={`text-xs font-medium ${chartType === 'trend' ? 'text-white' : 'text-gray-400'}`}>Trend</p>
            </button>
          </div>
        </div>

        {/* Column Selection */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              {chartType === 'pie' ? 'Category Column' : chartType === 'trend' ? 'Date Column' : 'X-Axis (Labels)'}
            </label>
            <select
              value={xColumn}
              onChange={(e) => setXColumn(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {columnOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              {chartType === 'pie' ? 'Value Column' : 'Y-Axis (Values)'}
            </label>
            <select
              value={yColumn}
              onChange={(e) => setYColumn(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {columnOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row Range Selection */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
          <label className="text-sm font-medium text-gray-300 mb-3 block">Data Range</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">From Row</label>
              <select
                value={startRow}
                onChange={(e) => {
                  const newStart = Number(e.target.value);
                  setStartRow(newStart);
                  if (newStart > endRow) setEndRow(newStart);
                }}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {rowOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-slate-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">To Row</label>
              <select
                value={endRow}
                onChange={(e) => {
                  const newEnd = Number(e.target.value);
                  setEndRow(newEnd);
                  if (newEnd < startRow) setStartRow(newEnd);
                }}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {rowOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-slate-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            📊 Using {selectedRowCount} row{selectedRowCount !== 1 ? 's' : ''} of data
          </p>
        </div>

        {/* Preview */}
        <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
          <p className="text-xs font-medium text-gray-400 mb-2">Preview:</p>
          <p className="text-sm text-white">
            <span className="text-blue-400">{chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart</span>
            {' '} using <span className="text-green-400">{headers[xColumn]?.value}</span> vs <span className="text-purple-400">{headers[yColumn]?.value}</span>
            {' '}(rows {startRow}-{endRow})
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 size={16} />
            Create Chart
          </button>
        </div>
      </div>
    </div>
  );
}