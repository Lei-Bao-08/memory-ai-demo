'use client';

import React, { useState, useRef } from 'react';
import { Button, Card, Space, Typography, Alert, Descriptions, Spin, Progress } from 'antd';
import { AudioOutlined, StopOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRecording } from '@/app/hooks/useRecording';

const { Text } = Typography;

interface RecordingSTTTestProps {
  onResult?: (result: any) => void;
}

export default function RecordingSTTTest({ onResult }: RecordingSTTTestProps) {
  const {
    isRecording,
    isProcessing,
    duration,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    resetRecording
  } = useRecording();

  const [sttResult, setSttResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const updateStatus = (step: string, progressValue: number, message?: string) => {
    setCurrentStep(step);
    setProgress(progressValue);
    if (message) {
      setSttResult(prev => {
        const timestamp = new Date().toLocaleTimeString();
        const statusLine = `[${timestamp}] ${message}`;
        return `${prev ? prev + '\n' : ''}${statusLine}`;
      });
    }
  };

  const testRecordingSTT = async () => {
    if (!audioBlob) {
      return;
    }

    setIsLoading(true);
    setSttResult('');
    setProgress(0);
    setCurrentStep('');
    
    // 创建AbortController用于取消请求
    abortControllerRef.current = new AbortController();
    
    const startTime = Date.now();
    
    try {
      updateStatus('uploading', 10, '开始上传音频文件...');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await fetch('/api/speech/stream', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '录音STT失败');
      }

      updateStatus('processing', 30, '音频文件上传完成，开始识别...');

      // 检查响应类型
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // 流式响应
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('无法读取响应流');
        }

        let buffer = '';
        let finalText = '';
        
        updateStatus('recognizing', 50, '正在识别语音内容...');

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  updateStatus('recognizing', 60, data.message);
                } else if (data.type === 'partial') {
                  updateStatus('recognizing', 70, `正在识别: ${data.text}`);
                } else if (data.type === 'final') {
                  finalText = data.text;
                  updateStatus('completing', 90, `识别完成: ${data.text}`);
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                } else if (data.type === 'complete') {
                  updateStatus('completed', 100, '处理完成');
                  break;
                }
              } catch (e) {
                console.warn('解析SSE数据失败:', line, e);
              }
            }
          }
        }

        const duration = Date.now() - startTime;
        
        const result = {
          success: true,
          text: finalText,
          duration,
          recordingDuration: formatDuration(duration)
        };
        
        onResult?.(result);
        
      } else {
        // 普通JSON响应
        updateStatus('processing', 80, '正在处理响应...');
        const data = await res.json();
        const duration = Date.now() - startTime;
        
        setSttResult(data.text);
        updateStatus('completed', 100, '处理完成');
        
        const result = {
          success: true,
          text: data.text,
          duration,
          recordingDuration: formatDuration(duration)
        };
        
        onResult?.(result);
      }
      
    } catch (e: any) {
      const duration = Date.now() - startTime;
      console.error('录音STT测试失败:', e);
      
      updateStatus('error', 0, `❌ 错误: ${e.message}`);
      
      const result = {
        success: false,
        error: e.message,
        duration
      };
      
      onResult?.(result);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      updateStatus('cancelled', 0, '处理已取消');
      setIsLoading(false);
    }
  };

  const resetTest = () => {
    resetRecording();
    setSttResult('');
    setProgress(0);
    setCurrentStep('');
    setIsLoading(false);
    abortControllerRef.current = null;
  };

  const getStepText = (step: string) => {
    const stepMap: Record<string, string> = {
      uploading: '上传音频文件',
      processing: '处理音频',
      recognizing: '识别语音',
      completing: '完成识别',
      completed: '处理完成',
      error: '处理失败',
      cancelled: '已取消'
    };
    return stepMap[step] || step;
  };

  return (
    <Card title="🎙️ 录音语音转文本测试" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text>直接录音进行语音识别测试：</Text>
        
        {/* 录音控制 */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {!isRecording ? (
            <Button
              type="primary"
              size="large"
              icon={<AudioOutlined />}
              onClick={startRecording}
              disabled={isRecording || isProcessing || isLoading}
              style={{ height: 60, width: 120, fontSize: 16 }}
            >
              开始录音
            </Button>
          ) : (
            <Button
              danger
              size="large"
              icon={<StopOutlined />}
              onClick={stopRecording}
              style={{ height: 60, width: 120, fontSize: 16 }}
            >
              停止录音
            </Button>
          )}
        </div>

        {/* 录音状态显示 */}
        {isRecording && (
          <Alert
            message={`录音中... ${formatDuration(duration)}`}
            type="info"
            showIcon
            icon={<AudioOutlined style={{ color: '#1890ff' }} />}
            style={{ marginBottom: 16 }}
          />
        )}

        {isProcessing && (
          <Alert
            message="正在处理录音..."
            type="info"
            showIcon
            icon={<Spin size="small" />}
            style={{ marginBottom: 16 }}
          />
        )}

        {recordingError && (
          <Alert
            message="录音错误"
            description={recordingError}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 录音信息显示 */}
        {audioBlob && (
          <Card size="small" title="📁 录音信息" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="录音时长">{formatDuration(duration)}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{(audioBlob.size / 1024).toFixed(2)} KB</Descriptions.Item>
              <Descriptions.Item label="MIME类型">{audioBlob.type}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
        
        {/* 测试按钮 */}
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={testRecordingSTT}
            loading={isLoading}
            disabled={!audioBlob || isRecording || isProcessing}
          >
            测试录音STT
          </Button>
          
          {isLoading && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={cancelProcessing}
            >
              取消处理
            </Button>
          )}
          
          <Button
            icon={<ReloadOutlined />}
            onClick={resetTest}
            disabled={isRecording || isProcessing || isLoading}
          >
            重新开始
          </Button>
        </Space>

        {/* 进度显示 */}
        {isLoading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>{getStepText(currentStep)}</Text>
              <Text>{progress}%</Text>
            </div>
            <Progress 
              percent={progress} 
              status={currentStep === 'error' ? 'exception' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}
        
        {/* 识别结果 */}
        {sttResult && (
          <div>
            <Text strong>录音识别结果：</Text>
            <div style={{ 
              background: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4, 
              marginTop: 8,
              border: '1px solid #d9d9d9',
              maxHeight: 300,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: 14,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5
            }}>
              {sttResult}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
} 