'use client';

import { useState, useRef } from 'react';
import { Button, Card, Typography, Space, Alert, Upload, message, Divider } from 'antd';
import { AudioOutlined, UploadOutlined, StopOutlined } from '@ant-design/icons';
import '@/app/styles/streaming.css';

const { Title, Text, Paragraph } = Typography;

interface StreamingResult {
  type: string;
  text?: string;
  accumulatedText?: string;
  count?: number;
  timestamp: number;
  finalText?: string;
  message?: string;
  error?: any;
}

export default function StreamingSTT() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingResults, setStreamingResults] = useState<StreamingResult[]>([]);
  const [displayText, setDisplayText] = useState('');
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStreamingSTT = async (file: File) => {
    setIsProcessing(true);
    setStreamingResults([]);
    setDisplayText('');
    setCurrentStreamingText('');

    const formData = new FormData();
    formData.append('audio', file);

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/speech/stream', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('流式识别请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法创建流读取器');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setStreamingResults(prev => [...prev, data]);

              // 处理不同类型的流式数据
              switch (data.type) {
                case 'streaming':
                  // 实时流式文本 - 显示当前正在识别的部分
                  setCurrentStreamingText(data.text);
                  break;
                case 'recognized':
                  // 识别完成 - 累积到显示文本中
                  if (data.text) {
                    setDisplayText(prev => prev + (prev ? ' ' : '') + data.text);
                    setCurrentStreamingText('');
                  }
                  break;
                case 'complete':
                  setDisplayText(data.finalText);
                  setCurrentStreamingText('');
                  setIsProcessing(false);
                  message.success('流式识别完成！');
                  break;
                case 'error':
                  message.error(`识别错误: ${data.errorDetails || data.message}`);
                  setIsProcessing(false);
                  break;
              }
            } catch (e) {
              console.warn('解析流式数据失败:', e);
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        message.info('识别已取消');
      } else {
        message.error(`流式识别失败: ${error.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const clearResults = () => {
    setStreamingResults([]);
    setDisplayText('');
    setCurrentStreamingText('');
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>🎙️ 流式语音转文本</Title>
      <Text type="secondary">实时显示语音识别过程，体验真正的流式输出效果</Text>
      
      <Divider />
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 控制面板 */}
        <Card title="📁 音频文件上传">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>选择音频文件进行流式识别：</Text>
            <Space>
              <Upload
                accept="audio/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleStreamingSTT(file);
                  return false;
                }}
                disabled={isProcessing}
              >
                <Button 
                  icon={<UploadOutlined />}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  选择音频文件
                </Button>
              </Upload>
              
              {isProcessing && (
                <Button 
                  danger 
                  icon={<StopOutlined />}
                  onClick={handleCancel}
                >
                  取消识别
                </Button>
              )}
              
              <Button onClick={clearResults} disabled={isProcessing}>
                清空结果
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 统一的识别显示区域 */}
        <Card title="🔄 实时识别结果">
          <div style={{ 
            minHeight: 200,
            padding: 20,
            background: '#fafafa',
            borderRadius: 8,
            border: '2px solid #e8e8e8',
            position: 'relative'
          }}>
            {(displayText || currentStreamingText) ? (
              <div>
                <Text style={{ 
                  fontSize: 18, 
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {displayText}
                  {currentStreamingText && (
                    <span className="streaming-current" style={{ color: '#1890ff' }}>
                      {currentStreamingText}
                    </span>
                  )}
                </Text>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#999',
                fontSize: 16,
                marginTop: 60
              }}>
                {isProcessing ? (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 16 }}>🎤</div>
                    <Text>正在识别中...</Text>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 16 }}>📁</div>
                    <Text>上传音频文件开始识别</Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 详细日志 */}
        <Card title="📋 识别日志">
          <Space direction="vertical" style={{ width: '100%' }}>
            {streamingResults.length === 0 ? (
              <Text type="secondary">暂无识别日志</Text>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {streamingResults.map((result, index) => (
                  <div key={index} style={{ 
                    padding: 8, 
                    marginBottom: 4, 
                    background: '#f5f5f5', 
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    <Text type="secondary">
                      [{new Date(result.timestamp).toLocaleTimeString()}] 
                      {result.type}: 
                    </Text>
                    <Text>
                      {result.text || result.message || result.finalText || JSON.stringify(result)}
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </Space>
        </Card>

        {/* 使用说明 */}
        <Card title="💡 使用说明">
          <Space direction="vertical">
            <Text>• 流式识别会实时显示识别过程，就像实时字幕</Text>
            <Text>• 识别的文本会逐步累积在同一个区域中</Text>
            <Text>• <Text code style={{ color: '#1890ff' }}>蓝色文本</Text> 表示正在识别的部分</Text>
            <Text>• 黑色文本表示已完成的识别结果</Text>
            <Text>• 可以随时取消识别过程</Text>
            <Text>• 支持长音频文件的完整识别</Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
} 