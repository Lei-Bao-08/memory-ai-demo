import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { AudioConverter } from '@/app/lib/utils/audioConverter';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('=== 语音服务调试信息 ===');
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // 检查Azure配置
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    
    debugInfo.azureConfig = {
      hasKey: !!speechKey,
      keyLength: speechKey ? speechKey.length : 0,
      hasRegion: !!speechRegion,
      region: speechRegion,
      isConfigured: !!(speechKey && speechRegion)
    };

    // 检查SDK导入
    debugInfo.sdkStatus = {
      sdkImported: !!sdk,
      hasAudioInputStream: !!sdk.AudioInputStream,
      hasSpeechConfig: !!sdk.SpeechConfig,
      hasAudioConfig: !!sdk.AudioConfig,
      hasSpeechRecognizer: !!sdk.SpeechRecognizer,
      hasResultReason: !!sdk.ResultReason,
      hasCancellationReason: !!sdk.CancellationReason
    };

    // 检查音频转换器
    try {
      const hasFFmpeg = await AudioConverter.checkFFmpeg();
      debugInfo.audioConverter = {
        hasFFmpeg,
        tempDir: require('os').tmpdir()
      };
    } catch (error) {
      debugInfo.audioConverter = {
        hasFFmpeg: false,
        error: (error as Error).message
      };
    }

    // 尝试创建语音配置（不实际调用API）
    if (speechKey && speechRegion) {
      try {
        const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        debugInfo.speechConfigTest = {
          success: true,
          speechRecognitionLanguage: speechConfig.speechRecognitionLanguage,
          speechSynthesisLanguage: speechConfig.speechSynthesisLanguage
        };
      } catch (error) {
        debugInfo.speechConfigTest = {
          success: false,
          error: (error as Error).message
        };
      }
    } else {
      debugInfo.speechConfigTest = {
        success: false,
        error: 'Azure配置不完整'
      };
    }

    // 检查Node.js环境
    debugInfo.nodeEnv = {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    console.log('调试信息:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json(debugInfo);

  } catch (error: any) {
    console.error('调试API错误:', error);
    return NextResponse.json({ 
      error: error?.message || '调试失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 