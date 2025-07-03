import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface AudioConversionOptions {
  inputFormat?: string;
  outputFormat?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
}

export class AudioConverter {
  private static tempDir = os.tmpdir();

  /**
   * 检查系统是否安装了ffmpeg
   */
  static async checkFFmpeg(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 将音频Buffer转换为WAV格式
   * 如果系统有ffmpeg，使用ffmpeg转换
   * 否则尝试直接处理（仅支持某些格式）
   */
  static async convertToWav(
    audioBuffer: Buffer, 
    originalFormat: string,
    options: AudioConversionOptions = {}
  ): Promise<Buffer> {
    const {
      sampleRate = 16000,
      channels = 1,
      bitDepth = 16
    } = options;

    console.log(`开始音频转换: ${originalFormat} -> WAV`);
    console.log(`目标格式: ${sampleRate}Hz, ${channels}声道, ${bitDepth}bit`);

    // 检查是否有ffmpeg
    const hasFFmpeg = await this.checkFFmpeg();
    
    if (hasFFmpeg) {
      return this.convertWithBasicFFmpeg(audioBuffer, originalFormat, options);
    } else {
      console.log('系统未安装ffmpeg，尝试直接处理...');
      return this.convertDirectly(audioBuffer, originalFormat, options);
    }
  }

  /**
   * 使用ffmpeg转换音频
   */
  private static async convertWithFFmpeg(
    audioBuffer: Buffer,
    originalFormat: string,
    options: AudioConversionOptions
  ): Promise<Buffer> {
    const {
      sampleRate = 16000,
      channels = 1,
      bitDepth = 16
    } = options;

    // 创建临时文件
    const inputFile = path.join(this.tempDir, `input_${Date.now()}.${this.getExtension(originalFormat)}`);
    const outputFile = path.join(this.tempDir, `output_${Date.now()}.wav`);

    try {
      // 写入输入文件
      fs.writeFileSync(inputFile, audioBuffer);

      // 构建ffmpeg命令 - 使用更兼容的参数
      const ffmpegCmd = `ffmpeg -i "${inputFile}" -ar ${sampleRate} -ac ${channels} -f wav -y "${outputFile}"`;
      
      console.log('执行ffmpeg命令:', ffmpegCmd);
      
      // 执行转换
      const { stdout, stderr } = await execAsync(ffmpegCmd);
      
      // 检查是否有错误
      if (stderr) {
        console.log('FFmpeg stderr:', stderr);
        // FFmpeg 通常会在 stderr 输出信息，但不一定是错误
        if (stderr.includes('Error') || stderr.includes('Invalid') || stderr.includes('failed')) {
          throw new Error(`FFmpeg转换失败: ${stderr}`);
        }
      }

      // 读取输出文件
      const wavBuffer = fs.readFileSync(outputFile);
      
      console.log(`音频转换成功，输出大小: ${wavBuffer.length} bytes`);
      
      return wavBuffer;

    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
  }

  /**
   * 使用简化的ffmpeg命令转换音频
   */
  private static async convertWithSimpleFFmpeg(
    audioBuffer: Buffer,
    originalFormat: string,
    options: AudioConversionOptions
  ): Promise<Buffer> {
    const {
      sampleRate = 16000,
      channels = 1
    } = options;

    // 创建临时文件
    const inputFile = path.join(this.tempDir, `input_${Date.now()}.${this.getExtension(originalFormat)}`);
    const outputFile = path.join(this.tempDir, `output_${Date.now()}.wav`);

    try {
      // 写入输入文件
      fs.writeFileSync(inputFile, audioBuffer);

      // 使用最简单的ffmpeg命令
      const ffmpegCmd = `ffmpeg -i "${inputFile}" -ar ${sampleRate} -ac ${channels} "${outputFile}"`;
      
      console.log('执行简化ffmpeg命令:', ffmpegCmd);
      
      // 执行转换
      await execAsync(ffmpegCmd);

      // 读取输出文件
      const wavBuffer = fs.readFileSync(outputFile);
      
      console.log(`音频转换成功，输出大小: ${wavBuffer.length} bytes`);
      
      return wavBuffer;

    } catch (error) {
      console.error('简化FFmpeg转换失败，尝试备用方法:', error);
      // 如果简化命令失败，尝试更基本的命令
      return this.convertWithBasicFFmpeg(audioBuffer, originalFormat, options);
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
  }

  /**
   * 使用最基本的ffmpeg命令转换音频
   */
  private static async convertWithBasicFFmpeg(
    audioBuffer: Buffer,
    originalFormat: string,
    options: AudioConversionOptions
  ): Promise<Buffer> {
    const inputFile = path.join(this.tempDir, `input_${Date.now()}.${this.getExtension(originalFormat)}`);
    const outputFile = path.join(this.tempDir, `output_${Date.now()}.wav`);

    try {
      // 写入输入文件
      fs.writeFileSync(inputFile, audioBuffer);

      // 使用最基本的ffmpeg命令，只指定输出格式
      const ffmpegCmd = `ffmpeg -i "${inputFile}" "${outputFile}"`;
      
      console.log('执行基本ffmpeg命令:', ffmpegCmd);
      
      // 执行转换
      await execAsync(ffmpegCmd);

      // 读取输出文件
      const wavBuffer = fs.readFileSync(outputFile);
      
      console.log(`音频转换成功，输出大小: ${wavBuffer.length} bytes`);
      
      return wavBuffer;

    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
  }

  /**
   * 直接处理音频（有限支持）
   */
  private static convertDirectly(
    audioBuffer: Buffer,
    originalFormat: string,
    options: AudioConversionOptions
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // 对于WAV格式，直接返回
      if (originalFormat === 'audio/wav' || originalFormat === 'wav') {
        console.log('音频已经是WAV格式，直接返回');
        resolve(audioBuffer);
        return;
      }

      // 对于MP3格式，尝试简单的处理
      if (originalFormat === 'audio/mp3' || originalFormat === 'audio/mpeg' || originalFormat === 'mp3') {
        console.log('检测到MP3格式，尝试直接处理...');
        // 这里可以添加简单的MP3处理逻辑
        // 但由于MP3解码复杂，建议安装FFmpeg
        reject(new Error(
          `无法直接处理MP3格式 ${originalFormat}。请安装FFmpeg以获得最佳支持。\n` +
          `安装FFmpeg: https://ffmpeg.org/download.html\n` +
          `或者使用WAV格式的音频文件。`
        ));
        return;
      }

      // 对于其他格式，提示需要ffmpeg
      reject(new Error(
        `无法转换音频格式 ${originalFormat}。请安装ffmpeg或使用WAV格式的音频文件。\n` +
        `安装ffmpeg: https://ffmpeg.org/download.html`
      ));
    });
  }

  /**
   * 获取文件扩展名
   */
  private static getExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/flac': 'flac'
    };
    
    return extensions[mimeType] || 'wav';
  }

  /**
   * 检查音频格式是否被Azure Speech SDK支持
   */
  static isSupportedByAzure(format: string): boolean {
    const supportedFormats = [
      'audio/wav',
      'audio/pcm',
      'audio/raw'
    ];
    
    return supportedFormats.includes(format);
  }

  /**
   * 获取Azure Speech SDK推荐的音频格式
   */
  static getAzureRecommendedFormat(): string {
    return 'audio/wav';
  }
} 