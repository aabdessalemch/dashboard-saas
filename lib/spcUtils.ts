// ─── SPC Utility Functions ───────────────────────────────────────────────────

export interface SPCData {
  values: number[];
  labels: string[];
}

export interface SPCStats {
  mean: number;
  sigma: number;
  ucl: number;
  lcl: number;
  zone1Upper: number; // mean + 1σ
  zone1Lower: number; // mean - 1σ
  zone2Upper: number; // mean + 2σ
  zone2Lower: number; // mean - 2σ
}

export type RuleSeverity = 'critical' | 'warning' | 'info';

export interface RuleResult {
  ruleNumber: number;
  name: string;
  severity: RuleSeverity;
  fired: boolean;
  violatingPoints: number[]; // indexes into the values array
  message: string; // plain English explanation
}

export interface NelsonRulesResult {
  results: RuleResult[];
  violationCount: number;
  healthScore: number; // 0–100
}

export interface CapabilityResult {
  cp: number;
  cpk: number;
  cpu: number;
  cpl: number;
  sigmaLevel: number;
  ppm: number;
}

export type SPCChartType = 'IMR' | 'XBAR_R' | 'XBAR_S' | 'P' | 'NP' | 'C' | 'U';

export interface SPCChartRecommendation {
  chartType: SPCChartType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Helper: Standard Normal CDF (Horner approximation) ─────────────────────

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

// ─── Calculate SPC Stats ─────────────────────────────────────────────────────

export function calculateSPCStats(values: number[]): SPCStats {
  if (values.length === 0) {
    return {
      mean: 0, sigma: 0, ucl: 0, lcl: 0,
      zone1Upper: 0, zone1Lower: 0,
      zone2Upper: 0, zone2Lower: 0,
    };
  }

  // Coerce all values to finite numbers
  const clean = values.map(v => { const n = Number(v); return isFinite(n) ? n : 0; });
  const n = clean.length;
  const mean = clean.reduce((sum, v) => sum + v, 0) / n;

  // ── Sigma estimation ──────────────────────────────────────────────────────
  // I-MR method: estimate sigma from average Moving Range (ISO 7870-2)
  // This measures only point-to-point (common cause) variation,
  // not total variation which includes trends and shifts.
  let sigma: number;

  if (n >= 2) {
    // Compute moving ranges: absolute difference between consecutive observations
    const movingRanges: number[] = [];
    for (let i = 1; i < n; i++) {
      movingRanges.push(Math.abs(clean[i] - clean[i - 1]));
    }
    const mrBar = movingRanges.reduce((sum, mr) => sum + mr, 0) / movingRanges.length;

    // d2 = 1.128: unbiasing constant for subgroup size n=2 (moving range)
    // Source: ASTM STP 15D, Montgomery "Introduction to Statistical Quality Control"
    const d2 = 1.128;
    sigma = mrBar / d2;
  } else {
    // Single point: no variation measurable
    sigma = 0;
  }

  // ── Control limits ────────────────────────────────────────────────────────
  // Store TRUE statistical values — no clamping here.
  // The UI display layer applies Math.max(0, lcl) for non-negative processes.
  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;

  return {
    mean,
    sigma,
    ucl,
    lcl,
    zone1Upper: mean + sigma,
    zone1Lower: mean - sigma,
    zone2Upper: mean + 2 * sigma,
    zone2Lower: mean - 2 * sigma,
  };
}

// ─── Detect SPC Chart Type ───────────────────────────────────────────────────

export function detectSPCChartType(
  values: number[],
  originalChartType: string,
  sampleSize?: number
): SPCChartRecommendation {
  const ss = sampleSize ?? 1;

  if (originalChartType === 'trend' || originalChartType === 'line') {
    if (ss === 1) {
      return { chartType: 'IMR', reason: 'Time-series with individual measurements — I-MR chart is standard.', confidence: 'high' };
    }
    if (ss >= 2 && ss <= 9) {
      return { chartType: 'XBAR_R', reason: `Subgroup size ${ss} (2–9) — X̄-R chart is optimal.`, confidence: 'high' };
    }
    return { chartType: 'XBAR_S', reason: `Subgroup size ${ss} (≥10) — X̄-S chart recommended.`, confidence: 'high' };
  }

  if (originalChartType === 'bar') {
    const allIntegers = values.every(v => Number.isInteger(v));
    const allProportions = values.every(v => v >= 0 && v <= 1);
    const allSmall = values.every(v => v >= 0 && v < 50);

    if (allProportions && values.some(v => v > 0 && v < 1)) {
      return { chartType: 'P', reason: 'Values are proportions (0–1) — P chart recommended.', confidence: 'high' };
    }
    if (allIntegers && allSmall) {
      return { chartType: 'C', reason: 'Small integer counts — C chart recommended for defect counts.', confidence: 'medium' };
    }
    return { chartType: 'IMR', reason: 'Bar chart data treated as individual measurements.', confidence: 'low' };
  }

  if (originalChartType === 'scatter') {
    return { chartType: 'IMR', reason: 'Scatter data treated as individual measurements.', confidence: 'medium' };
  }

  if (originalChartType === 'pie') {
    return { chartType: 'P', reason: 'Pie segments treated as proportions.', confidence: 'medium' };
  }

  return { chartType: 'IMR', reason: 'Default — data treated as individual measurements.', confidence: 'low' };
}

// ─── Nelson Rules ────────────────────────────────────────────────────────────

export function runAllNelsonRules(
  values: number[],
  labels: string[],
  stats: SPCStats
): NelsonRulesResult {
  const { mean, ucl, lcl, zone1Upper, zone1Lower, zone2Upper, zone2Lower } = stats;
  const n = values.length;
  const results: RuleResult[] = [];

  // ── Rule 1: 1 point outside UCL or LCL (CRITICAL) ──
  {
    const violating: number[] = [];
    for (let i = 0; i < n; i++) {
      if (values[i] > ucl || values[i] < lcl) violating.push(i);
    }
    const violatingLabels = violating.map(i => labels[i]).join(', ');
    results.push({
      ruleNumber: 1,
      name: 'Point beyond control limit',
      severity: 'critical',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: violating.length > 0
        ? `Point(s) ${violatingLabels} exceeded control limits — investigate immediately. Possible causes: machine failure, wrong material, measurement error.`
        : 'No points outside control limits.',
    });
  }

  // ── Rule 2: 9 consecutive points on same side of mean (WARNING) ──
  {
    const violating: number[] = [];
    let message = '';
    for (let i = 0; i <= n - 9; i++) {
      const slice = values.slice(i, i + 9);
      const allAbove = slice.every(v => v > mean);
      const allBelow = slice.every(v => v < mean);
      if (allAbove || allBelow) {
        for (let j = i; j < i + 9; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        const side = allAbove ? 'above' : 'below';
        message = `Points ${labels[i]}–${labels[i + 8]} are all ${side} the mean for 9 periods — process mean may have permanently shifted. Check for a settings or supplier change.`;
      }
    }
    results.push({
      ruleNumber: 2,
      name: '9 consecutive points same side',
      severity: 'warning',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No run of 9 on one side detected.',
    });
  }

  // ── Rule 3: 6 points continuously increasing or decreasing (WARNING) ──
  {
    const violating: number[] = [];
    let message = '';
    for (let i = 0; i <= n - 6; i++) {
      let increasing = true;
      let decreasing = true;
      for (let j = i; j < i + 5; j++) {
        if (values[j + 1] <= values[j]) increasing = false;
        if (values[j + 1] >= values[j]) decreasing = false;
      }
      if (increasing || decreasing) {
        for (let j = i; j < i + 6; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        const direction = increasing ? 'Upward' : 'Downward';
        const verb = increasing ? 'increases' : 'decreases';
        message = `${direction} trend detected from ${labels[i]} to ${labels[i + 5]} — 6 consecutive ${verb} suggest gradual drift. Check for tool wear, temperature buildup, or operator fatigue.`;
      }
    }
    results.push({
      ruleNumber: 3,
      name: '6 consecutive increasing/decreasing',
      severity: 'warning',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No monotonic trend of 6 detected.',
    });
  }

  // ── Rule 4: 14 points alternating up and down (INFO) ──
  {
    const violating: number[] = [];
    let message = '';

    for (let i = 0; i <= n - 14; i++) {
      let alternating = true;

      // Check each interior point: the direction must strictly reverse at every step.
      // A tie (zero difference) is treated as not alternating.
      for (let j = i + 1; j < i + 13; j++) {
        const prevDiff = values[j] - values[j - 1];
        const nextDiff = values[j + 1] - values[j];

        // Same sign OR either is zero = pattern broken
        if (prevDiff * nextDiff >= 0) {
          alternating = false;
          break;
        }
      }

      if (alternating) {
        for (let j = i; j < i + 14; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        message = `Alternating pattern from ${labels[i]} to ${labels[i + 13]} — `
          + `may indicate two alternating sources such as two machines, `
          + `two operators, or shift changes.`;
      }
    }

    results.push({
      ruleNumber: 4,
      name: '14 alternating points',
      severity: 'info',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No alternating pattern of 14 detected.',
    });
  }

  // ── Rule 5: 2 of 3 consecutive points beyond 2σ on same side (WARNING) ──
  {
    const violating: number[] = [];
    let message = '';
    for (let i = 0; i <= n - 3; i++) {
      const slice = values.slice(i, i + 3);
      const aboveCount = slice.filter(v => v > zone2Upper).length;
      const belowCount = slice.filter(v => v < zone2Lower).length;
      if (aboveCount >= 2 || belowCount >= 2) {
        for (let j = i; j < i + 3; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        message = `2 of 3 points near ${labels[i]}–${labels[i + 2]} are beyond 2σ — early warning of a process shift before the limit is breached.`;
      }
    }
    results.push({
      ruleNumber: 5,
      name: '2 of 3 beyond 2σ same side',
      severity: 'warning',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No 2-of-3 beyond 2σ pattern detected.',
    });
  }

  // ── Rule 6: 4 of 5 consecutive points beyond 1σ on same side (WARNING) ──
  {
    const violating: number[] = [];
    let message = '';
    for (let i = 0; i <= n - 5; i++) {
      const slice = values.slice(i, i + 5);
      const aboveCount = slice.filter(v => v > zone1Upper).length;
      const belowCount = slice.filter(v => v < zone1Lower).length;
      if (aboveCount >= 4 || belowCount >= 4) {
        for (let j = i; j < i + 5; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        message = `4 of 5 points near ${labels[i]}–${labels[i + 4]} are beyond 1σ — moderate sustained shift in process mean detected.`;
      }
    }
    results.push({
      ruleNumber: 6,
      name: '4 of 5 beyond 1σ same side',
      severity: 'warning',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No 4-of-5 beyond 1σ pattern detected.',
    });
  }

  // ── Rule 7: 15 consecutive points within 1σ of mean (INFO) ──
  {
    const violating: number[] = [];
    let message = '';
    for (let i = 0; i <= n - 15; i++) {
      const slice = values.slice(i, i + 15);
      const allWithin = slice.every(v => v >= zone1Lower && v <= zone1Upper);
      if (allWithin) {
        for (let j = i; j < i + 15; j++) {
          if (!violating.includes(j)) violating.push(j);
        }
        message = `15 consecutive points are suspiciously close to the mean — check for data stratification, mixed subgroups, or incorrectly wide control limits.`;
      }
    }
    results.push({
      ruleNumber: 7,
      name: '15 points within 1σ',
      severity: 'info',
      fired: violating.length > 0,
      violatingPoints: violating,
      message: message || 'No hugging-the-mean pattern detected.',
    });
  }

  // ── Health score ──
  const penalties: Record<number, number> = { 1: 35, 2: 20, 3: 15, 4: 10, 5: 15, 6: 10, 7: 5 };
  let score = 100;
  for (const r of results) {
    if (r.fired) {
      score -= penalties[r.ruleNumber] ?? 0;
    }
  }
  score = Math.max(0, score);

  const violationCount = results.filter(r => r.fired).length;

  return { results, violationCount, healthScore: score };
}

// ─── Capability Analysis (Cp / Cpk) ─────────────────────────────────────────

export function calculateCapability(
  values: number[],
  stats: SPCStats,
  usl: number,
  lsl: number
): CapabilityResult {
  const { mean, sigma } = stats;

  if (sigma === 0) {
    return { cp: Infinity, cpk: Infinity, cpu: Infinity, cpl: Infinity, sigmaLevel: Infinity, ppm: 0 };
  }

  const cp = (usl - lsl) / (6 * sigma);
  const cpu = (usl - mean) / (3 * sigma);
  const cpl = (mean - lsl) / (3 * sigma);
  const cpk = Math.min(cpu, cpl);
  const sigmaLevel = cpk * 3;

  const pAbove = 1 - normalCDF((usl - mean) / sigma);  // P(X > USL)
  const pBelow = normalCDF((lsl - mean) / sigma);        // P(X < LSL)
  const ppm = Math.round((pAbove + pBelow) * 1_000_000);

  return { cp, cpk, cpu, cpl, sigmaLevel, ppm };
}

// ─── Forecast / Premortem ────────────────────────────────────────────────────

export type BreachType = 'control' | 'spec' | 'both' | null;

export interface ForecastPoint {
  name: string;
  value: number;
  upperBand: number;
  lowerBand: number;
  isForecast: true;
  willBreach: boolean;          // true if ANY limit breached (control OR spec)
  isEarlyWarning: boolean;
  breachType: BreachType;       // which limits are breached
  breachesControl: boolean;     // exceeds UCL or LCL
  breachesSpec: boolean;        // exceeds USL or LSL
}

export interface ForecastResult {
  points: ForecastPoint[];
  slope: number;
  intercept: number;

  // Total breach count (control OR spec)
  breachCount: number;
  firstBreachLabel: string | null;
  firstBreachDirection: 'above' | 'below' | null;

  // Control limit breaches (UCL/LCL)
  controlBreachCount: number;
  firstControlBreachLabel: string | null;
  firstControlBreachDirection: 'above' | 'below' | null;

  // Spec limit breaches (USL/LSL)
  specBreachCount: number;
  firstSpecBreachLabel: string | null;
  firstSpecBreachDirection: 'above' | 'below' | null;

  // allGreen: true only when NO control AND NO spec breaches
  allGreen: boolean;
}

export interface SpecLimits {
  usl: number;
  lsl: number;
}

/**
 * Linear-regression based forecast with confidence bands.
 *
 * @param values      – historical numeric values
 * @param labels      – corresponding labels (e.g. "Wk1", "Wk2" …)
 * @param stats       – SPC stats (mean, sigma, ucl, lcl, zones)
 * @param horizon     – how many steps to forecast (default 7)
 * @param confidenceZ – z-value for confidence band (1.96 = 95%, 1.28 = 80%)
 * @param specLimits  – optional USL/LSL for spec breach detection
 */
export function calculateForecast(
  values: number[],
  labels: string[],
  stats: SPCStats,
  horizon: number = 7,
  confidenceZ: number = 1.96,
  specLimits?: SpecLimits,
): ForecastResult {
  const n = values.length;

  // ── Linear regression (least squares) ──
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // ── Residual standard error ──
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (values[i] - (intercept + slope * i)) ** 2;
  }
  const residualSE = n > 2 ? Math.sqrt(ssRes / (n - 2)) : stats.sigma;
  const xMean      = sumX / n;

  // ── Label generator ──
  const lastLabel  = labels[n - 1] ?? '';
  const weekMatch  = lastLabel.match(/^(Wk|Week|W)\s*(\d+)$/i);
  const monthMatch = lastLabel.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i);
  const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function makeLabel(step: number): string {
    if (weekMatch) {
      return `${weekMatch[1]}${parseInt(weekMatch[2], 10) + step}`;
    }
    if (monthMatch) {
      const idx = MONTHS.findIndex(m => m.toLowerCase() === lastLabel.toLowerCase());
      return MONTHS[(idx + step) % 12];
    }
    // Try to extract a trailing number from the last label
    const numMatch = lastLabel.match(/(\d+)$/);
    if (numMatch) {
      const prefix = lastLabel.slice(0, lastLabel.length - numMatch[1].length);
      return `${prefix}${parseInt(numMatch[1], 10) + step}`;
    }
    return `F+${step}`;
  }

  // ── Spec limit values (with safe fallback) ──
  const usl = specLimits?.usl ?? Infinity;
  const lsl = specLimits?.lsl ?? -Infinity;
  const hasSpecLimits = specLimits != null &&
    isFinite(specLimits.usl) &&
    isFinite(specLimits.lsl) &&
    specLimits.usl > specLimits.lsl;

  // ── Build forecast points ──
  const points: ForecastPoint[] = [];

  let firstBreachLabel: string | null            = null;
  let firstBreachDirection: 'above' | 'below' | null = null;

  let controlBreachCount = 0;
  let firstControlBreachLabel: string | null            = null;
  let firstControlBreachDirection: 'above' | 'below' | null = null;

  let specBreachCount = 0;
  let firstSpecBreachLabel: string | null            = null;
  let firstSpecBreachDirection: 'above' | 'below' | null = null;

  for (let step = 1; step <= horizon; step++) {
    const x         = n - 1 + step;
    const predicted = intercept + slope * x;

    // ── Confidence band (widens with distance from centroid) ──
    const hx        = 1 / n + ((x - xMean) ** 2) / (sumX2 - n * xMean * xMean);
    const bandWidth = confidenceZ * residualSE * Math.sqrt(1 + hx);
    const upperBand = predicted + bandWidth;
    const lowerBand = predicted - bandWidth;

    // ── Breach detection ──
    const breachesControl = predicted > stats.ucl || predicted < stats.lcl;
    const breachesSpec    = hasSpecLimits && (predicted > usl || predicted < lsl);
    const willBreach      = breachesControl || breachesSpec;

    // Breach type
    let breachType: BreachType = null;
    if (breachesControl && breachesSpec) breachType = 'both';
    else if (breachesControl)            breachType = 'control';
    else if (breachesSpec)               breachType = 'spec';

    // Track first overall breach
    if (willBreach && !firstBreachLabel) {
      firstBreachLabel     = makeLabel(step);
      firstBreachDirection = predicted > Math.max(stats.ucl, usl) ? 'above' : 'below';
    }

    // Track first control breach
    if (breachesControl && !firstControlBreachLabel) {
      firstControlBreachLabel     = makeLabel(step);
      firstControlBreachDirection = predicted > stats.ucl ? 'above' : 'below';
    }

    // Track first spec breach
    if (breachesSpec && !firstSpecBreachLabel) {
      firstSpecBreachLabel     = makeLabel(step);
      firstSpecBreachDirection = predicted > usl ? 'above' : 'below';
    }

    if (breachesControl) controlBreachCount++;
    if (breachesSpec)    specBreachCount++;

    // ── Early warning: in 2σ zone but not yet breaching control limits ──
    const isEarlyWarning = !breachesControl && (
      predicted > stats.zone2Upper || predicted < stats.zone2Lower
    );

    points.push({
      name: makeLabel(step),
      value: predicted,
      upperBand,
      lowerBand,
      isForecast: true,
      willBreach,
      isEarlyWarning,
      breachType,
      breachesControl,
      breachesSpec,
    });
  }

  const breachCount = points.filter(p => p.willBreach).length;
  const allGreen    = breachCount === 0;

  return {
    points,
    slope,
    intercept,
    breachCount,
    firstBreachLabel,
    firstBreachDirection,
    controlBreachCount,
    firstControlBreachLabel,
    firstControlBreachDirection,
    specBreachCount,
    firstSpecBreachLabel,
    firstSpecBreachDirection,
    allGreen,
  };
}
