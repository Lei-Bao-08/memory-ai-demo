import { NextRequest, NextResponse } from 'next/server';
import { speechToTextFromRecording } from '@/app/lib/azure/speech';

export const runtime = 'nodejs';

function getTimeString() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}-${mi}-${ss}`;
}

// 在 serverless 环境中，我们不能写入文件系统，所以简化为直接处理音频 buffer
async function processAudioBuffer(inputBuffer: Buffer): Promise<Buffer> {
  // 对于 serverless 环境，我们假设输入的音频已经是合适的格式
  // 如果需要转换，可以使用基于内存的音频处理库
  // 这里简化处理，直接返回原始 buffer
  return inputBuffer;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get('audio');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未收到录音文件' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: '录音文件为空' }, { status: 400 });
    }
    const allowedTypes = [
      'audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/ogg', 'audio/aac', 'audio/flac'
    ];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.webm') || fileName.endsWith('.wav') || fileName.endsWith('.mp3') || fileName.endsWith('.m4a') || fileName.endsWith('.ogg') || fileName.endsWith('.aac') || fileName.endsWith('.flac');
    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json({ error: `不支持的录音格式: ${file.type}` }, { status: 400 });
    }

    // 直接处理音频 buffer，不保存到文件系统
    const timeStr = getTimeString();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 获取文件类型信息
    const fileType = file.type || 'audio/webm';
    console.log('录音文件类型:', fileType, '文件名:', file.name);
    
    let audioBuffer: Buffer;
    try {
      // 在 serverless 环境中，直接使用原始音频 buffer
      audioBuffer = await processAudioBuffer(buffer);
    } catch (err) {
      return NextResponse.json({ error: '音频处理失败' }, { status: 500 });
    }

    // 用音频 buffer 送给 Azure 进行语音识别，传入文件类型信息
    const text = await speechToTextFromRecording(audioBuffer, 'zh-CN', fileType);
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: '录音识别结果为空，请重试' }, { status: 400 });
    }

    const duration = Date.now() - startTime;
    
    // 在 serverless 环境中，我们不保存文件，所以不返回 audioUrl
    return NextResponse.json({
      text,
      duration,
      fileInfo: {
        name: `recording_${timeStr}.wav`,
        size: audioBuffer.length,
        type: 'audio/wav'
      }
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json({
      error: error?.message || '录音语音识别失败',
      duration,
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      } : undefined
    }, { status: 500 });
  }
}