"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";
import { X } from "lucide-react";
import {
  calculateSPCStats, runAllNelsonRules, calculateCapability,
  detectSPCChartType,
  type SPCStats, type NelsonRulesResult, type RuleResult, type CapabilityResult,
} from "@/lib/spcUtils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface SPCPanelProps {
  data: { name: string; value: number }[];
  chartType: string; // 'trend' | 'bar' | 'pie' | 'scatter' | 'line'
  onClose: () => void;
}

// ─── Gemini insight fetcher ──────────────────────────────────────────────────

async function fetchGeminiInsight(
  stats: SPCStats,
  rulesResult: NelsonRulesResult,
  chartType: string,
  dataLength: number,
): Promise<string> {
  const firedRules = rulesResult.results.filter(r => r.fired).map(r => 'Rule ' + r.ruleNumber).join(', ') || 'none';

  const prompt = `You are an SPC (Statistical Process Control) expert analyzing a ${chartType} chart.

Data summary:
- ${dataLength} data points
- Mean: ${stats.mean.toFixed(1)}
- Sigma: ${stats.sigma.toFixed(1)}
- UCL: ${stats.ucl.toFixed(1)}, LCL: ${stats.lcl.toFixed(1)}
- Process health score: ${rulesResult.healthScore}/100
- Rules fired: ${firedRules}

Write 2–3 sentences interpreting what this means for the process.
Be specific about which rules fired and what they likely indicate in practice.
Do not use bullet points. Keep it conversational and actionable.
Do not start with "I" or "The analysis shows".`.trim();

  try {
    const res = await fetch('/api/chat-dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        conversationHistory: [],
        dashboardContext: { widgets: [] },
      }),
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json.message || '';
  } catch {
    return '';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SPCPanel({ data, chartType, onClose }: SPCPanelProps) {
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'allRules' | 'cpk'>('sideBySide');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  // ── Derived SPC data ──
  const values = useMemo(() => data.map(d => d.value), [data]);
  const labels = useMemo(() => data.map(d => d.name), [data]);
  const stats = useMemo(() => calculateSPCStats(values), [values]);
  const rulesResult = useMemo(() => runAllNelsonRules(values, labels, stats), [values, labels, stats]);
  const chartRec = useMemo(() => detectSPCChartType(values, chartType), [values, chartType]);

  // ── Cp/Cpk slider state ──
  const defaultUSL = stats.mean + 3 * stats.sigma;
  const defaultLSL = stats.mean - 3 * stats.sigma;
  const [usl, setUsl] = useState(defaultUSL);
  const [lsl, setLsl] = useState(defaultLSL);

  useEffect(() => {
    setUsl(stats.mean + 3 * stats.sigma);
    setLsl(stats.mean - 3 * stats.sigma);
  }, [stats]);

  const capability = useMemo(() => calculateCapability(values, stats, usl, lsl), [values, stats, usl, lsl]);

  // ── Gemini insight (once on mount) ──
  useEffect(() => {
    setLoadingInsight(true);
    fetchGeminiInsight(stats, rulesResult, chartType, data.length)
      .then(text => setAiInsight(text))
      .finally(() => setLoadingInsight(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Violating point indexes for coloring ──
  const violatingIndexes = useMemo(() => {
    const set = new Set<number>();
    rulesResult.results.forEach(r => r.violatingPoints.forEach(i => set.add(i)));
    return set;
  }, [rulesResult]);

  // ── Custom dot renderer for SPC chart ──
  const renderSPCDot = useCallback((props: any) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return null;
    const v = values[index];
    let fill = '#f59e0b';
    if (v > stats.ucl || v < stats.lcl) fill = '#f87171';
    else if (v > stats.zone2Upper || v < stats.zone2Lower) fill = '#fbbf24';
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />;
  }, [values, stats]);

  // ── Distribution data for Cp/Cpk tab ──
  const distributionData = useMemo(() => {
    const bins = 60;
    const lo = stats.mean - 4 * stats.sigma;
    const hi = stats.mean + 4 * stats.sigma;
    const step = (hi - lo) / bins;
    const sigma2 = 2 * stats.sigma * stats.sigma;
    if (stats.sigma === 0) return [];
    const result = [];
    for (let i = 0; i < bins; i++) {
      const x = lo + (i + 0.5) * step;
      const y = Math.exp(-((x - stats.mean) ** 2) / sigma2);
      const inSpec = x >= lsl && x <= usl;
      result.push({ x: x.toFixed(1), y, inSpec });
    }
    return result;
  }, [stats, lsl, usl]);

  // ── Severity colors ──
  const sevDot = (sev: string) => {
    if (sev === 'critical') return '#f87171';
    if (sev === 'warning') return '#fbbf24';
    return '#60a5fa';
  };
  const sevBadgeBg = (sev: string) => {
    if (sev === 'critical') return 'bg-[#7f1d1d]';
    if (sev === 'warning') return 'bg-[#78350f]';
    return 'bg-[#1e3a5f]';
  };
  const sevBadgeText = (sev: string) => {
    if (sev === 'critical') return 'text-[#fca5a5]';
    if (sev === 'warning') return 'text-[#fcd34d]';
    return 'text-[#93c5fd]';
  };

  const capColor = (v: number) => {
    if (v >= 1.33) return 'text-green-400';
    if (v >= 1.0) return 'text-amber-400';
    return 'text-red-400';
  };

  const healthColor = rulesResult.healthScore >= 75 ? 'bg-green-500' : rulesResult.healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500';

  // ── Tabs ──
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'sideBySide', label: 'Side by side' },
    { key: 'allRules', label: 'All 7 rules' },
    { key: 'cpk', label: 'Cp / Cpk' },
  ];

  return (
    <div className="bg-[#0d1117]/95 backdrop-blur-xl rounded-2xl border border-white/20 p-5 mt-2 shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-sm">SPC Analysis</h3>
          <span className="text-white/40 text-xs">
            {chartRec.chartType} chart &middot; {chartRec.confidence} confidence
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all">
          <X size={14} />
        </button>
      </div>

      {/* ── Low-data warning ── */}
      {data.length < 20 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 text-amber-300 text-xs">
          <strong>Limited data:</strong> SPC analysis is most reliable with 20+ data points.
          You have {data.length} points — results are indicative only.
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${
              activeTab === t.key ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB 1 — Side by side ════════════════ */}
      {activeTab === 'sideBySide' && (
        <div>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <StatCard label="Mean (CL)" value={stats.mean.toFixed(2)} color="#97C459" />
            <StatCard label="UCL" value={stats.ucl.toFixed(2)} color="#f87171" />
            <StatCard label="LCL" value={stats.lcl.toFixed(2)} color="#60a5fa" />
            <StatCard label="Sigma (σ)" value={stats.sigma.toFixed(2)} color="#ffffff" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Original chart */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">Original chart</p>
              <ResponsiveContainer width="100%" height={180}>
                {chartType === 'bar' ? (
                  <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="spcOrigGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#spcOrigGrad)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* SPC control chart */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">SPC control chart (I-MR)</p>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: 11 }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <ReferenceLine y={stats.ucl} stroke="#f87171" strokeDasharray="4 3" label={{ value: 'UCL', fill: '#f87171', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={stats.mean} stroke="#97C459" strokeDasharray="4 3" label={{ value: 'CL', fill: '#97C459', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={stats.lcl} stroke="#60a5fa" strokeDasharray="4 3" label={{ value: 'LCL', fill: '#60a5fa', fontSize: 10, position: 'right' }} />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={renderSPCDot} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Violations */}
          <div className="mb-4">
            <p className="text-white/60 text-xs font-medium mb-2">Violations detected</p>
            {rulesResult.violationCount === 0 ? (
              <div className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: '#97C459' }} />
                <span className="text-white/70 text-xs">No violations detected — process appears stable with only common cause variation.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {rulesResult.results.filter(r => r.fired).map(r => (
                  <div key={r.ruleNumber} className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: sevDot(r.severity) }} />
                    <span className="text-white/70 text-xs">{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI interpretation */}
          <div className="mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">AI interpretation</p>
            <div className="bg-white/5 rounded-xl p-3 text-white/70 text-xs leading-relaxed italic min-h-[40px]">
              {loadingInsight ? (
                <span className="text-white/30 animate-pulse">Generating insight…</span>
              ) : aiInsight ? (
                aiInsight
              ) : (
                <span className="text-white/30">AI insight unavailable.</span>
              )}
            </div>
          </div>

          {/* Process health bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-xs font-medium">Process health</span>
              <span className="text-white text-xs font-semibold">{rulesResult.healthScore}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${healthColor}`} style={{ width: `${rulesResult.healthScore}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TAB 2 — All 7 rules ════════════════ */}
      {activeTab === 'allRules' && (
        <div className="space-y-2">
          {rulesResult.results.map(r => (
            <div key={r.ruleNumber} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              {/* Severity badge */}
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sevBadgeBg(r.severity)} ${sevBadgeText(r.severity)}`}>
                {r.severity}
              </span>
              {/* Rule name */}
              <span className="text-white/80 text-xs flex-1">
                Rule {r.ruleNumber} — {r.name}
              </span>
              {/* Status */}
              <span className={`text-xs font-semibold ${r.fired ? 'text-[#f87171]' : 'text-white/30'}`}>
                {r.fired ? 'Fired' : 'OK'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════ TAB 3 — Cp / Cpk ════════════════ */}
      {activeTab === 'cpk' && (
        <div>
          {/* Spec limit note */}
          <div className="bg-white/5 rounded-xl px-4 py-3 mb-4 text-white/50 text-xs leading-relaxed">
            USL and LSL come from your product requirements, not from the data. Adjust the sliders to match your process tolerances.
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/60 text-xs">USL</label>
                <span className="text-white text-xs font-mono">{usl.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={stats.mean + stats.sigma}
                max={stats.mean + 5 * stats.sigma}
                step={1}
                value={usl}
                onChange={e => setUsl(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#97C459' }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/60 text-xs">LSL</label>
                <span className="text-white text-xs font-mono">{lsl.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={stats.mean - 5 * stats.sigma}
                max={stats.mean - stats.sigma}
                step={1}
                value={lsl}
                onChange={e => setLsl(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#97C459' }}
              />
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cp</p>
              <p className={`text-lg font-bold ${capColor(capability.cp)}`}>{isFinite(capability.cp) ? capability.cp.toFixed(2) : '∞'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cpk</p>
              <p className={`text-lg font-bold ${capColor(capability.cpk)}`}>{isFinite(capability.cpk) ? capability.cpk.toFixed(2) : '∞'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Sigma level</p>
              <p className="text-lg font-bold text-white">{isFinite(capability.sigmaLevel) ? capability.sigmaLevel.toFixed(2) : '∞'}σ</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">PPM defective</p>
              <p className="text-lg font-bold text-white">{isFinite(capability.ppm) ? Math.round(capability.ppm).toLocaleString() : '0'}</p>
            </div>
          </div>

          {/* Verdict */}
          {(() => {
            let bg: string, text: string;
            if (capability.cpk >= 1.33) {
              bg = 'bg-green-500/10 border-green-500/20';
              text = 'Process is capable and centered. Cpk ≥ 1.33 — adequate margin from both spec limits.';
            } else if (capability.cpk >= 1.0) {
              bg = 'bg-amber-500/10 border-amber-500/20';
              text = 'Marginally capable. Limited margin — centering improvement recommended.';
            } else {
              bg = 'bg-red-500/10 border-red-500/20';
              text = 'Not capable. Process spread or centering is insufficient for these spec limits. Expect defects.';
            }
            return (
              <div className={`${bg} border rounded-xl px-4 py-3 mb-5 text-white/80 text-xs leading-relaxed`}>
                {text}
              </div>
            );
          })()}

          {/* Distribution chart */}
          {distributionData.length > 0 && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">Distribution vs spec limits</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={distributionData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="x" hide />
                  <YAxis hide />
                  <Bar dataKey="y" isAnimationActive={false}>
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.inSpec ? 'rgba(99,153,34,0.5)' : 'rgba(248,113,113,0.65)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small helper component ──────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
