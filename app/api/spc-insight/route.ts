import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('❌ SPC Insight: No API key found');
      return NextResponse.json({ insight: '' });
    }

    const { prompt } = await request.json();
    if (!prompt) {
      console.error('❌ SPC Insight: No prompt provided');
      return NextResponse.json({ insight: '' });
    }

    const isGeminiKey = apiKey.startsWith('AIza');
    const isAnthropicKey = apiKey.startsWith('sk-ant-');

    if (isGeminiKey) {
      // Use gemini-2.0-flash directly instead of listing models
      const modelName = 'models/gemini-2.0-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('❌ SPC Insight: Gemini API error', res.status, errText);
        return NextResponse.json({ insight: '' });
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ SPC Insight generated:', text.substring(0, 80) + '...');
      return NextResponse.json({ insight: text.trim() });

    } else if (isAnthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) return NextResponse.json({ insight: '' });

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      return NextResponse.json({ insight: text.trim() });
    }

    return NextResponse.json({ insight: '' });
  } catch {
    return NextResponse.json({ insight: '' });
  }
}
