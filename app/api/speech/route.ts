import { NextRequest, NextResponse } from 'next/server';
import { speechToText } from '@/app/lib/azure/speech';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== 语音转文本API开始 ===');
    
    const formData = await req.formData();
    const file = formData.get('audio');
    
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未收到音频文件' }, { status: 400 });
    }

    console.log('文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 检查文件大小
    if (file.size === 0) {
      return NextResponse.json({ error: '音频文件为空' }, { status: 400 });
    }

    // 检查文件类型 - 支持多种MIME类型
    const allowedTypes = [
      'audio/webm', 
      'audio/wav', 
      'audio/mp3', 
      'audio/mpeg',  // MP3的另一种MIME类型
      'audio/m4a', 
      'audio/ogg',
      'audio/aac',
      'audio/flac'
    ];
    
    // 也支持通过文件扩展名判断
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.mp3') || 
                             fileName.endsWith('.wav') || 
                             fileName.endsWith('.webm') || 
                             fileName.endsWith('.m4a') || 
                             fileName.endsWith('.ogg') ||
                             fileName.endsWith('.aac') ||
                             fileName.endsWith('.flac');
    
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json({ 
        error: `不支持的音频格式: ${file.type}。支持的格式: ${allowedTypes.join(', ')} 或通过文件扩展名判断` 
      }, { status: 400 });
    }

    // 检查Azure配置
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    
    if (!speechKey || !speechRegion) {
      return NextResponse.json({ 
        error: 'Azure Speech服务未配置，请在.env.local中设置AZURE_SPEECH_KEY和AZURE_SPEECH_REGION' 
      }, { status: 500 });
    }

    console.log('Azure配置检查通过');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`音频数据转换完成，大小: ${buffer.length} bytes`);
    
    // 调用语音转文本
    const text = await speechToText(buffer, 'zh-CN', file.type);
    
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: '语音识别结果为空，请重试' }, { status: 400 });
    }
    
    const duration = Date.now() - startTime;
    console.log(`语音转文本成功，耗时: ${duration}ms，结果: ${text}`);
    
    return NextResponse.json({ 
      text,
      duration,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('语音转文本错误:', error);
    console.error('错误堆栈:', error?.stack);
    
    return NextResponse.json({ 
      error: error?.message || '语音识别失败',
      duration,
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      } : undefined
    }, { status: 500 });
  }
} 