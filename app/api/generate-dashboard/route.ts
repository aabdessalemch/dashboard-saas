import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('✅ API Route called!');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 });
    }

    // List models
    const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
      return NextResponse.json({ error: 'Failed to list models' }, { status: 500 });
    }

    const modelsList = await listResponse.json();
    const availableModel = modelsList.models?.find((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent')
    );

    if (!availableModel) {
      return NextResponse.json({ error: 'No models available' }, { status: 500 });
    }

    // Parse request
    const { messages, image } = await request.json();
    let userRequest = messages?.[0] || "Create a KPI card showing revenue of $100K";

    console.log('💬 USER REQUEST:', userRequest);

    // UPDATED PROMPT WITH CHART SUPPORT
    let promptText = `STRICT INSTRUCTIONS - READ CAREFULLY:

You MUST extract the EXACT numbers and values from the user's request below.
DO NOT use example data. DO NOT use placeholder data.
If user says "$250K" you MUST use "250" as the value.
If user says "up 15%" you MUST use "15" as trendValue and "up" as trend.

Return ONLY a valid JSON array. NO other text. NO markdown. NO backticks.

AVAILABLE WIDGET TYPES:

1. KPI Card (for single metrics like revenue, users, costs):
{"type":"kpi","data":{"title":"Revenue","value":"250","unit":"K","trend":"up","trendValue":"15"}}

2. Bar Chart (for comparing multiple items):
{"type":"bar","data":{"title":"Sales by Product","data":[{"name":"Product A","value":400},{"name":"Product B","value":300},{"name":"Product C","value":600}],"colors":["#8b5cf6","#a855f7","#9333ea"]}}

3. Line Chart (for trends over time with points):
{"type":"line","data":{"title":"Revenue Trend","data":[{"name":"Jan","value":400},{"name":"Feb","value":300},{"name":"Mar","value":600}],"colors":["#3b82f6"]}}

4. Trend Chart / Area Chart (for smooth trends with filled area):
{"type":"trend","data":{"title":"Growth Trend","data":[{"name":"Week 1","value":400},{"name":"Week 2","value":600},{"name":"Week 3","value":800}],"colors":["#f59e0b"]}}

5. Pie Chart (for proportions/percentages):
{"type":"pie","data":{"title":"Market Share","data":[{"name":"Category A","value":400},{"name":"Category B","value":300},{"name":"Category C","value":300}],"colors":["#8b5cf6","#3b82f6","#10b981"]}}

6. Table (for tabular data):
{"type":"table","data":{"title":"Sales Data","rows":[[{"value":"Product"},{"value":"Q1"}],[{"value":"Widget A"},{"value":"120"}]]}}

7. Text Box (for titles/labels):
{"type":"text","data":{"content":"<span style='color: white; font-size: 18px; font-weight: bold'>Dashboard Title</span>"}}

RULES FOR CHOOSING WIDGET TYPE:
- If user says "KPI" or "card" or mentions a SINGLE metric → use KPI
- If user says "bar chart" or "compare" or "comparison" → use BAR chart
- If user says "line chart" or wants to see individual points → use LINE chart
- If user says "trend chart" or "area chart" or "smooth trend" → use TREND chart
- If user says "pie chart" or "distribution" or "percentage" → use PIE chart
- If user says "table" or has rows/columns data → use TABLE
- Extract ALL exact numbers from user's request
- For charts, create at least 3-5 data points unless user specifies otherwise
- Use appropriate colors: purple for bars, blue for lines, orange for trends, varied for pie

USER REQUEST: "${userRequest}"

Analyze the request above and return the appropriate widget(s) as a JSON array:`;

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
    const generateUrl = `https://generativelanguage.googleapis.com/v1/${availableModel.name}:generateContent?key=${apiKey}`;
    
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 50000,  // ✅ INCREASED FROM 2048!
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'API failed', details: error }, { status: 500 });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log('🤖 RAW AI RESPONSE:');
    console.log(text);
    console.log('--- END RESPONSE ---');
    
    // Clean response
    text = text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    
    if (arrayStart !== -1 && arrayEnd !== -1) {
      text = text.substring(arrayStart, arrayEnd + 1);
    }
    
    console.log('🧹 CLEANED RESPONSE:');
    console.log(text);
    
    // Validate
    try {
      const widgets = JSON.parse(text);
      console.log('✅ PARSED WIDGETS:', JSON.stringify(widgets, null, 2));
      
      const hasUserData = JSON.stringify(widgets).includes(
        userRequest.match(/\d+/)?.[0] || "unlikely_match"
      );
      
      if (!hasUserData && !image) {
        console.warn('⚠️ WARNING: Response might not contain user data!');
      }
      
    } catch (e) {
      console.error('❌ PARSE ERROR:', e);
      console.error('❌ Response may be incomplete - try a simpler request');
      
      // Return error to frontend with helpful message
      return NextResponse.json({ 
        error: 'AI response was incomplete or invalid. Try: fewer data points, simpler request, or use "Edit Data" after creation.',
        rawResponse: text.substring(0, 200) + '...'
      }, { status: 500 });
    }
    
    return NextResponse.json({ content: [{ text }] });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}