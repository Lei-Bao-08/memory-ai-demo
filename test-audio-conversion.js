const { AudioConverter } = require('./app/lib/utils/audioConverter');
const fs = require('fs');
const path = require('path');

async function testAudioConversion() {
  console.log('=== 音频转换测试 ===');
  
  try {
    // 检查FFmpeg
    const hasFFmpeg = await AudioConverter.checkFFmpeg();
    console.log('FFmpeg可用:', hasFFmpeg);
    
    // 创建一个简单的测试音频文件（这里只是示例）
    const testBuffer = Buffer.from('test audio data');
    
    // 测试转换
    console.log('开始测试音频转换...');
    
    const result = await AudioConverter.convertToWav(testBuffer, 'audio/mp3', {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
    });
    
    console.log('转换成功！结果大小:', result.length, 'bytes');
    
  } catch (error) {
    console.error('转换失败:', error.message);
  }
}

// 运行测试
testAudioConversion(); 