import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // 测试SDK导入
    const sdk = await import('microsoft-cognitiveservices-speech-sdk');
    
    // 检查关键对象是否存在
    const hasAudioInputStream = !!sdk.AudioInputStream;
    const hasSpeechConfig = !!sdk.SpeechConfig;
    const hasAudioConfig = !!sdk.AudioConfig;
    const hasSpeechRecognizer = !!sdk.SpeechRecognizer;
    
    // 检查环境变量
    const hasKey = !!process.env.AZURE_SPEECH_KEY;
    const hasRegion = !!process.env.AZURE_SPEECH_REGION;
    
    return NextResponse.json({
      success: true,
      sdk: {
        AudioInputStream: hasAudioInputStream,
        SpeechConfig: hasSpeechConfig,
        AudioConfig: hasAudioConfig,
        SpeechRecognizer: hasSpeechRecognizer,
      },
      config: {
        hasKey,
        hasRegion,
        keyLength: hasKey ? process.env.AZURE_SPEECH_KEY?.length : 0,
        region: process.env.AZURE_SPEECH_REGION || '未配置'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 