const fs = require('fs');
const path = require('path');

// 检查环境变量
console.log('=== 检查环境变量 ===');
const speechKey = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;

console.log('AZURE_SPEECH_KEY:', speechKey ? `${speechKey.substring(0, 8)}...` : '未设置');
console.log('AZURE_SPEECH_REGION:', speechRegion || '未设置');

if (!speechKey || !speechRegion) {
  console.error('❌ Azure配置不完整！');
  console.log('请在.env.local文件中设置：');
  console.log('AZURE_SPEECH_KEY=your_speech_key');
  console.log('AZURE_SPEECH_REGION=your_region');
  process.exit(1);
}

// 检查SDK
console.log('\n=== 检查Azure Speech SDK ===');
try {
  const sdk = require('microsoft-cognitiveservices-speech-sdk');
  console.log('✅ SDK导入成功');
  
  // 检查关键组件
  const components = [
    'AudioInputStream',
    'SpeechConfig', 
    'AudioConfig',
    'SpeechRecognizer',
    'ResultReason',
    'CancellationReason'
  ];
  
  components.forEach(component => {
    if (sdk[component]) {
      console.log(`✅ ${component} 可用`);
    } else {
      console.log(`❌ ${component} 不可用`);
    }
  });
  
  // 尝试创建语音配置
  console.log('\n=== 测试语音配置 ===');
  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    console.log('✅ 语音配置创建成功');
    console.log('识别语言:', speechConfig.speechRecognitionLanguage);
    console.log('合成语言:', speechConfig.speechSynthesisLanguage);
  } catch (error) {
    console.error('❌ 语音配置创建失败:', error.message);
  }
  
} catch (error) {
  console.error('❌ SDK导入失败:', error.message);
  console.log('请运行: npm install microsoft-cognitiveservices-speech-sdk');
  process.exit(1);
}

// 检查FFmpeg
console.log('\n=== 检查FFmpeg ===');
const { exec } = require('child_process');
exec('ffmpeg -version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ FFmpeg不可用:', error.message);
    console.log('建议安装FFmpeg以支持更多音频格式');
  } else {
    console.log('✅ FFmpeg可用');
    const version = stdout.split('\n')[0];
    console.log('版本:', version);
  }
  
  console.log('\n=== 检查完成 ===');
  console.log('如果所有检查都通过，语音服务应该可以正常工作');
  console.log('如果遇到问题，请访问 /status 页面查看详细状态');
});

// 检查Node.js版本
console.log('\n=== 检查Node.js环境 ===');
console.log('Node.js版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('内存使用:', process.memoryUsage()); 