import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('✅ API Route called!');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ Missing GEMINI_API_KEY');
      return NextResponse.json({ error: 'API key not configured. Please add GEMINI_API_KEY to your .env file.' }, { status: 500 });
    }

    // Hardcode model instead of listing at runtime (saves a request + avoids quota issues)
    const availableModel = { name: 'models/gemini-2.5-flash' };

    if (false) {
      console.error('❌ No compatible models found');
      return NextResponse.json({ error: 'No AI models available. Please contact support.' }, { status: 500 });
    }

    console.log('✅ Using model:', availableModel.name);

    // Parse request
    const { messages, image } = await request.json();
    let userRequest = messages?.[0] || "Create a KPI card showing revenue of $100K";

    console.log('💬 USER REQUEST:', userRequest);

    // UPDATED PROMPT WITH ADVANCED FEATURES
    let promptText = `STRICT INSTRUCTIONS - YOU ARE AN EXPERT DASHBOARD GENERATOR:

You MUST extract EXACT numbers and values from the user's request.
DO NOT use example data. DO NOT use placeholder data.
If user says "$250K" → value must be "250", unit: "K"
If user says "up 15%" → trend: "up", trendValue: "15"
If user mentions "table", "data", "rows", "columns" → ask them to specify what chart type they want

HANDLE THESE COMMON REQUESTS:
• "Create a KPI showing [metric] [value]" → KPI widget
• "Chart comparing [items]" → BAR chart with items as data points
• "Trend of [metric] over [period]" → TREND chart with time-based data
• "Show distribution of [categories]" → PIE chart
• "Line chart of [data]" → LINE chart with points
• "Table of [data]" → TABLE widget
• "Create charts from my table data" → Ask user to specify: "Create a bar chart from my sales table showing Q1-Q4"

AVAILABLE WIDGET TYPES:

1. KPI Card (single metrics):
{"type":"kpi","data":{"title":"Revenue","value":"250","unit":"K","trend":"up","trendValue":"15"}}

2. Bar Chart (comparing items, categories, quarters):
{"type":"bar","data":{"title":"Sales by Region","data":[{"name":"North","value":400},{"name":"South","value":300},{"name":"East","value":600},{"name":"West","value":500}],"colors":["#8b5cf6","#a855f7","#9333ea","#7c3aed"]}}

3. Line Chart (individual points, detail view):
{"type":"line","data":{"title":"Monthly Revenue","data":[{"name":"Jan","value":400},{"name":"Feb","value":500},{"name":"Mar","value":600},{"name":"Apr","value":700}],"colors":["#3b82f6"]}}

4. Trend Chart (smooth area, growth visualization):
{"type":"trend","data":{"title":"Growth Trend","data":[{"name":"Week 1","value":400},{"name":"Week 2","value":600},{"name":"Week 3","value":800},{"name":"Week 4","value":950}],"colors":["#f59e0b"]}}

5. Pie Chart (proportions, percentages, market share):
{"type":"pie","data":{"title":"Market Share","data":[{"name":"Product A","value":40},{"name":"Product B","value":30},{"name":"Product C","value":20},{"name":"Product D","value":10}],"colors":["#8b5cf6","#3b82f6","#10b981","#f59e0b"]}}

6. Table (structured data with rows and columns):
{"type":"table","data":{"title":"Q1 Sales Data","rows":[[{"value":"Product"},{"value":"Revenue"},{"value":"Growth"}],[{"value":"Widget A"},{"value":"$120K"},{"value":"+15%"}],[{"value":"Widget B"},{"value":"$95K"},{"value":"+10%"}]]}}

7. Text Box (titles, descriptions, labels):
{"type":"text","data":{"content":"<div style='color: white; font-size: 20px; font-weight: bold; line-height: 1.5'>Your Dashboard Title Here</div>"}}

CRITICAL RULES:
- ALWAYS use exact numbers from user request
- Create 3-5+ data points for charts (don't just create 1-2)
- For time-based data (monthly, quarterly): use TREND chart
- For comparing different items/categories: use BAR chart
- For showing a single metric: use KPI
- For distribution/percentages: use PIE chart
- For detailed point-by-point data: use LINE chart
- Match colors to widget type (purple for bars, blue for lines, orange for trends)
- If user mentions table data, ask them to be specific about which chart type they want
- Return ONLY valid JSON array, nothing else

USER REQUEST: "${userRequest}"

Analyze and respond with appropriate widget(s) as JSON array ONLY:`;

    const parts: any[] = [{ text: promptText }];

    if (image?.data) {
      console.log('📷 Processing image...');
      parts.push({
        inlineData: {
          mimeType: image.mediaType,
          data: image.data
        }
      });
      parts.push({ 
        text: `Extract ALL data you see in this image. Every number, every label, every value. Convert to widgets using the EXACT values shown.` 
      });
    }

    // Call API
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${availableModel.name}:generateContent?key=${apiKey}`;
    
    console.log('📡 Calling Gemini API...');
    
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 50000,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Gemini API error:', error);
      return NextResponse.json({ 
        error: 'AI service returned an error. Please try again or simplify your request.',
        details: error.substring(0, 200)
      }, { status: 500 });
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('❌ No candidates in response');
      return NextResponse.json({ 
        error: 'AI service returned empty response. Try a different request or simplify your question.',
      }, { status: 500 });
    }
    
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!text) {
      console.error('❌ Empty text in response');
      return NextResponse.json({ 
        error: 'AI service returned no content. Try rephrasing your request or simplify it.',
      }, { status: 500 });
    }
    
    console.log('🤖 RAW AI RESPONSE:');
    console.log(text.substring(0, 500));
    console.log('--- END SNIPPET ---');
    
    // Clean response
    text = text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    
    if (arrayStart === -1 || arrayEnd === -1) {
      console.error('❌ No JSON array found in response');
      return NextResponse.json({ 
        error: 'AI response format invalid. Try a more specific request like: "Create a bar chart with Q1: 100, Q2: 150, Q3: 200"',
        rawResponse: text.substring(0, 200)
      }, { status: 500 });
    }
    
    text = text.substring(arrayStart, arrayEnd + 1);
    
    console.log('🧹 CLEANED RESPONSE:');
    console.log(text);
    
    // Validate
    try {
      const widgets = JSON.parse(text);
      console.log('✅ PARSED', widgets.length, 'WIDGETS');
      
      if (!Array.isArray(widgets) || widgets.length === 0) {
        throw new Error('No widgets in array');
      }
      
      // Validate widget structure
      for (const widget of widgets) {
        if (!widget.type || !widget.data) {
          throw new Error('Invalid widget structure');
        }
      }
      
      console.log('✅ All widgets valid');
      
    } catch (e: any) {
      console.error('❌ PARSE ERROR:', e.message);
      console.error('❌ Failed text:', text.substring(0, 200));
      
      return NextResponse.json({ 
        error: `Failed to parse AI response: ${e.message}. Try: "Create a KPI card showing revenue $100K"`,
        rawResponse: text.substring(0, 200)
      }, { status: 500 });
    }
    
    return NextResponse.json({ content: [{ text }] });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: `Unexpected error: ${error.message}. Please try again.`
    }, { status: 500 });
  }
}