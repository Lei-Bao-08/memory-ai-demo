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
    
    // 检查音频格式兼容性
    const azureSupportedFormats = ['audio/wav', 'audio/pcm', 'audio/raw'];
    if (!azureSupportedFormats.includes(fileType)) {
      console.warn('⚠️ 不兼容的音频格式:', fileType);
      console.warn('⚠️ Azure Speech SDK 仅支持:', azureSupportedFormats.join(', '));
      
      return NextResponse.json({ 
        error: `当前音频格式 ${fileType} 不被支持。请使用Chrome浏览器并确保选择WAV格式录音，或者尝试更换浏览器。`,
        supportedFormats: azureSupportedFormats,
        currentFormat: fileType,
        suggestion: '建议使用Chrome或Edge浏览器，它们对WAV格式支持更好'
      }, { status: 400 });
    }
    
    let audioBuffer: Buffer;
    try {
      // 在 serverless 环境中，直接使用原始音频 buffer
      audioBuffer = await processAudioBuffer(buffer);
    } catch (err) {
      return NextResponse.json({ error: '音频处理失败' }, { status: 500 });
    }

    // 用音频 buffer 送给 Azure 进行语音识别，传入文件类型信息
    console.log('🎤 开始调用 Azure Speech 服务...');
    console.log('📊 音频数据大小:', audioBuffer.length, 'bytes');
    console.log('🎵 音频格式:', fileType);
    
    let text;
    try {
      text = await speechToTextFromRecording(audioBuffer, 'zh-CN', fileType);
      console.log('✅ Azure Speech 识别成功:', text);
    } catch (speechError) {
      console.error('❌ Azure Speech 识别失败:', speechError);
      console.error('❌ 错误类型:', typeof speechError);
      console.error('❌ 错误详情:', speechError instanceof Error ? speechError.message : speechError);
      
      // 返回更详细的错误信息
      const errorMessage = speechError instanceof Error ? speechError.message : String(speechError);
      return NextResponse.json({ 
        error: `语音识别服务错误: ${errorMessage}`,
        audioInfo: {
          size: audioBuffer.length,
          type: fileType,
          duration: Date.now() - startTime
        }
      }, { status: 500 });
    }
    
    if (!text || text.trim() === '') {
      console.warn('⚠️ 识别结果为空');
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