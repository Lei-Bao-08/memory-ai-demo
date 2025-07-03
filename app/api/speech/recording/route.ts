import { NextRequest, NextResponse } from 'next/server';
import { speechToTextFromRecording } from '@/app/lib/azure/speech';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTimeString() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}-${mi}-${ss}`;
}

async function convertToWav(inputBuffer: Buffer, inputExt: string, outputPath: string): Promise<Buffer> {
  // 将 buffer 写入临时文件
  const tmpInput = outputPath.replace('.wav', `_tmp.${inputExt}`);
  await fs.writeFile(tmpInput, inputBuffer);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y', // 覆盖输出
      '-i', tmpInput,
      '-ar', '16000', // 采样率16k
      '-ac', '1',     // 单声道
      outputPath
    ]);
    ffmpeg.on('close', async (code) => {
      await fs.unlink(tmpInput).catch(() => {}); // 删除临时文件
      if (code === 0) {
        const wavBuffer = await fs.readFile(outputPath);
        resolve(wavBuffer);
      } else {
        reject(new Error('ffmpeg 转换失败'));
      }
    });
    ffmpeg.on('error', (err) => {
      fs.unlink(tmpInput).catch(() => {});
      reject(err);
    });
  });
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
    // 生成保存路径
    const dateStr = getDateString();
    const timeStr = getTimeString();
    const audioDir = path.join(process.cwd(), 'public', 'audio', dateStr);
    if (!existsSync(audioDir)) {
      await fs.mkdir(audioDir, { recursive: true });
    }
    const ext = fileName.split('.').pop() || 'webm';
    const wavFileName = `${dateStr}_${timeStr}.wav`;
    const wavFilePath = path.join(audioDir, wavFileName);
    // 转换为wav
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let wavBuffer: Buffer;
    try {
      wavBuffer = await convertToWav(buffer, ext, wavFilePath);
    } catch (err) {
      return NextResponse.json({ error: '音频格式转换失败，ffmpeg未安装或文件损坏' }, { status: 500 });
    }
    // 用wav buffer送给Azure
    const text = await speechToTextFromRecording(wavBuffer);
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: '录音识别结果为空，请重试' }, { status: 400 });
    }
    const duration = Date.now() - startTime;
    // 返回音频URL
    const audioUrl = `/audio/${dateStr}/${wavFileName}`;
    return NextResponse.json({
      text,
      duration,
      audioUrl,
      fileInfo: {
        name: wavFileName,
        size: wavBuffer.length,
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