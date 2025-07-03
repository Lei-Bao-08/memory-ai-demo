const fs = require('fs');
const path = require('path');

// 模拟一个简单的WebM音频文件（实际测试时需要真实的录音文件）
console.log('=== 录音功能测试 ===');

// 检查环境变量
const speechKey = process.env.AZURE_SPEECH_KEY;
const speechRegion = process.env.AZURE_SPEECH_REGION;

console.log('Azure配置检查:');
console.log('- 密钥:', speechKey ? `${speechKey.substring(0, 8)}...` : '未设置');
console.log('- 区域:', speechRegion || '未设置');

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
    'CancellationReason',
    'PropertyId'
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
    
    // 测试录音相关配置
    speechConfig.enableDictation();
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_RecoMode, "INTERACTIVE");
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "1000");
    
    console.log('✅ 录音配置设置成功');
    
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
    console.log('建议安装FFmpeg以支持音频格式转换');
  } else {
    console.log('✅ FFmpeg可用');
    const version = stdout.split('\n')[0];
    console.log('版本:', version);
  }
  
  console.log('\n=== 录音功能测试建议 ===');
  console.log('1. 确保浏览器支持MediaRecorder API');
  console.log('2. 确保麦克风权限已授予');
  console.log('3. 录音格式应为WebM (Opus编码)');
  console.log('4. 录音时长建议在3-30秒之间');
  console.log('5. 说话清晰，避免背景噪音');
  console.log('\n=== 测试步骤 ===');
  console.log('1. 访问 /test 页面');
  console.log('2. 点击"开始录音"按钮');
  console.log('3. 说话3-10秒');
  console.log('4. 点击"停止录音"按钮');
  console.log('5. 点击"测试录音STT"按钮');
  console.log('6. 查看识别结果和日志');
  
  console.log('\n=== 故障排除 ===');
  console.log('如果录音识别失败：');
  console.log('- 检查浏览器控制台错误信息');
  console.log('- 检查服务器日志');
  console.log('- 确认Azure密钥和区域正确');
  console.log('- 尝试使用不同的浏览器');
  console.log('- 检查网络连接');
}); 