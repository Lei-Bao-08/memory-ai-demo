import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { AudioConverter } from '../utils/audioConverter';

const speechKey = process.env.AZURE_SPEECH_KEY || '';
const speechRegion = process.env.AZURE_SPEECH_REGION || '';
const defaultLang = 'zh-CN';

console.log('🔧 Azure Speech 配置检查:');
console.log('🔑 Speech Key 长度:', speechKey.length);
console.log('🌍 Speech Region:', speechRegion);

if (!speechKey || !speechRegion) {
  console.error('❌ 请在.env.local中配置AZURE_SPEECH_KEY和AZURE_SPEECH_REGION');
} else {
  console.log('✅ Azure Speech 配置已加载');
}

export async function speechToText(buffer: Buffer, language: string = defaultLang, originalFormat?: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout;
    
    try {
      console.log('=== 开始语音转文本处理 ===');
      console.log(`时间: ${new Date().toISOString()}`);
      console.log('音频数据大小:', buffer.length, 'bytes');
      console.log('语言设置:', language);
      console.log('原始格式:', originalFormat);
      console.log('Azure配置 - Key长度:', speechKey.length, 'Region:', speechRegion);

      // 检查SDK是否正确导入
      if (!sdk.AudioInputStream || !sdk.SpeechConfig || !sdk.AudioConfig || !sdk.SpeechRecognizer) {
        throw new Error('Azure Speech SDK 导入失败，关键组件缺失');
      }

      console.log('✅ SDK检查通过');

      // 音频格式转换
      let processedBuffer = buffer;
      if (originalFormat && !AudioConverter.isSupportedByAzure(originalFormat)) {
        console.log('🔄 检测到不支持的音频格式，尝试直接使用原始数据...');
        // 在 serverless 环境中，我们无法进行音频转换
        // 直接尝试使用原始音频数据，让 Azure SDK 自己处理
        console.log('⚠️ 在无服务器环境中跳过音频转换，直接使用原始数据');
        processedBuffer = buffer;
      } else {
        console.log('✅ 音频格式无需转换');
      }

      // 创建音频流
      console.log('🔄 创建音频流...');
      const pushStream = sdk.AudioInputStream.createPushStream();
      if (!pushStream) {
        throw new Error('无法创建音频输入流');
      }

      // 写入音频数据
      pushStream.write(processedBuffer);
      pushStream.close();
      console.log('✅ 音频数据写入完成');

      // 创建音频配置
      console.log('🔄 创建音频配置...');
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      if (!audioConfig) {
        throw new Error('无法创建音频配置');
      }
      console.log('✅ 音频配置创建成功');

      // 创建语音配置
      console.log('🔄 创建语音配置...');
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      if (!speechConfig) {
        throw new Error('无法创建语音配置，请检查Azure密钥和区域设置');
      }

      speechConfig.speechRecognitionLanguage = language;
      // 启用听写模式，提高识别效果
      speechConfig.enableDictation();
      // 设置识别模式为连续对话模式，适合各种长度的语音
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_RecoMode, "CONVERSATION");
      // 优化音频超时设置
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "15000");
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "5000");
      speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "3000");
      
      console.log('录音语音配置创建成功');
      console.log('识别语言:', language);
      console.log('识别模式: 交互式');
      console.log('听写模式: 已启用');

      // 创建识别器
      console.log('🔄 创建语音识别器...');
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      if (!recognizer) {
        throw new Error('无法创建语音识别器');
      }
      console.log('✅ 语音识别器创建成功');

      console.log('🔄 开始连续语音识别...');

      let finalText = '';
      let recognitionCount = 0;
      let isCompleted = false;

      // 设置识别结果回调
      recognizer.recognized = (s, e) => {
        recognitionCount++;
        console.log(`📝 识别结果 #${recognitionCount}:`, e.result.text);
        console.log('识别原因:', e.result.reason);
        
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          finalText += e.result.text + ' ';
          console.log('📊 当前累积文本:', finalText.trim());
        }
      };

      // 设置识别开始回调
      recognizer.recognizing = (s, e) => {
        console.log('🔄 正在识别中...', e.result.text);
      };

      // 设置会话开始回调
      recognizer.sessionStarted = (s, e) => {
        console.log('🎬 语音识别会话开始');
      };

      // 设置会话结束回调
      recognizer.sessionStopped = (s, e) => {
        console.log('🏁 语音识别会话结束');
        if (!isCompleted) {
          isCompleted = true;
          console.log('📋 最终识别文本:', finalText.trim());
          recognizer.close();
          const totalTime = Date.now() - startTime;
          console.log(`✅ 语音识别成功完成，总耗时: ${totalTime}ms`);
          resolve(finalText.trim());
        }
      };

      // 设置识别结束回调
      recognizer.canceled = (s, e) => {
        console.log('❌ 语音识别被取消:', e.reason);
        if (e.reason === sdk.CancellationReason.Error) {
          console.error('❌ 识别错误详情:', e.errorDetails);
        }
        if (!isCompleted) {
          isCompleted = true;
          if (finalText.trim()) {
            console.log('⚠️ 部分识别成功，返回已识别文本');
            resolve(finalText.trim());
          } else {
            reject(e.errorDetails || '语音识别被取消');
          }
          recognizer.close();
        }
      };

      // 开始连续识别
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('🚀 连续识别已开始');
          
          // 动态设置超时处理
          const estimatedDuration = Math.max(processedBuffer.length / (16000 * 2), 10);
          const totalTimeout = Math.min(estimatedDuration * 1000 + 30000, 180000);
          
          console.log(`🕐 设置总超时时间: ${(totalTimeout/1000).toFixed(1)}秒`);
          
          timeoutId = setTimeout(() => {
            if (!isCompleted) {
              console.log('⏰ 语音识别超时，停止识别');
              isCompleted = true;
              recognizer.stopContinuousRecognitionAsync(
                () => {
                  console.log('🛑 识别已停止');
                  if (finalText.trim()) {
                    console.log('⚠️ 超时但部分识别成功');
                    resolve(finalText.trim());
                  } else {
                    reject('语音识别超时，请重试');
                  }
                  recognizer.close();
                },
                (err) => {
                  console.error('❌ 停止识别失败:', err);
                  if (finalText.trim()) {
                    resolve(finalText.trim());
                  } else {
                    reject(err);
                  }
                  recognizer.close();
                }
              );
            }
          }, totalTimeout);
        },
        (err) => {
          console.error('❌ 开始连续识别失败:', err);
          reject(err);
        }
      );

    } catch (error) {
      console.error('❌ 语音转文本初始化错误:', error);
      reject(error);
    }
  });
}

export async function textToSpeech(text: string, language: string = defaultLang, voiceName?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('开始文本转语音处理...');
      console.log('文本内容:', text);
      console.log('语言设置:', language);

      // 检查SDK是否正确导入
      if (!sdk.SpeechConfig || !sdk.SpeechSynthesizer) {
        throw new Error('Azure Speech SDK 导入失败，关键组件缺失');
      }

      // 创建语音配置
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      if (!speechConfig) {
        throw new Error('无法创建语音配置，请检查Azure密钥和区域设置');
      }

      speechConfig.speechSynthesisLanguage = language;
      if (voiceName) {
        speechConfig.speechSynthesisVoiceName = voiceName;
      }

      console.log('语音配置创建成功');

      // 创建合成器
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
      if (!synthesizer) {
        throw new Error('无法创建语音合成器');
      }

      console.log('开始语音合成...');

      // 设置合成结果回调
      synthesizer.speakTextAsync(
        text,
        (result) => {
          console.log('合成结果回调触发');
          console.log('合成原因:', result.reason);
          
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log('语音合成成功，音频数据大小:', result.audioData.byteLength);
            synthesizer.close();
            resolve(Buffer.from(result.audioData));
          } else {
            console.log('语音合成失败，原因:', result.reason);
            synthesizer.close();
            reject(result.errorDetails || '语音合成失败');
          }
        },
        (err) => {
          console.error('语音合成错误:', err);
          synthesizer.close();
          reject(err);
        }
      );

      // 设置超时处理
      setTimeout(() => {
        console.log('语音合成超时');
        synthesizer.close();
        reject('语音合成超时，请重试');
      }, 30000); // 30秒超时

    } catch (error) {
      console.error('文本转语音初始化错误:', error);
      reject(error);
    }
  });
}

/**
 * 录音专用的语音转文本函数
 * 适用于实时录音的音频数据
 */
export async function speechToTextFromRecording(buffer: Buffer, language: string = defaultLang, originalFormat?: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let recognizer: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('开始录音语音转文本处理...');
      console.log('录音数据大小:', buffer.length, 'bytes');
      console.log('语言设置:', language);
      console.log('音频格式:', originalFormat || '未知');
      console.log('Azure配置 - Key长度:', speechKey.length, 'Region:', speechRegion);

      // 检查SDK是否正确导入
      if (!sdk.AudioInputStream || !sdk.SpeechConfig || !sdk.AudioConfig || !sdk.SpeechRecognizer) {
        throw new Error('Azure Speech SDK 导入失败，关键组件缺失');
      }

      // 根据音频格式决定处理方式
      let processedBuffer = buffer;
      try {
        console.log('🎵 音频格式分析:', originalFormat);
        console.log('🎵 音频数据大小:', buffer.length, 'bytes');
        
        if (originalFormat === 'audio/wav' || originalFormat === 'audio/pcm') {
          console.log('✅ 检测到支持的音频格式，直接使用');
          processedBuffer = buffer;
        } else {
          console.log('⚠️ 检测到不支持的音频格式:', originalFormat);
          console.log('⚠️ Azure Speech SDK 支持格式: audio/wav, audio/pcm, audio/raw');
          console.log('⚠️ 当前格式可能导致识别失败，建议前端使用 WAV 格式录音');
          
          // 在 serverless 环境中，我们只能尝试直接使用原始数据
          // 这可能会失败，因为 Azure SDK 对格式要求严格
          processedBuffer = buffer;
        }
        
        // 检查音频数据
        if (processedBuffer.length === 0) {
          throw new Error('音频数据为空');
        }
        
        // 检查音频数据的基本特征
        if (processedBuffer.length < 100) {
          console.warn('⚠️ 音频数据太小，可能无法识别');
        }
        
        console.log('🎵 使用音频数据，大小:', processedBuffer.length, 'bytes');
      } catch (error) {
        console.error('❌ 音频处理失败:', error);
        reject(new Error(`音频处理失败: ${(error as Error).message}`));
        return;
      }

      // 创建音频流
      const pushStream = sdk.AudioInputStream.createPushStream();
      if (!pushStream) {
        throw new Error('无法创建音频输入流');
      }

      // 写入音频数据
      pushStream.write(processedBuffer);
      pushStream.close();

      // 创建音频配置
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
      if (!audioConfig) {
        throw new Error('无法创建音频配置');
      }

      // 创建语音配置
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      if (!speechConfig) {
        throw new Error('无法创建语音配置，请检查Azure密钥和区域设置');
      }

      speechConfig.speechRecognitionLanguage = language;
      
      // 启用听写模式，提高识别效果和连续识别能力
      speechConfig.enableDictation();
      
      // 设置识别模式为连续模式，适合长录音
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_RecoMode, "CONVERSATION");
      
      // 优化音频超时设置，适合连续语音和长录音
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "15000"); // 15秒初始静音超时
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "5000"); // 5秒结束静音超时
      
      // 设置分段静音超时，允许长时间停顿而不终止识别
      speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "3000"); // 3秒分段静音
      
      // 优化语音识别的其他配置
      speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EnableAudioLogging, "false");
      
      console.log('录音语音配置创建成功');
      console.log('识别语言:', language);
      console.log('识别模式: 连续对话模式');
      console.log('听写模式: 已启用');
      console.log('分段识别: 已启用');

      // 创建识别器
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      if (!recognizer) {
        throw new Error('无法创建语音识别器');
      }

      console.log('开始录音语音识别...');

      // 清理函数
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (recognizer) {
          try {
            recognizer.close();
            recognizer = null;
          } catch (e) {
            console.warn('清理识别器时出错:', e);
          }
        }
      };

      let finalText = '';
      let recognitionCount = 0;
      let isCompleted = false;

      // 设置识别结果回调
      recognizer.recognized = (s: any, e: any) => {
        recognitionCount++;
        console.log(`📝 录音识别结果 #${recognitionCount}:`, e.result.text);
        console.log('识别原因:', e.result.reason);
        
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          if (finalText && !finalText.endsWith(' ') && !finalText.endsWith('。') && !finalText.endsWith('！') && !finalText.endsWith('？')) {
            finalText += ' ';
          }
          finalText += e.result.text;
          console.log('📊 当前累积文本:', finalText);
        }
      };

      // 设置识别进行中回调
      recognizer.recognizing = (s: any, e: any) => {
        if (e.result.text) {
          console.log('🔄 正在识别中...', e.result.text.substring(0, 50));
        }
      };

      // 设置会话结束回调
      recognizer.sessionStopped = (s: any, e: any) => {
        console.log('🏁 录音语音识别会话结束');
        if (!isCompleted) {
          isCompleted = true;
          console.log('📋 录音最终识别文本:', finalText);
          cleanup();
          if (finalText.trim()) {
            resolve(finalText.trim());
          } else {
            reject('无法识别录音内容，请重试');
          }
        }
      };

      // 设置识别取消回调
      recognizer.canceled = (s: any, e: any) => {
        console.log('❌ 录音语音识别被取消:', e.reason);
        if (e.reason === sdk.CancellationReason.Error) {
          console.error('❌ 录音识别错误详情:', e.errorDetails);
          console.error('❌ 错误代码:', e.errorCode);
        }
        
        if (!isCompleted) {
          isCompleted = true;
          cleanup();
          
          if (finalText.trim()) {
            console.log('⚠️ 录音部分识别成功，返回已识别文本');
            resolve(finalText.trim());
          } else {
            // 根据错误类型提供更具体的错误信息
            let errorMessage = '录音语音识别失败';
            
            if (e.reason === sdk.CancellationReason.Error) {
              if (e.errorDetails && e.errorDetails.includes('UnsupportedAudioFormat')) {
                errorMessage = `不支持的音频格式 ${originalFormat || '未知'}。请尝试使用不同的浏览器或设备录音。`;
              } else if (e.errorDetails && e.errorDetails.includes('AuthenticationFailure')) {
                errorMessage = 'Azure语音服务认证失败，请检查配置';
              } else if (e.errorDetails && e.errorDetails.includes('ConnectionFailure')) {
                errorMessage = '网络连接失败，请检查网络连接';
              } else {
                errorMessage = `语音识别失败: ${e.errorDetails || '未知错误'}`;
              }
            }
            
            reject(errorMessage);
          }
        }
      };

      // 开始连续识别
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log('🚀 录音连续识别已开始');
          
          // 动态计算停止时间：基于音频时长 + 额外缓冲时间
          const estimatedDuration = Math.max(processedBuffer.length / (16000 * 2), 10); // 假设16kHz 16bit单声道，最少10秒
          const stopDelay = Math.min(estimatedDuration * 1000 + 15000, 120000); // 音频时长+15秒缓冲，最多2分钟
          
          console.log(`📊 估算音频时长: ${estimatedDuration.toFixed(1)}秒，将在${(stopDelay/1000).toFixed(1)}秒后停止识别`);
          
          setTimeout(() => {
            if (!isCompleted && recognizer) {
              console.log('🛑 录音识别完成，停止连续识别');
              recognizer.stopContinuousRecognitionAsync(
                () => {
                  console.log('✅ 录音识别已正常停止');
                },
                (err: any) => {
                  console.error('❌ 停止录音识别失败:', err);
                }
              );
            }
          }, stopDelay);
        },
        (err: any) => {
          console.error('❌ 开始录音连续识别失败:', err);
          cleanup();
          reject(err);
        }
      );

      // 设置超时处理 - 基于音频长度动态调整
      const estimatedDuration = Math.max(processedBuffer.length / (16000 * 2), 10);
      const totalTimeout = Math.min(estimatedDuration * 1000 + 30000, 180000); // 音频时长+30秒，最多3分钟
      
      console.log(`🕐 设置总超时时间: ${(totalTimeout/1000).toFixed(1)}秒`);
      
      timeoutId = setTimeout(() => {
        console.log('⏰ 录音语音识别超时');
        if (!isCompleted) {
          isCompleted = true;
          if (recognizer) {
            recognizer.stopContinuousRecognitionAsync();
          }
          cleanup();
          
          if (finalText.trim()) {
            console.log('⚠️ 超时但部分识别成功');
            resolve(finalText.trim());
          } else {
            reject('录音语音识别超时，请重试');
          }
        }
      }, totalTimeout);

    } catch (error) {
      console.error('录音语音转文本初始化错误:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (recognizer) {
        try {
          recognizer.close();
        } catch (e) {
          console.warn('清理识别器时出错:', e);
        }
      }
      reject(error);
    }
  });
} 