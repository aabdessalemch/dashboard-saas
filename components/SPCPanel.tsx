"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";
import { X, Eye, EyeOff } from "lucide-react";
import {
  calculateSPCStats, runAllNelsonRules, calculateCapability,
  detectSPCChartType, calculateForecast,
  type SPCStats, type NelsonRulesResult, type RuleResult, type CapabilityResult,
  type ForecastResult,
} from "@/lib/spcUtils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface SPCPanelProps {
  data: { name: string; value: number }[];
  chartType: string; // 'trend' | 'bar' | 'pie' | 'scatter' | 'line'
  onClose: () => void;
  initialLimits?: { usl: number; lsl: number };
  onLimitsChange?: (usl: number, lsl: number) => void;
}

// ─── Gemini insight fetcher ──────────────────────────────────────────────────

async function fetchGeminiInsight(
  stats: SPCStats,
  rulesResult: NelsonRulesResult,
  chartType: string,
  dataLength: number,
  usl?: number,
  lsl?: number,
): Promise<string> {
  const firedRules = rulesResult.results.filter(r => r.fired).map(r => 'Rule ' + r.ruleNumber).join(', ') || 'none';
  const displayUCL = usl ?? stats.ucl;
  const displayLCL = lsl ?? stats.lcl;

  const prompt = `You are an SPC (Statistical Process Control) expert analyzing a ${chartType} chart.

Data summary:
- ${dataLength} data points
- Mean: ${stats.mean.toFixed(1)}
- Sigma: ${stats.sigma.toFixed(1)}
- USL: ${displayUCL.toFixed(1)}, LSL: ${displayLCL.toFixed(1)}
- Process health score: ${rulesResult.healthScore}/100
- Rules fired: ${firedRules}

Write 2–3 sentences interpreting what this means for the process.
Be specific about which rules fired and what they likely indicate in practice.
Do not use bullet points. Keep it conversational and actionable.
Do not start with "I" or "The analysis shows".`.trim();

  try {
    const res = await fetch('/api/spc-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return fallbackInsight(stats, rulesResult);
    const json = await res.json();
    return json.insight || fallbackInsight(stats, rulesResult);
  } catch {
    return fallbackInsight(stats, rulesResult);
  }
}

function fallbackInsight(stats: SPCStats, rulesResult: NelsonRulesResult): string {
  const fired = rulesResult.results.filter(r => r.fired);
  if (fired.length === 0) {
    return `With a mean of ${stats.mean.toFixed(1)} and σ of ${stats.sigma.toFixed(1)}, the process appears stable with no Nelson rule violations. Only common-cause variation is present — no immediate action is needed.`;
  }
  const ruleNames = fired.map(r => `Rule ${r.ruleNumber} (${r.name})`).join(', ');
  const score = rulesResult.healthScore;
  return `The process shows ${fired.length} violation${fired.length > 1 ? 's' : ''}: ${ruleNames}. Health score is ${score}/100 — ${score >= 75 ? 'still acceptable but worth monitoring' : score >= 50 ? 'attention is recommended to prevent further degradation' : 'immediate investigation is advised to identify root causes'}.`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SPCPanel({ data, chartType, onClose, initialLimits, onLimitsChange }: SPCPanelProps) {
  const [activeTab, setActiveTab] = useState<'sideBySide' | 'allRules' | 'cpk' | 'premortem'>('sideBySide');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  // ── Premortem state ──
  const [showPremortem, setShowPremortem] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState(7);
  const [confidenceLevel, setConfidenceLevel] = useState<80 | 95>(95);
  const [premortInsight, setPremortInsight] = useState<string>('');
  const [loadingPremort, setLoadingPremort] = useState(false);
  const premortLoadedRef = useRef(false);

  const ruleExplanations: Record<number, string> = {
    1: 'A single data point falls outside the Upper or Lower Control Limit (beyond 3σ from the mean). This is the strongest signal that something unusual happened — such as equipment failure, wrong raw material, or a measurement error. Immediate investigation is required.',
    2: 'Nine consecutive points all land on the same side of the center line (mean). This suggests the process average has permanently shifted — possibly due to a new supplier, a changed setting, or environmental drift. The process is no longer centered where it was.',
    3: 'Six data points in a row are continuously increasing or decreasing. This monotonic trend indicates gradual drift — common causes include tool wear, operator fatigue, temperature buildup, or slow chemical degradation.',
    4: 'Fourteen consecutive points alternate up-down-up-down without interruption. This systematic pattern often points to two alternating sources — such as two machines, two shifts, or two measurement devices producing systematically different results.',
    5: 'Two out of three consecutive points fall beyond the 2σ boundary on the same side of the mean. This is an early warning that the process may be shifting before it actually breaches the control limit. Think of it as a "yellow light" before a full violation.',
    6: 'Four out of five consecutive points fall beyond the 1σ boundary on the same side. This indicates a moderate but sustained shift in the process mean — less dramatic than a control-limit breach but still statistically significant and worth investigating.',
    7: 'Fifteen consecutive points all fall within 1σ of the mean. While this looks "good," it is actually suspicious — real processes have natural variation. This pattern may indicate data stratification, mixed subgroups being averaged together, or control limits that are set too wide.',
  };

  // ── Derived SPC data ──
  const values = useMemo(() => data.map(d => {
    const v = Number(d.value);
    return isFinite(v) ? v : 0;
  }), [data]);
  const labels = useMemo(() => data.map(d => d.name), [data]);
  const stats = useMemo(() => calculateSPCStats(values), [values]);
  const chartRec = useMemo(() => detectSPCChartType(values, chartType), [values, chartType]);
  // Note: rulesResult is defined below after usl/lsl state (needs adjustedStats)

  // Compute the actual data range to anchor slider bounds
  const dataMin = useMemo(() => Math.min(...values), [values]);
  const dataMax = useMemo(() => Math.max(...values), [values]);

  // Slider bounds: always wide enough to cover the actual data
  // Use whichever is larger: 4σ padding OR the actual data extent
  const sliderPadding = useMemo(() => {
    const sigmaSpread = 4 * stats.sigma;
    const dataSpread  = (dataMax - dataMin) * 0.5;
    return Math.max(sigmaSpread, dataSpread, 1);
  }, [stats.sigma, dataMin, dataMax]);

  const sliderMin = useMemo(() => dataMin - sliderPadding, [dataMin, sliderPadding]);
  const sliderMax = useMemo(() => dataMax + sliderPadding, [dataMax, sliderPadding]);
  const sliderSpan = useMemo(() => sliderMax - sliderMin, [sliderMax, sliderMin]);

  // ── Cp/Cpk slider helpers ──
  const sliderStep = useMemo(() => {
    const range = stats.sigma * 4; // slider spans 4σ
    if (range === 0 || !isFinite(range)) return 1;
    // ~200 steps across the slider range
    const raw = range / 200;
    // Round to a clean step: 0.001, 0.01, 0.1, 1, 10, 100, etc.
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(raw))));
    return Math.max(magnitude, 0.001);
  }, [stats.sigma]);

  const formatStat = useCallback((v: number) => {
    if (!isFinite(v) || isNaN(v)) return '0';
    const abs = Math.abs(v);
    if (abs === 0) return '0';
    if (abs >= 1_000_000_000_000) return (v / 1_000_000_000_000).toFixed(1) + 'T';
    if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
    if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (abs >= 10_000) return (v / 1_000).toFixed(0) + 'K';
    if (abs >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    if (abs >= 100) return Math.round(v).toString();
    if (abs >= 10) return v.toFixed(1);
    if (abs >= 1) return v.toFixed(2);
    if (abs >= 0.01) return v.toFixed(3);
    // For very small fractional data
    const decimals = Math.max(2, -Math.floor(Math.log10(abs)) + 2);
    return v.toFixed(Math.min(decimals, 6));
  }, []);

  // Compact formatter for Cp/Cpk/Sigma ratios (normally 0–6 but can explode)
  const formatMetric = useCallback((v: number) => {
    if (!isFinite(v) || isNaN(v)) return '∞';
    const abs = Math.abs(v);
    if (abs >= 1_000) return formatStat(v);
    if (abs >= 100) return Math.round(v).toString();
    return v.toFixed(2);
  }, [formatStat]);

  // ── Cp/Cpk slider state — persisted to Supabase via widget data ──
  // Clamp to ±10σ of current mean so stale saved limits can't produce absurd numbers
  const clampLimit = useCallback((v: number, fallback: number) => {
    if (typeof v !== 'number' || !isFinite(v)) return fallback;
    const maxRange = stats.sigma === 0 ? Math.abs(stats.mean) * 10 || 1000 : stats.sigma * 10;
    return Math.max(stats.mean - maxRange, Math.min(stats.mean + maxRange, v));
  }, [stats.mean, stats.sigma]);

  const [usl, setUslRaw] = useState(() => {
    const saved = initialLimits?.usl;
    // Accept saved value only if it is above the mean (USL below mean is nonsensical)
    if (saved != null && isFinite(saved) && saved > stats.mean) {
      return saved;
    }
    // Default: midpoint between mean and data max, or mean + 3σ, whichever is larger
    return Math.max(stats.mean + 3 * stats.sigma, stats.mean + (dataMax - stats.mean) * 0.5);
  });

  const [lsl, setLslRaw] = useState(() => {
    const saved = initialLimits?.lsl;
    // Accept saved value only if it is below the mean (LSL above mean is nonsensical)
    if (saved != null && isFinite(saved) && saved < stats.mean) {
      return saved;
    }
    // Default: midpoint between data min and mean, or mean - 3σ, whichever is lower
    return Math.min(
      stats.mean - 3 * stats.sigma,
      stats.mean - (stats.mean - dataMin) * 0.5
    );
  });

  const setUsl = useCallback((v: number) => {
    setUslRaw(v);
    onLimitsChange?.(v, lsl);
  }, [lsl, onLimitsChange]);

  const setLsl = useCallback((v: number) => {
    setLslRaw(v);
    onLimitsChange?.(usl, v);
  }, [usl, onLimitsChange]);

  // ── Sync USL/LSL when stats change (e.g. data updated) and no user-set limits ──
  const prevMeanRef = useRef(stats.mean);
  useEffect(() => {
    // Only auto-sync if there are no persisted user limits
    if (initialLimits?.usl != null && isFinite(initialLimits.usl)) return;
    if (prevMeanRef.current !== stats.mean) {
      prevMeanRef.current = stats.mean;
      setUslRaw(Math.max(stats.mean + 3 * stats.sigma, stats.mean + (dataMax - stats.mean) * 0.5));
      setLslRaw(Math.min(stats.mean - 3 * stats.sigma, stats.mean - (stats.mean - dataMin) * 0.5));
    }
  }, [stats.mean, stats.sigma, dataMin, dataMax, initialLimits]);

  // ── Adjusted stats: pass through process control limits as-is ──
  // Nelson rules must evaluate against process-derived UCL/LCL, never spec limits.
  // USL/LSL are rendered as separate reference lines in the chart.
  const adjustedStats = useMemo<SPCStats>(() => stats, [stats]);

  const rulesResult = useMemo(() => runAllNelsonRules(values, labels, adjustedStats), [values, labels, adjustedStats]);
  const capability = useMemo(() => calculateCapability(values, stats, usl, lsl), [values, stats, usl, lsl]);

  // Y-axis domain for SPC chart: must include data range + all limit lines (UCL, LCL, USL, LSL)
  const spcYDomain = useMemo<[number, number]>(() => {
    const allValues = [
      ...values,
      stats.ucl, stats.lcl, stats.mean,
      usl, lsl,
    ].filter(v => isFinite(v));
    const lo = Math.min(...allValues);
    const hi = Math.max(...allValues);
    const pad = (hi - lo) * 0.08 || 1;
    return [lo - pad, hi + pad];
  }, [values, stats.ucl, stats.lcl, stats.mean, usl, lsl]);

  // Process stability check: any critical or warning violation = unstable
  const isProcessStable = useMemo(() => {
    return !rulesResult.results.some(
      r => r.fired && (r.severity === 'critical' || r.severity === 'warning')
    );
  }, [rulesResult]);

  // ── AI insight: instant fallback + debounced Gemini call ──
  const geminiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Instant update via fallbackInsight whenever rules/stats change
  useEffect(() => {
    if (isFirstMount.current) {
      // On first mount, let Gemini handle it (below)
      isFirstMount.current = false;
      return;
    }
    // After first mount, update instantly with local fallback
    setAiInsight(fallbackInsight(adjustedStats, rulesResult));
  }, [adjustedStats, rulesResult]);

  // Gemini API call: on mount + debounced re-fetch on significant changes
  useEffect(() => {
    setLoadingInsight(true);
    if (geminiTimerRef.current) clearTimeout(geminiTimerRef.current);
    geminiTimerRef.current = setTimeout(() => {
      fetchGeminiInsight(adjustedStats, rulesResult, chartType, data.length, usl, lsl)
        .then(text => setAiInsight(text))
        .finally(() => setLoadingInsight(false));
    }, isFirstMount.current ? 0 : 2000); // instant on mount, 2s debounce after
    return () => { if (geminiTimerRef.current) clearTimeout(geminiTimerRef.current); };
  }, [adjustedStats, rulesResult, chartType, data.length, usl, lsl]);

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
    if (v > usl || v < lsl) fill = '#f87171';
    else if (v > stats.zone2Upper || v < stats.zone2Lower) fill = '#fbbf24';
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />;
  }, [values, stats, usl, lsl]);

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

  // ── Premortem: forecast result ──
  const confidenceZ = confidenceLevel === 95 ? 1.96 : 1.28;
  const forecastResult = useMemo<ForecastResult | null>(() => {
    if (data.length < 6) return null; // not enough data
    return calculateForecast(values, labels, adjustedStats, forecastHorizon, confidenceZ, { usl, lsl });
  }, [values, labels, adjustedStats, forecastHorizon, confidenceZ, usl, lsl, data.length]);

  // ── Premortem: merged dataset (historical + forecast) ──
  const mergedDataset = useMemo(() => {
    if (!forecastResult) return [];
    // Historical points
    const hist = data.map(d => ({
      name: d.name,
      historical: d.value,
      forecast: null as number | null,
      upperBand: null as number | null,
      lowerBand: null as number | null,
      willBreach: false,
      isEarlyWarning: false,
      isForecast: false,
    }));
    // Bridge: last historical point becomes first forecast point too
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      last.forecast = last.historical;
    }
    // Forecast points
    const fc = forecastResult.points.map(p => ({
      name: p.name,
      historical: null as number | null,
      forecast: p.value,
      upperBand: p.upperBand,
      lowerBand: p.lowerBand,
      willBreach: p.willBreach,
      isEarlyWarning: p.isEarlyWarning,
      breachType: p.breachType,
      breachesControl: p.breachesControl,
      breachesSpec: p.breachesSpec,
      isForecast: true,
    }));
    return [...hist, ...fc];
  }, [data, forecastResult]);

  // ── Premortem: reset insight when spec limits change ──
  useEffect(() => {
    premortLoadedRef.current = false;
    setPremortInsight('');
  }, [usl, lsl]);

  // ── Premortem: Gemini insight (fetch once when tab first opens) ──
  useEffect(() => {
    if (activeTab !== 'premortem' || premortLoadedRef.current || !forecastResult) return;
    premortLoadedRef.current = true;
    setLoadingPremort(true);

    const prompt = `You are an SPC Premortem analyst. A linear regression forecast has been run on ${data.length} data points.

Forecast summary:
- Slope: ${forecastResult.slope.toFixed(4)} per period
- Total predicted breaches: ${forecastResult.breachCount} of ${forecastResult.points.length} points
- Control limit breaches (UCL/LCL): ${forecastResult.controlBreachCount}
  First at: ${forecastResult.firstControlBreachLabel ?? 'none'} (${forecastResult.firstControlBreachDirection ?? 'n/a'})
- Spec limit breaches (USL/LSL): ${forecastResult.specBreachCount}
  First at: ${forecastResult.firstSpecBreachLabel ?? 'none'} (${forecastResult.firstSpecBreachDirection ?? 'n/a'})
- Current mean: ${stats.mean.toFixed(1)}, sigma: ${stats.sigma.toFixed(1)}
- UCL: ${stats.ucl.toFixed(1)}, LCL: ${stats.lcl.toFixed(1)}
- USL: ${usl.toFixed(1)}, LSL: ${lsl.toFixed(1)}
- Confidence level: ${confidenceLevel}%

Write 2-3 sentences of actionable premortem analysis distinguishing between
process control issues (UCL/LCL) and product specification issues (USL/LSL).
What should the team prioritize? Be specific. Do not start with "I" or "The analysis".`.trim();

    fetch('/api/spc-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(json => setPremortInsight(json?.insight || premortFallback(forecastResult)))
      .catch(() => setPremortInsight(premortFallback(forecastResult)))
      .finally(() => setLoadingPremort(false));
  }, [activeTab, forecastResult, data.length, stats, usl, lsl, confidenceLevel]);

  function premortFallback(fr: ForecastResult): string {
    if (fr.allGreen) {
      return `The forecast projects all ${fr.points.length} future points within both control ` +
        `and spec limits. The process trend appears stable — continue monitoring, ` +
        `but no immediate intervention is needed.`;
    }

    const parts: string[] = [];

    if (fr.controlBreachCount > 0) {
      parts.push(
        `${fr.controlBreachCount} control limit breach${fr.controlBreachCount > 1 ? 'es' : ''} ` +
        `predicted — first at ${fr.firstControlBreachLabel} (${fr.firstControlBreachDirection} UCL/LCL)`
      );
    }

    if (fr.specBreachCount > 0) {
      parts.push(
        `${fr.specBreachCount} spec limit breach${fr.specBreachCount > 1 ? 'es' : ''} ` +
        `predicted — first at ${fr.firstSpecBreachLabel} (${fr.firstSpecBreachDirection} USL/LSL)`
      );
    }

    return `Forecast detects ${parts.join(' and ')}. ` +
      `A slope of ${fr.slope.toFixed(3)} per period indicates ` +
      `${Math.abs(fr.slope) < 0.5 ? 'gradual' : 'significant'} ` +
      `${fr.slope > 0 ? 'upward' : 'downward'} drift — ` +
      `preemptive calibration or process adjustment is recommended.`;
  }

  // ── Tabs ──
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'sideBySide', label: 'Side by side' },
    { key: 'allRules', label: 'All 7 rules' },
    { key: 'cpk', label: 'Cp / Cpk' },
    ...(data.length >= 6 ? [{ key: 'premortem' as const, label: 'Premortem' }] : []),
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
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1 flex-1 bg-white/5 rounded-xl p-1">
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
        {/* Premortem overlay toggle */}
        {data.length >= 6 && (
          <button
            onClick={() => setShowPremortem(!showPremortem)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              showPremortem
                ? 'bg-violet-500/20 border-violet-400/30 text-violet-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:bg-white/10'
            }`}
            title={showPremortem ? 'Hide forecast overlay' : 'Show forecast overlay'}
          >
            {showPremortem ? <Eye size={13} /> : <EyeOff size={13} />}
            <span className="hidden sm:inline">Forecast</span>
          </button>
        )}
      </div>

      {/* ════════════════ TAB 1 — Side by side ════════════════ */}
      {activeTab === 'sideBySide' && (
        <div>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Mean (CL)" value={formatStat(stats.mean)} color="#97C459" />
            <StatCard label="UCL (3σ)" value={formatStat(stats.ucl)} color="#f87171" />
            <StatCard label="LCL (3σ)" value={formatStat(Math.max(0, stats.lcl))} color="#60a5fa" />
            <StatCard label="USL" value={formatStat(usl)} color="#fb923c" />
            <StatCard label="LSL" value={formatStat(lsl)} color="#38bdf8" />
            <StatCard label="Sigma (σ)" value={formatStat(stats.sigma)} color="#ffffff" />
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
                    <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} tickFormatter={formatStat} />
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
                    <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} tickFormatter={formatStat} />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#spcOrigGrad)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* SPC control chart (with optional forecast overlay) */}
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
                SPC control chart (I-MR){showPremortem && forecastResult ? ' + forecast' : ''}
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart
                  data={showPremortem && forecastResult ? mergedDataset : data}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} tickFormatter={formatStat} domain={spcYDomain} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: 11 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(val: number | null, name: string) => {
                      if (val == null) return ['-', name];
                      return [formatStat(val), name === 'forecast' ? 'Forecast' : name === 'historical' ? 'Actual' : 'Value'];
                    }}
                  />
                  {/* Process control limits */}
                  <ReferenceLine y={stats.ucl} stroke="#f87171" strokeDasharray="4 3" label={{ value: 'UCL', fill: '#f87171', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={stats.mean} stroke="#97C459" strokeDasharray="4 3" label={{ value: 'CL', fill: '#97C459', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={Math.max(0, stats.lcl)} stroke="#60a5fa" strokeDasharray="4 3" label={{ value: 'LCL', fill: '#60a5fa', fontSize: 10, position: 'right' }} />
                  {/* Spec limits (user-adjustable via Cp/Cpk tab) */}
                  <ReferenceLine y={usl} stroke="#fb923c" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `USL ${formatStat(usl)}`, fill: '#fb923c', fontSize: 9, position: 'right' }} />
                  <ReferenceLine y={lsl} stroke="#38bdf8" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `LSL ${formatStat(lsl)}`, fill: '#38bdf8', fontSize: 9, position: 'right' }} />

                  {/* When forecast overlay is ON, show "Now" separator and forecast elements */}
                  {showPremortem && forecastResult && data.length > 0 && (
                    <ReferenceLine
                      x={data[data.length - 1].name}
                      stroke="rgba(255,255,255,0.2)"
                      strokeDasharray="3 3"
                    />
                  )}

                  {showPremortem && forecastResult ? (
                    <>
                      <Line type="monotone" dataKey="historical" stroke="#f59e0b" strokeWidth={2} dot={renderSPCDot} activeDot={false} connectNulls={false} isAnimationActive={false} />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#c4b5fd"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        connectNulls={false}
                        isAnimationActive={false}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!payload?.isForecast || cx == null || cy == null) return <g key={`dot-skip-${cx}-${cy}`} />;
                          if (payload.historical != null) return <g key={`dot-bridge-${cx}-${cy}`} />;
                          let fill = 'rgba(99,153,34,0.75)';
                          if (payload.breachType === 'both') fill = 'rgba(217,70,239,0.85)';
                          else if (payload.breachType === 'control') fill = 'rgba(248,113,113,0.85)';
                          else if (payload.breachType === 'spec') fill = 'rgba(251,146,60,0.85)';
                          else if (payload.isEarlyWarning) fill = 'rgba(251,191,36,0.75)';
                          return <circle key={`dot-fc-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={fill} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />;
                        }}
                        activeDot={false}
                      />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={renderSPCDot} activeDot={false} />
                  )}
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
            <div key={r.ruleNumber}>
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                {/* Severity badge */}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sevBadgeBg(r.severity)} ${sevBadgeText(r.severity)}`}>
                  {r.severity}
                </span>
                {/* Rule name + info button inline */}
                <span className="text-white/80 text-xs flex-1 flex items-center gap-1.5">
                  Rule {r.ruleNumber} — {r.name}
                  <button
                    onClick={() => setExpandedRule(expandedRule === r.ruleNumber ? null : r.ruleNumber)}
                    className={`w-4 h-4 rounded-full text-[9px] font-bold inline-flex items-center justify-center transition-all flex-shrink-0 ${
                      expandedRule === r.ruleNumber
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/40 hover:bg-white/15 hover:text-white/70'
                    }`}
                    title="What is this rule?"
                  >
                    ?
                  </button>
                </span>
                {/* Status */}
                <span className={`text-xs font-semibold ${r.fired ? 'text-[#f87171]' : 'text-white/30'}`}>
                  {r.fired ? 'Fired' : 'OK'}
                </span>
              </div>
              {/* Explanation popup */}
              {expandedRule === r.ruleNumber && (
                <div className="mx-2 mt-1 mb-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white/60 text-xs leading-relaxed animate-in">
                  {ruleExplanations[r.ruleNumber]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════════════════ TAB 3 — Cp / Cpk ════════════════ */}
      {activeTab === 'cpk' && (
        <div>
          {/* Process stability warning */}
          {!isProcessStable && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-red-300 text-xs leading-relaxed">
              <strong>Process not in statistical control.</strong>{' '}
              {rulesResult.violationCount} Nelson rule violation
              {rulesResult.violationCount > 1 ? 's' : ''} detected.
              Cp/Cpk values are mathematically computed but statistically unreliable
              on an unstable process. Resolve control violations before interpreting
              capability results.
            </div>
          )}
          {/* Spec limit note */}
          <div className="bg-white/5 rounded-xl px-4 py-3 mb-4 text-white/50 text-xs leading-relaxed">
            USL and LSL come from your product requirements, not from the data. Adjust the sliders to match your process tolerances.
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-white/60 text-xs block mb-1">USL</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderSpan === 0 ? 50 : Math.max(0, Math.min(100, ((usl - sliderMin) / sliderSpan) * 100))}
                  onChange={e => {
                    const pct = Number(e.target.value) / 100;
                    const newVal = sliderMin + pct * sliderSpan;
                    // USL must always stay above the mean
                    setUsl(Math.max(stats.mean + stats.sigma * 0.1, newVal));
                  }}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#97C459' }}
                />
                <span className="text-white text-xs font-mono w-[60px] text-right truncate">{formatStat(usl)}</span>
              </div>
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">LSL</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderSpan === 0 ? 50 : Math.max(0, Math.min(100, ((lsl - sliderMin) / sliderSpan) * 100))}
                  onChange={e => {
                    const pct = Number(e.target.value) / 100;
                    const newVal = sliderMin + pct * sliderSpan;
                    // LSL must always stay below the mean
                    setLsl(Math.min(stats.mean - stats.sigma * 0.1, newVal));
                  }}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#97C459' }}
                />
                <span className="text-white text-xs font-mono w-[60px] text-right truncate">{formatStat(lsl)}</span>
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-white/5 rounded-xl p-3 text-center overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cp</p>
              <p className={`text-lg font-bold truncate ${capColor(capability.cp)}`}>{formatMetric(capability.cp)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Cpk</p>
              <p className={`text-lg font-bold truncate ${capColor(capability.cpk)}`}>{formatMetric(capability.cpk)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Sigma level</p>
              <p className="text-lg font-bold text-white truncate">{formatMetric(capability.sigmaLevel)}σ</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">PPM defective</p>
              <p className="text-lg font-bold text-white truncate">{isFinite(capability.ppm) ? formatStat(Math.round(capability.ppm)) : '0'}</p>
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

      {/* ════════════════ TAB 4 — Premortem ════════════════ */}
      {activeTab === 'premortem' && forecastResult && (
        <div>
          {/* Low data warning */}
          {data.length < 20 && data.length >= 6 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4 text-amber-300 text-xs">
              <strong>Limited data for forecast:</strong> Predictions are more reliable with 20+ data points.
              Results with {data.length} points are indicative only.
            </div>
          )}

          {/* Controls bar */}
          <div className="flex items-center gap-4 mb-5 bg-white/5 rounded-xl px-4 py-3">
            {/* Horizon selector */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] uppercase tracking-wider">Horizon</span>
              <div className="flex gap-1">
                {[5, 7, 10].map(h => (
                  <button
                    key={h}
                    onClick={() => { setForecastHorizon(h); premortLoadedRef.current = false; }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      forecastHorizon === h
                        ? 'bg-violet-500/25 text-violet-300 border border-violet-400/30'
                        : 'bg-white/5 text-white/40 hover:text-white/70 border border-transparent'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {/* Confidence selector */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] uppercase tracking-wider">Confidence</span>
              <div className="flex gap-1">
                {([80, 95] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => { setConfidenceLevel(c); premortLoadedRef.current = false; }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      confidenceLevel === c
                        ? 'bg-violet-500/25 text-violet-300 border border-violet-400/30'
                        : 'bg-white/5 text-white/40 hover:text-white/70 border border-transparent'
                    }`}
                  >
                    {c}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Forecast chart ── */}
          <div className="bg-white/5 rounded-xl p-3 mb-5">
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">
              Forecast — {forecastHorizon} periods ahead ({confidenceLevel}% CI)
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={mergedDataset} margin={{ top: 10, right: 15, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="premortBandGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99,153,34,0.12)" />
                    <stop offset="100%" stopColor="rgba(99,153,34,0.02)" />
                  </linearGradient>
                  <linearGradient id="premortBandRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(248,113,113,0.12)" />
                    <stop offset="100%" stopColor="rgba(248,113,113,0.02)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 9 }} />
                <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 10 }} tickFormatter={formatStat} domain={spcYDomain} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontSize: 11 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(val: number | null, name: string) => {
                    if (val == null) return ['-', name];
                    return [formatStat(val), name === 'forecast' ? 'Forecast' : name === 'historical' ? 'Actual' : name];
                  }}
                />

                {/* Premortem zone shading */}
                {mergedDataset.length > 0 && data.length > 0 && (
                  <ReferenceArea
                    x1={mergedDataset[data.length - 1]?.name}
                    x2={mergedDataset[mergedDataset.length - 1]?.name}
                    fill="rgba(139,92,246,0.04)"
                    fillOpacity={1}
                  />
                )}

                {/* Confidence band — upper */}
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  stroke="none"
                  fill={forecastResult.allGreen ? "url(#premortBandGreen)" : "url(#premortBandRed)"}
                  fillOpacity={0.08}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {/* Confidence band — lower */}
                <Area
                  type="monotone"
                  dataKey="lowerBand"
                  stroke="none"
                  fill={forecastResult.allGreen ? "url(#premortBandGreen)" : "url(#premortBandRed)"}
                  fillOpacity={0.08}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                {/* Process control limits (solid dash — process-derived) */}
                <ReferenceLine y={stats.ucl} stroke="#f87171" strokeDasharray="4 3" label={{ value: 'UCL', fill: '#f87171', fontSize: 9, position: 'right' }} />
                <ReferenceLine y={stats.mean} stroke="#97C459" strokeDasharray="4 3" label={{ value: 'CL', fill: '#97C459', fontSize: 9, position: 'right' }} />
                <ReferenceLine y={Math.max(0, stats.lcl)} stroke="#60a5fa" strokeDasharray="4 3" label={{ value: 'LCL', fill: '#60a5fa', fontSize: 9, position: 'right' }} />
                {/* Spec limits (lighter dash — user-set, matches Side by Side style) */}
                <ReferenceLine y={usl} stroke="#fb923c" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `USL ${formatStat(usl)}`, fill: '#fb923c', fontSize: 9, position: 'right' }} />
                <ReferenceLine y={lsl} stroke="#38bdf8" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `LSL ${formatStat(lsl)}`, fill: '#38bdf8', fontSize: 9, position: 'right' }} />

                {/* "Now" separator */}
                {data.length > 0 && (
                  <ReferenceLine
                    x={data[data.length - 1].name}
                    stroke="rgba(255,255,255,0.2)"
                    strokeDasharray="3 3"
                    label={{ value: 'Now', fill: 'rgba(255,255,255,0.4)', fontSize: 9, position: 'top' }}
                  />
                )}

                {/* Historical line */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b', stroke: 'none' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                {/* Forecast line with colored dots by breach type */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#c4b5fd"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    // Only render dots for actual forecast points, not the bridge point
                    if (!payload?.isForecast || cx == null || cy == null) return <g key={`dot-skip-${cx}-${cy}`} />;
                    // Skip bridge point (it has both historical and forecast values)
                    if (payload.historical != null) return <g key={`dot-bridge-${cx}-${cy}`} />;

                    let fill = 'rgba(99,153,34,0.75)';         // green — within all limits
                    if (payload.breachType === 'both')
                      fill = 'rgba(217,70,239,0.85)';           // fuchsia — both control + spec
                    else if (payload.breachType === 'control')
                      fill = 'rgba(248,113,113,0.85)';          // red — UCL/LCL breach
                    else if (payload.breachType === 'spec')
                      fill = 'rgba(251,146,60,0.85)';           // orange — USL/LSL breach
                    else if (payload.isEarlyWarning)
                      fill = 'rgba(251,191,36,0.75)';           // amber — 2σ zone warning

                    return (
                      <circle
                        key={`dot-forecast-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={fill}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                      />
                    );
                  }}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Dot color legend */}
          <div className="flex flex-wrap gap-3 px-1 mb-4 text-[10px] text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'rgba(99,153,34,0.75)' }} />
              Within all limits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'rgba(251,191,36,0.75)' }} />
              Early warning (2σ zone)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'rgba(251,146,60,0.85)' }} />
              Spec breach (USL/LSL)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'rgba(248,113,113,0.85)' }} />
              Control breach (UCL/LCL)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'rgba(217,70,239,0.85)' }} />
              Both limits breached
            </span>
          </div>

          {/* ── Summary cards 3×2 ── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Forecast trend</p>
              <p className={`text-lg font-bold truncate ${forecastResult.slope > 0 ? 'text-amber-400' : forecastResult.slope < 0 ? 'text-blue-400' : 'text-white/60'}`}>
                {forecastResult.slope > 0 ? '↑' : forecastResult.slope < 0 ? '↓' : '→'} {formatStat(Math.abs(forecastResult.slope))}/period
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">First breach</p>
              <p className={`text-lg font-bold truncate ${forecastResult.allGreen ? 'text-green-400' : 'text-red-400'}`}>
                {forecastResult.firstBreachLabel ?? 'None'}
                {forecastResult.firstBreachDirection && (
                  <span className="text-xs font-normal ml-1 text-white/40">({forecastResult.firstBreachDirection})</span>
                )}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Confidence band</p>
              <p className="text-lg font-bold text-white truncate">{confidenceLevel}% CI</p>
              <p className="text-[10px] text-white/30 truncate">z = {confidenceZ.toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Points at risk</p>
              <p className={`text-lg font-bold truncate ${forecastResult.breachCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {forecastResult.breachCount} / {forecastResult.points.length}
              </p>
              <p className="text-[10px] text-white/30 truncate">
                {forecastResult.points.filter(p => p.isEarlyWarning).length} early warnings
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Control breaches</p>
              <p className={`text-lg font-bold truncate ${forecastResult.controlBreachCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {forecastResult.controlBreachCount}
              </p>
              <p className="text-[10px] text-white/30 truncate">UCL / LCL</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 overflow-hidden">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Spec breaches</p>
              <p className={`text-lg font-bold truncate ${forecastResult.specBreachCount > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {forecastResult.specBreachCount}
              </p>
              <p className="text-[10px] text-white/30 truncate">USL / LSL</p>
            </div>
          </div>

          {/* ── Alert box ── */}
          {forecastResult.allGreen ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5 text-green-300 text-xs leading-relaxed flex items-start gap-2">
              <span className="text-green-400 text-base mt-[-1px]">✓</span>
              <span>
                <strong>All clear.</strong> The forecast projects all {forecastResult.points.length} future points
                within both control and spec limits. No predicted breaches at {confidenceLevel}% confidence — process appears on a stable trajectory.
              </span>
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {/* Control limit breach alert */}
              {forecastResult.controlBreachCount > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-red-400 text-base mt-[-1px]">⚠</span>
                  <span>
                    <strong>Process control breach predicted.</strong> {forecastResult.controlBreachCount} of {forecastResult.points.length} forecast
                    points exceed UCL/LCL. First at <strong>{forecastResult.firstControlBreachLabel}</strong> ({forecastResult.firstControlBreachDirection} the limit).
                    The process is drifting out of statistical control — investigate assignable causes.
                  </span>
                </div>
              )}
              {/* Spec limit breach alert */}
              {forecastResult.specBreachCount > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-orange-300 text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-orange-400 text-base mt-[-1px]">⚠</span>
                  <span>
                    <strong>Spec limit breach predicted.</strong> {forecastResult.specBreachCount} of {forecastResult.points.length} forecast
                    points exceed USL/LSL. First at <strong>{forecastResult.firstSpecBreachLabel}</strong> ({forecastResult.firstSpecBreachDirection} the limit).
                    Product may fall outside specification — preemptive adjustment recommended.
                  </span>
                </div>
              )}
              {/* Combined summary when both types breach */}
              {forecastResult.controlBreachCount > 0 && forecastResult.specBreachCount > 0 && (
                <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl px-4 py-3 text-fuchsia-300 text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-fuchsia-400 text-base mt-[-1px]">⚠⚠</span>
                  <span>
                    <strong>Both control and spec breaches predicted.</strong> The process is forecasted to exceed
                    both statistical control limits and product specifications. Immediate intervention is critical.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Gemini premortem analysis ── */}
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">AI premortem analysis</p>
            <div className="bg-white/5 rounded-xl p-3 text-white/70 text-xs leading-relaxed italic min-h-[40px]">
              {loadingPremort ? (
                <span className="text-white/30 animate-pulse">Generating premortem insight…</span>
              ) : premortInsight ? (
                premortInsight
              ) : (
                <span className="text-white/30">Premortem insight unavailable.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small helper component ──────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center overflow-hidden">
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold truncate" style={{ color }}>{value}</p>
    </div>
  );
}
