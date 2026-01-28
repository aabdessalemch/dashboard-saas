import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('💬 Chat API called!');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found');
      return NextResponse.json({ 
        message: 'API key not configured. Please check your .env file.',
        actions: []
      });
    }

    const { message, conversationHistory, dashboardContext } = await request.json();
    
    console.log('💬 User message:', message);
    console.log('📊 Dashboard context:', dashboardContext);

    const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
      console.error('Failed to list models');
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
      console.error('No models available');
      return NextResponse.json({ 
        message: 'AI model not available.',
        actions: []
      });
    }

    const widgetSummary = dashboardContext.widgetTypes
      .map((w: any, idx: number) => `${idx + 1}. ${w.type} - "${w.title}" (ID: ${w.id})`)
      .join('\n');

    let promptText = `You are a dashboard assistant helping users modify widgets.

CURRENT DASHBOARD (${dashboardContext.widgetCount} widgets):
${widgetSummary || 'Empty dashboard'}

USER REQUEST: "${message}"

YOUR TASK: Respond with ONLY valid JSON in this exact format:

{
  "message": "your friendly response here",
  "actions": [array of actions or empty array]
}

ACTION TYPES:

1. ADD new widgets:
{
  "type": "add",
  "widgets": [
    {"type":"kpi","data":{"title":"Revenue","value":"500","unit":"K","trend":"up","trendValue":"10"}}
  ]
}

2. MODIFY widget (find by searching dashboard):
{
  "type": "modify",
  "widgetId": "SEARCH_FOR_KPI",
  "data": {"value": "800"}
}

3. DELETE widget:
{
  "type": "delete",
  "widgetType": "pie"
}

WIDGET TYPES: kpi, bar, line, trend, pie, table, text

EXAMPLES:

Request: "Add a KPI showing revenue of $500K"
Response:
{
  "message": "I'll add a revenue KPI showing $500K!",
  "actions": [{
    "type": "add",
    "widgets": [{"type":"kpi","data":{"title":"Revenue","value":"500","unit":"K","trend":"up","trendValue":"0"}}]
  }]
}

Request: "Delete the pie chart"
Response:
{
  "message": "I'll remove the pie chart.",
  "actions": [{"type":"delete","widgetType":"pie"}]
}

Request: "What widgets do I have?"
Response:
{
  "message": "You have ${dashboardContext.widgetCount} widgets: ${dashboardContext.widgetTypes.map((w: any) => w.title).join(', ')}",
  "actions": []
}

CRITICAL:
- Return ONLY valid JSON
- No markdown, no code blocks, no extra text
- Always include both "message" and "actions" fields
- Keep messages friendly and conversational

Now respond to: "${message}"`;

    const parts: any[] = [{ text: promptText }];

    if (conversationHistory && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-3);
      const historyText = recent
        .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      parts.push({ text: `\nRECENT CONVERSATION:\n${historyText}` });
    }

    const generateUrl = `https://generativelanguage.googleapis.com/v1/${availableModel.name}:generateContent?key=${apiKey}`;
    
    console.log('🤖 Calling Gemini...');
    
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json({ 
        message: "I'm having trouble connecting to the AI. Please try again.",
        actions: []
      });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log('🤖 RAW AI RESPONSE:', text);
    
    // Clean response
    text = text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find JSON object
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('No JSON found in response');
      return NextResponse.json({
        message: "I understood your request! Try: 'Add a KPI card' or 'Delete the table'",
        actions: []
      });
    }
    
    text = text.substring(jsonStart, jsonEnd + 1);
    
    console.log('🧹 CLEANED RESPONSE:', text);
    
    try {
      const parsed = JSON.parse(text);
      console.log('✅ PARSED RESPONSE:', parsed);
      
      // Validate structure
      if (!parsed.message || !Array.isArray(parsed.actions)) {
        console.error('Invalid response structure:', parsed);
        return NextResponse.json({
          message: "Got it! What would you like to change?",
          actions: []
        });
      }

      // Process actions to find widget IDs
      if (parsed.actions && parsed.actions.length > 0) {
        parsed.actions = parsed.actions.map((action: any) => {
          if (action.widgetId && typeof action.widgetId === 'string' && action.widgetId.includes('SEARCH')) {
            // Find widget by type
            const searchTerm = action.widgetId.toLowerCase().replace('search_for_', '');
            const widget = dashboardContext.widgetTypes.find((w: any) => 
              w.type.toLowerCase() === searchTerm || 
              w.title.toLowerCase().includes(searchTerm)
            );
            if (widget) {
              action.widgetId = widget.id;
              console.log(`✅ Mapped ${searchTerm} to widget ID: ${widget.id}`);
            }
          }
          return action;
        });
      }
      
      return NextResponse.json(parsed);
      
    } catch (e) {
      console.error('❌ PARSE ERROR:', e);
      console.error('Failed to parse:', text.substring(0, 200));
      
      return NextResponse.json({
        message: "I'm thinking... Try asking: 'Add a revenue KPI' or 'Show me what widgets I have'",
        actions: []
      });
    }

  } catch (error: any) {
    console.error('❌ Fatal Error:', error);
    return NextResponse.json({ 
      message: "Something went wrong. Please try again.",
      actions: []
    });
  }
}