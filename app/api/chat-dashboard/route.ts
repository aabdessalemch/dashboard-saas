import { NextRequest } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_STREAM_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`;

// === Canvas Context Builder ===

function buildCanvasContext(dashboardContext: any): string {
  if (!dashboardContext?.widgetTypes?.length) {
    return 'The dashboard is currently empty - no widgets exist yet.';
  }

  const lines: string[] = [
    `The dashboard has ${dashboardContext.widgetCount} widget(s) on the canvas:\n`
  ];

  dashboardContext.widgetTypes.forEach((w: any, i: number) => {
    lines.push(`--- Widget ${i + 1} ---`);
    lines.push(`ID: ${w.id}`);
    lines.push(`Type: ${w.type}`);
    lines.push(`Title: "${w.title}"`);

    if (w.chartData && w.chartData.length > 0) {
      const values = w.chartData.map((d: any) => d.value);
      const mean = (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const first = values[0];
      const last = values[values.length - 1];
      const trendDirection = last > first ? 'upward' : last < first ? 'downward' : 'flat';

      lines.push(`Data (${w.chartData.length} points):`);
      w.chartData.forEach((pt: any) => {
        lines.push(`  ${pt.name}: ${pt.value}`);
      });
      lines.push(`Computed stats: mean=${mean}, max=${max}, min=${min}, trend=${trendDirection}`);
    }

    if (w.tableData) {
      lines.push(`Table: ${w.tableData.rowCount} rows`);
      lines.push(`Columns: ${w.tableData.columns?.join(', ')}`);
      if (w.tableData.allRows?.length > 0) {
        w.tableData.allRows.forEach((row: any, idx: number) => {
          const vals = Object.values(row).map((cell: any) =>
            typeof cell === 'object' && cell?.value !== undefined ? cell.value : cell
          ).join(' | ');
          lines.push(`  ${idx === 0 ? 'HEADERS' : `Row ${idx}`}: ${vals}`);
        });
      }
    }

    if (w.kpiData) {
      lines.push(`KPI value: ${w.kpiData.value}`);
      lines.push(`KPI change: ${w.kpiData.change}`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

// === Conversation History Formatter ===

function formatHistory(history: any[]): string {
  if (!history?.length) return 'No previous messages.';
  return history
    .slice(-10)
    .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}

// === System Prompt Builder ===

function buildSystemPrompt(canvasContext: string, historyText: string): string {
  return `You are the AI brain of Talk to Data - a smart dashboard generator and analyst.
You have full awareness of the user's canvas and can read, create, edit, delete,
and interpret any widget on it.

CANVAS STATE (read this carefully before every response)
${canvasContext}

RECENT CONVERSATION
${historyText}

YOUR CAPABILITIES

You can perform these 6 action types:

1. ADD - create new widget(s) on the canvas
2. EDIT - modify an existing widget by its exact ID from the canvas state above
3. DELETE - remove a widget by its exact ID
4. CONFIRM - ask the user to confirm before doing something destructive
5. ANSWER - respond to a data question without touching the canvas
6. SPC - trigger the SPC analysis panel on a chart widget

RESPONSE FORMAT - ALWAYS USE THIS STRUCTURE

Write your conversational reply naturally, then at the very end emit:

__ACTIONS_START__
[array of action objects]
__ACTIONS_END__

If no canvas action is needed (e.g. answering a question), emit:

__ACTIONS_START__
[]
__ACTIONS_END__

ALL 6 ACTION TYPES - EXACT FORMAT

// 1. ADD - create new widget(s)
{
  "type": "add",
  "widgets": [
    {
      "type": "trend | bar | line | pie | kpi | table | text",
      "data": { ...see widget formats below... }
    }
  ]
}

// 2. EDIT - modify existing widget (use EXACT ID from canvas state)
{
  "type": "edit",
  "widgetId": "EXACT_ID_FROM_CANVAS_STATE",
  "updates": {
    "title": "optional new title",
    "data": [{"name": "label", "value": 123}],
    "colors": ["#hexcolor"],
    "value": "new value for KPI",
    "change": "+12% for KPI",
    "content": "<html> for text widget"
  }
}

// 3. DELETE - remove a widget (use EXACT ID from canvas state)
{
  "type": "delete",
  "widgetId": "EXACT_ID_FROM_CANVAS_STATE"
}

// 4. CONFIRM - ask before destructive action (use for delete all, clear dashboard)
{
  "type": "confirm",
  "message": "This will delete all 5 widgets. Are you sure?",
  "pendingActions": [...the actions to execute if confirmed...]
}

// 5. ANSWER - data question, no canvas change needed
{
  "type": "answer",
  "insight": "Plain English analysis"
}

// 6. SPC - open the SPC panel on a specific chart widget
{
  "type": "spc",
  "widgetId": "EXACT_ID_FROM_CANVAS_STATE",
  "spcConfig": {
    "openPanel": true,
    "activeTab": "compare | rules | capability | premortem",
    "showPremortem": false,
    "forecastHorizon": 7,
    "usl": null,
    "lsl": null
  }
}

WIDGET DATA FORMATS

TREND (area chart - time series, growth, weekly/monthly data):
{"title":"Title","data":[{"name":"Wk1","value":400},{"name":"Wk2","value":600}],"colors":["#f59e0b"]}

BAR (comparisons - categories, quarters, regions):
{"title":"Title","data":[{"name":"Q1","value":245000},{"name":"Q2","value":312000}],"colors":["#8b5cf6"]}

LINE (detailed point-by-point data):
{"title":"Title","data":[{"name":"Jan","value":12000},{"name":"Feb","value":15000}],"colors":["#3b82f6"]}

PIE (proportions - market share, distribution):
{"title":"Title","data":[{"name":"A","value":40},{"name":"B","value":30},{"name":"C","value":30}],"colors":["#8b5cf6","#3b82f6","#10b981"]}

KPI (single metric card):
{"title":"Revenue","value":"$2.4M","unit":"","trend":"up","trendValue":"18.5","change":"+18.5%"}

TABLE:
{"title":"Data","rows":[[{"value":"Product"},{"value":"Revenue"}],[{"value":"Widget A"},{"value":"$120K"}]]}

TEXT:
{"content":"<div style='color:white;font-size:20px;font-weight:bold'>Title Here</div>"}

SPC FEATURE - WHAT IT IS AND HOW TO USE IT

The app has a Statistical Process Control (SPC) system built in.
Any trend, bar, line, or pie chart has an "Analyze with SPC" button.

The SPC panel has 4 tabs:
- "compare" = side-by-side: original chart vs control chart with UCL/CL/LCL lines
- "rules" = runs all 7 Nelson rules and shows which ones fired
- "capability" = Cp/Cpk analysis (requires USL and LSL from user)
- "premortem" = predictive forecast of next N points

Trigger SPC when user says:
- "Analyze my chart" / "run SPC" -> openPanel: true, activeTab: "compare"
- "Show me next 7 weeks" / "forecast" -> showPremortem: true, forecastHorizon: 7
- "Is something bad coming?" -> showPremortem: true, activeTab: "premortem"
- "Calculate Cp Cpk USL 1100 LSL 200" -> activeTab: "capability", usl: 1100, lsl: 200
- "Which rules are firing?" -> activeTab: "rules"

If user says "run SPC" without specifying which chart:
- If there is only one chart, use that one
- If there are multiple, ask "Which chart - [list titles]?"

STRICT DATA RULES

- Chart data MUST use field "name" (never: date, label, month, category)
- Chart data MUST use field "value" as a NUMBER (never a string, no $ or commas)
- Use EXACT numbers from user - never invent placeholder data
- Create minimum 4 data points for any chart
- When editing, use the EXACT widgetId from the canvas state above
- Never guess a widget ID - only use IDs that appear in the canvas state

REFERENCE RESOLUTION - HOW TO HANDLE VAGUE REQUESTS

When user says "it", "that", "the chart", "this widget":
1. Check the conversation history for the most recently mentioned widget
2. If still ambiguous, pick the most recently created widget
3. If still ambiguous, ask: "Which widget do you mean - [list titles]?"

When user says "make it blue" -> edit colors of resolved widget
When user says "delete it" -> delete resolved widget
When user says "add another week" -> edit resolved chart, append data point
When user says "do the same for the bar chart" -> repeat last operation on bar widget

DESTRUCTIVE ACTION RULES

ALWAYS use the "confirm" action (never execute immediately) when:
- User says "delete all", "remove all", "clear everything", "start over"
- User says "delete all [type]s" (e.g. "delete all KPIs")
- The action would delete 3 or more widgets at once

For single widget deletion ("delete the pie chart"), execute immediately - no confirm needed.

CSV AND IMAGE HANDLING

CSV uploaded:
- Examine all columns and row count
- Identify numeric columns vs label columns
- If one label column + one numeric column -> trend or bar chart
- If one label column + multiple numeric columns -> grouped bar or multi-line
- If columns represent proportions that sum to 100 -> pie chart
- Use EXACT values from the CSV - never round or approximate
- Name the chart after the CSV filename if no better title is evident

Image uploaded:
- Extract every number, label, and data series visible
- Match chart type to what is shown in the image
- If image shows a table -> create a table widget with exact values
- If image shows a chart -> recreate it as the matching widget type

EXAMPLES OF SMART BEHAVIOR

User: "Why is week 4 so high?"
-> ANSWER action: compute week 4 vs mean, flag as outlier, give plain English reason

User: "What is the average of my trend chart?"
-> ANSWER action: compute mean from chart data, reply in chat

User: "Make the bar chart green"
-> EDIT action: find bar widget ID, update colors to ["#10b981"]

User: "Add week 13 with 980 to my trend chart"
-> EDIT action: find trend widget ID, append {"name":"Wk13","value":980} to data array

User: "Create a dashboard for a factory"
-> ADD action: create multiple relevant widgets (trend for output, KPIs for defects/efficiency, bar for shifts)

User: "Delete all KPIs"
-> CONFIRM action: "This will delete [N] KPI widgets. Are you sure?"

User: "Summarize my dashboard"
-> ANSWER action: narrative description of all widgets and their key data points

User: "Run SPC on the revenue chart"
-> SPC action: find revenue chart ID, openPanel: true, activeTab: "compare"

User: "Show me the next 10 weeks forecast"
-> SPC action: find most relevant chart, showPremortem: true, forecastHorizon: 10`;
}

// === Auto-fix Actions ===

function autoFixActions(actions: any[]): any[] {
  return actions.map(action => {
    // Fix chart data fields in add actions
    if (action.type === 'add' && action.widgets) {
      action.widgets = action.widgets.map((widget: any) => {
        if (['bar', 'line', 'pie', 'trend'].includes(widget.type) && widget.data?.data) {
          widget.data.data = widget.data.data.map((item: any) => ({
            name: String(
              item.name ?? item.date ?? item.label ?? item.month ??
              item.category ?? item.x ?? item.period ?? item.week ?? ''
            ),
            value: typeof item.value === 'number' ? item.value :
                   typeof item.amount === 'number' ? item.amount :
                   typeof item.count === 'number' ? item.count :
                   typeof item.total === 'number' ? item.total :
                   parseFloat(String(item.value ?? 0).replace(/[^0-9.-]/g, '')) || 0
          }));
        }
        return widget;
      });
    }
    // Fix chart data fields in edit actions
    if (action.type === 'edit' && action.updates?.data) {
      if (Array.isArray(action.updates.data)) {
        action.updates.data = action.updates.data.map((item: any) => ({
          name: String(item.name ?? item.date ?? item.label ?? ''),
          value: typeof item.value === 'number' ? item.value :
                 parseFloat(String(item.value ?? 0).replace(/[^0-9.-]/g, '')) || 0
        }));
      }
    }
    return action;
  });
}

// === Route Handler ===

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const {
    message,
    conversationHistory,
    dashboardContext,
    csvData,
    csvFileName,
    imageData,
    imageFileName
  } = await request.json();

  const canvasContext = buildCanvasContext(dashboardContext);
  const historyText = formatHistory(conversationHistory ?? []);
  const systemPrompt = buildSystemPrompt(canvasContext, historyText);

  // Build the parts array for Gemini
  const parts: any[] = [];

  let userContent = `${systemPrompt}\n\nUSER MESSAGE: "${message}"`;

  if (csvData?.length) {
    userContent += `\n\nCSV FILE: "${csvFileName}"\n`;
    userContent += csvData.map((row: string[], idx: number) =>
      idx === 0 ? `HEADERS: ${row.join(' | ')}` : `Row ${idx}: ${row.join(' | ')}`
    ).join('\n');
    userContent += '\n\nUse the EXACT values from this CSV.';
  }

  if (imageFileName) {
    userContent += `\n\nIMAGE FILE: "${imageFileName}" - analyze and extract all visible data.`;
  }

  parts.push({ text: userContent });

  if (imageData) {
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    const mimeType = imageData.includes('data:') ? imageData.split(';')[0].split(':')[1] : 'image/jpeg';
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }

  // Call Gemini streaming endpoint with retry for rate limits
  let geminiResponse: Response | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    geminiResponse = await fetch(GEMINI_STREAM_URL(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        }
      })
    });

    if (geminiResponse.status === 429 && attempt < maxRetries - 1) {
      // Wait before retrying (exponential backoff: 2s, 6s, 18s)
      const wait = (attempt + 1) * 2000 * (attempt + 1);
      console.log(`Rate limited (429), retrying in ${wait}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    break;
  }

  if (!geminiResponse || !geminiResponse.ok) {
    const error = geminiResponse ? await geminiResponse.text() : 'No response';
    const status = geminiResponse?.status || 500;
    console.error('Gemini API error:', status, error.substring(0, 500));

    if (status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. The free Gemini API quota is temporarily exhausted. Please wait 1-2 minutes and try again.', isRateLimit: true }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Gemini API error', details: error.substring(0, 300) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream the response back to the client
  const encoder = new TextEncoder();
  let buffer = '';

  const readable = new ReadableStream({
    async start(controller) {
      const reader = geminiResponse.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]' || !jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
              if (text) {
                buffer += text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        // After stream ends, extract and fix action block from buffer
        const actionsStart = buffer.indexOf('__ACTIONS_START__');
        const actionsEnd = buffer.indexOf('__ACTIONS_END__');

        if (actionsStart !== -1 && actionsEnd !== -1) {
          const actionsJson = buffer
            .substring(actionsStart + '__ACTIONS_START__'.length, actionsEnd)
            .trim();
          try {
            const rawActions = JSON.parse(actionsJson);
            const fixedActions = autoFixActions(rawActions);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ actions: fixedActions })}\n\n`)
            );
          } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ actions: [] })}\n\n`)
            );
          }
        } else {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ actions: [] })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
