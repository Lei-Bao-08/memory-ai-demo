import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { AudioConverter } from '@/app/lib/utils/audioConverter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const speechKey = process.env.AZURE_SPEECH_KEY || '';
  const speechRegion = process.env.AZURE_SPEECH_REGION || '';
  const defaultLang = 'zh-CN';

  if (!speechKey || !speechRegion) {
    return NextResponse.json({ 
      error: 'Azure Speech服务未配置' 
    }, { status: 500 });
  }

  try {
    console.log('=== 流式语音转文本API开始 ===');
    
    const formData = await req.formData();
    const file = formData.get('audio');
    
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未收到音频文件' }, { status: 400 });
    }

    console.log('音频文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 音频格式转换
    let processedBuffer = buffer;
    if (file.type && !AudioConverter.isSupportedByAzure(file.type)) {
      try {
        processedBuffer = await AudioConverter.convertToWav(buffer, file.type, {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16
        });
        console.log('音频转换完成');
      } catch (conversionError) {
        return NextResponse.json({ 
          error: `音频格式转换失败: ${(conversionError as Error).message}` 
        }, { status: 400 });
      }
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始事件
          controller.enqueue(encoder.encode('data: {"type":"start","message":"开始语音识别"}\n\n'));

          // 创建音频流
          const pushStream = sdk.AudioInputStream.createPushStream();
          pushStream.write(processedBuffer);
          pushStream.close();

          // 创建音频配置
          const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
          const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
          speechConfig.speechRecognitionLanguage = defaultLang;
          speechConfig.enableDictation();

          // 创建识别器
          const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
          
          let finalText = '';
          let recognitionCount = 0;

          // 实时识别回调 - 流式输出
          recognizer.recognizing = (s, e) => {
            const streamingData = {
              type: 'streaming',
              text: e.result.text,
              timestamp: Date.now()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamingData)}\n\n`));
          };

          // 识别完成回调 - 累积结果
          recognizer.recognized = (s, e) => {
            recognitionCount++;
            if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
              finalText += e.result.text + ' ';
              
              const recognizedData = {
                type: 'recognized',
                text: e.result.text,
                count: recognitionCount,
                accumulatedText: finalText.trim(),
                timestamp: Date.now()
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(recognizedData)}\n\n`));
            }
          };

          // 会话开始
          recognizer.sessionStarted = (s, e) => {
            const sessionData = {
              type: 'session_started',
              timestamp: Date.now()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sessionData)}\n\n`));
          };

          // 会话结束
          recognizer.sessionStopped = (s, e) => {
            const sessionData = {
              type: 'session_stopped',
              finalText: finalText.trim(),
              totalRecognitions: recognitionCount,
              timestamp: Date.now()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sessionData)}\n\n`));
            
            // 发送完成事件
            controller.enqueue(encoder.encode('data: {"type":"complete","finalText":"' + finalText.trim() + '"}\n\n'));
            controller.close();
          };

          // 错误处理
          recognizer.canceled = (s, e) => {
            const errorData = {
              type: 'error',
              reason: e.reason,
              errorDetails: e.errorDetails,
              timestamp: Date.now()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
            controller.close();
          };

          // 开始连续识别
          recognizer.startContinuousRecognitionAsync(
            () => {
              const startData = {
                type: 'recognition_started',
                timestamp: Date.now()
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(startData)}\n\n`));
            },
            (err) => {
              const errorData = {
                type: 'error',
                message: '开始识别失败',
                error: err,
                timestamp: Date.now()
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
              controller.close();
            }
          );

        } catch (error) {
          const errorData = {
            type: 'error',
            message: '流式识别初始化失败',
            error: error,
            timestamp: Date.now()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error: any) {
    console.error('流式语音转文本错误:', error);
    return NextResponse.json({ 
      error: error?.message || '流式语音识别失败',
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      } : undefined
    }, { status: 500 });
  }
} 