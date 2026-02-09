import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { audioData, mimeType } = body;

    if (!audioData) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    // Use Gemini 1.5 Pro for audio transcription
    const result = await generateText({
      model: google('gemini-1.5-pro'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: `data:${mimeType || 'audio/webm'};base64,${audioData}`,
              mimeType: mimeType || 'audio/webm',
            },
            {
              type: 'text',
              text: 'Transcreva o audio acima. Retorne APENAS o texto transcrito, sem comentarios adicionais.',
            },
          ],
        },
      ],
    });

    return NextResponse.json({
      transcription: result.text.trim(),
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: String(error) },
      { status: 500 }
    );
  }
}
