const fs = require('fs');
const FormData = require('form-data');

// 测试SDK API
async function testSDK() {
  console.log('🔍 测试SDK导入...');
  try {
    const response = await fetch('http://localhost:3000/api/test-sdk');
    const data = await response.json();
    console.log('SDK测试结果:', data);
    return data.success;
  } catch (error) {
    console.error('SDK测试失败:', error);
    return false;
  }
}

// 测试TTS API
async function testTTS() {
  console.log('🔊 测试文本转语音...');
  try {
    const response = await fetch('http://localhost:3000/api/speech/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '你好，这是一个测试。' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const blob = await response.blob();
    console.log('TTS测试成功，音频大小:', blob.size, 'bytes');
    return true;
  } catch (error) {
    console.error('TTS测试失败:', error.message);
    return false;
  }
}

// 测试STT API（需要音频文件）
async function testSTT(audioFilePath) {
  console.log('🎤 测试语音转文本...');
  
  if (!fs.existsSync(audioFilePath)) {
    console.log('⚠️  音频文件不存在，跳过STT测试');
    return false;
  }
  
  try {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(audioFilePath));
    
    const response = await fetch('http://localhost:3000/api/speech', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const data = await response.json();
    console.log('STT测试成功:', data);
    return true;
  } catch (error) {
    console.error('STT测试失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  const results = {
    sdk: await testSDK(),
    tts: await testTTS(),
    stt: false // 需要音频文件
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('SDK导入:', results.sdk ? '✅ 通过' : '❌ 失败');
  console.log('TTS功能:', results.tts ? '✅ 通过' : '❌ 失败');
  console.log('STT功能:', results.stt ? '✅ 通过' : '⚠️  跳过');
  
  if (results.sdk && results.tts) {
    console.log('\n🎉 核心功能测试通过！');
  } else {
    console.log('\n❌ 部分功能测试失败，请检查配置和日志');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testSDK, testTTS, testSTT, runTests }; 