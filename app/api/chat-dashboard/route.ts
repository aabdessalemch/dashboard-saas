import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('💬 Chat API called!');
  
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;
    
    console.log('🔑 Checking API keys...');
    console.log('NEXT_PUBLIC_ANTHROPIC_API_KEY:', process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ? '✅ Found' : '❌ Missing');
    console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Found' : '❌ Missing');
    console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Found' : '❌ Missing');
    
    if (!apiKey) {
      console.error('❌ No API key found in any environment variable');
      return NextResponse.json({ 
        message: 'API key not configured. Check your .env.local file.',
        actions: []
      });
    }

    console.log('✅ Using API key:', apiKey.substring(0, 15) + '...');

    const { message, conversationHistory, dashboardContext, csvData, csvFileName, imageData, imageFileName } = await request.json();
    
    console.log('💬 User message:', message);
    console.log('📊 Dashboard context:', JSON.stringify(dashboardContext, null, 2));
    if (csvData) console.log('📄 CSV uploaded:', csvFileName);
    if (imageData) console.log('🖼️ Image uploaded:', imageFileName);

    const isGeminiKey = apiKey.startsWith('AIza');
    const isAnthropicKey = apiKey.startsWith('sk-ant-');

    if (isGeminiKey) {
      console.log('🤖 Using Gemini API');
      
      const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
      const listResponse = await fetch(listUrl);
      
      if (!listResponse.ok) {
        return NextResponse.json({ 
          message: 'Failed to connect to AI service.',
          actions: []
        });
      }

      const modelsList = await listResponse.json();
      const availableModel = modelsList.models?.find((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (!availableModel) {
        return NextResponse.json({ 
          message: 'AI model not available.',
          actions: []
        });
      }

      // Build detailed widget context
      const widgetDetails = dashboardContext.widgetTypes?.map((w: any, i: number) => {
        let desc = `${i+1}. ${w.type.toUpperCase()}: "${w.title}" (ID: ${w.id})`;
        
        console.log(`\n🔍 Widget ${i+1}:`, w.type);
        
        if (w.tableData) {
          console.log('✅ Table data found!');
          console.log('Columns:', w.tableData.columns);
          console.log('Row count:', w.tableData.rowCount);
          console.log('All rows:', w.tableData.allRows);
          
          desc += `\n   📊 Table with ${w.tableData.rowCount} rows`;
          desc += `\n   📋 Columns: ${w.tableData.columns.join(', ')}`;
          
          if (w.tableData.allRows && w.tableData.allRows.length > 0) {
            desc += `\n   📄 COMPLETE TABLE DATA (${w.tableData.allRows.length} rows):\n`;
            w.tableData.allRows.forEach((row: any, idx: number) => {
              const rowValues = Object.values(row).map((cell: any) => {
                if (typeof cell === 'object' && cell.value !== undefined) {
                  return cell.value;
                }
                return cell;
              }).join(' | ');
              
              if (idx === 0) {
                desc += `      HEADERS: ${rowValues}\n`;
              } else {
                desc += `      ROW ${idx}: ${rowValues}\n`;
              }
            });
            console.log('✅ Table data added to prompt');
          } else {
            console.log('❌ No allRows found!');
          }
        }
        
        if (w.chartData) {
          desc += `\n   📈 Chart Data: ${JSON.stringify(w.chartData.slice(0, 5))}`;
        }
        
        if (w.kpiData) {
          desc += `\n   💰 KPI: ${w.kpiData.value}, ${w.kpiData.change}`;
        }
        
        return desc;
      }).join('\n\n') || 'No widgets on dashboard';

      console.log('\n📋 WIDGET DETAILS FOR AI:\n', widgetDetails);

      let promptText = `You are an EXPERT dashboard AI.

═══════════════════════════════════════════════════════════════
CURRENT DASHBOARD (${dashboardContext.widgetCount} widgets):
═══════════════════════════════════════════════════════════════
${widgetDetails}

═══════════════════════════════════════════════════════════════
USER REQUEST: "${message}"
═══════════════════════════════════════════════════════════════

${csvData ? `
📄 CSV FILE: "${csvFileName}"
Headers: ${csvData[0]?.join(', ')}
Rows: ${csvData.length - 1}

COMPLETE DATA:
${csvData.map((row: string[], idx: number) => {
  if (idx === 0) return `HEADERS: ${row.join(' | ')}`;
  return `ROW ${idx}: ${row.join(' | ')}`;
}).join('\n')}

⚠️ USE EXACT CSV NUMBERS ⚠️
` : ''}

${imageData ? `🖼️ IMAGE: "${imageFileName}"` : ''}

CRITICAL INSTRUCTIONS FOR CREATING CHARTS FROM TABLES:
When user asks to create a chart from a table:
1. Look at the COMPLETE TABLE DATA above
2. Find the numeric column (second column usually)
3. Use EXACT row labels and values from the table
4. Convert any formatted numbers ($12,000) to plain numbers (12000)

EXAMPLE - If table shows:
HEADERS: Month | Revenue
ROW 1: January | $5,000
ROW 2: February | $7,500

Then create:
{"type":"trend","data":{"title":"Revenue Trend","data":[
  {"name":"January","value":5000},
  {"name":"February","value":7500}
]}}

═══════════════════════════════════════════════════════════════
WIDGET FORMATS (USE EXACT FORMAT):
═══════════════════════════════════════════════════════════════

TREND: {"type":"trend","data":{"title":"Title","data":[{"name":"Jan","value":1000},{"name":"Feb","value":2000}]}}
BAR: {"type":"bar","data":{"title":"Title","data":[{"name":"Q1","value":245000}]}}
LINE: {"type":"line","data":{"title":"Title","data":[{"name":"Jan","value":12000}]}}
PIE: {"type":"pie","data":{"title":"Title","data":[{"name":"A","value":4500}]}}
KPI: {"type":"kpi","data":{"title":"Revenue","value":"$2.4M","change":"+18.5%"}}
TABLE: {"type":"table","data":{"title":"Data","rows":[[{"value":"H1"}],[{"value":"D1"}]]}}

⚠️ ALL CHARTS MUST USE: {"name":"text","value":NUMBER}
- "value" must be NUMBER (not string, no $ or commas)
- Use "name" (NOT "date", "label", "month")
- Use "value" (NOT "amount", "count", "total")

Return: {"message":"text","actions":[{"type":"add","widgets":[...]}]}`;

      const parts: any[] = [{ text: promptText }];

      if (imageData) {
        const base64Image = imageData.split(',')[1];
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Image
          }
        });
      }

      const generateUrl = `https://generativelanguage.googleapis.com/v1/${availableModel.name}:generateContent?key=${apiKey}`;
      
      console.log('🤖 Calling Gemini API...');
      
      const response = await fetch(generateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Gemini API error:', error);
        return NextResponse.json({ 
          message: "I'm having trouble processing this. Please try again.",
          actions: []
        });
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log('📥 Raw AI response:', text.substring(0, 200) + '...');
      
      text = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        text = text.substring(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(text);
          
          console.log('✅ Parsed JSON:', JSON.stringify(parsed, null, 2));
          
          // AUTO-FIX: Convert any field to "name" and "value"
          if (parsed.actions) {
            parsed.actions.forEach((action: any) => {
              if (action.widgets) {
                action.widgets.forEach((widget: any) => {
                  if (['bar', 'line', 'pie', 'trend'].includes(widget.type) && widget.data?.data) {
                    const before = JSON.stringify(widget.data.data[0]);
                    widget.data.data = widget.data.data.map((item: any) => ({
                      name: item.name || item.date || item.label || item.month || item.category || item.x || '',
                      value: typeof item.value === 'number' ? item.value : 
                             typeof item.amount === 'number' ? item.amount :
                             typeof item.count === 'number' ? item.count :
                             typeof item.total === 'number' ? item.total :
                             typeof item.y === 'number' ? item.y : 0
                    }));
                    const after = JSON.stringify(widget.data.data[0]);
                    console.log(`✅ Fixed ${widget.type}: ${before} → ${after}`);
                  }
                });
              }
            });
          }
          
          return NextResponse.json(parsed);
        } catch (e) {
          console.error('❌ JSON Parse error:', e);
          console.error('Failed JSON:', text);
        }
      }

      return NextResponse.json({
        message: "Processing your request...",
        actions: []
      });

    } else if (isAnthropicKey) {
      console.log('🤖 Using Anthropic Claude API');
      
      const widgetDetails = dashboardContext.widgetTypes?.map((w: any) => {
        let desc = `${w.type}: "${w.title}" (${w.id})`;
        if (w.tableData) {
          desc += ` | ${w.tableData.rowCount} rows`;
          if (w.tableData.allRows) {
            desc += ` | Data: ${JSON.stringify(w.tableData.allRows.slice(0, 3))}`;
          }
        }
        if (w.chartData) desc += ` | Chart: ${JSON.stringify(w.chartData.slice(0, 3))}`;
        if (w.kpiData) desc += ` | ${w.kpiData.value} ${w.kpiData.change}`;
        return desc;
      }).join(', ') || 'No widgets';

      const systemPrompt = `You are a dashboard AI.

Dashboard: ${widgetDetails}

Charts use: {"name":"text","value":NUMBER}

Return: {"message":"text","actions":[{"type":"add","widgets":[...]}]}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: message }
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Claude API error');
      }

      const data = await response.json();
      const reply = data.content[0].text;

      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // AUTO-FIX
          if (parsed.actions) {
            parsed.actions.forEach((action: any) => {
              if (action.widgets) {
                action.widgets.forEach((widget: any) => {
                  if (['bar', 'line', 'pie', 'trend'].includes(widget.type) && widget.data?.data) {
                    widget.data.data = widget.data.data.map((item: any) => ({
                      name: item.name || item.date || item.label || item.month || '',
                      value: typeof item.value === 'number' ? item.value : 
                             typeof item.amount === 'number' ? item.amount : 0
                    }));
                  }
                });
              }
            });
          }
          
          return NextResponse.json(parsed);
        } catch (e) {
          console.error('Parse error:', e);
        }
      }

      return NextResponse.json({
        message: reply,
        actions: []
      });
    }

    return NextResponse.json({
      message: "Invalid API key format",
      actions: []
    });

  } catch (error: any) {
    console.error('❌ Fatal Error:', error);
    return NextResponse.json({ 
      message: `Error: ${error.message}`,
      actions: []
    });
  }
}