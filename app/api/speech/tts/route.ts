import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/app/lib/azure/speech';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { text, language, voiceName } = await req.json();
  if (!text) {
    return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
  }
  try {
    const audioBuffer = await textToSpeech(text, language, voiceName);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="tts.wav"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '语音合成失败' }, { status: 500 });
  }
} 