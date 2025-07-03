'use client';

import { useState } from 'react';
import { Button, Card, Typography, Space, Alert, Input, Upload, message, Divider, Tag, Spin, Descriptions } from 'antd';
import { AudioOutlined, SendOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, StopOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import RecordingSTTTest from '@/app/components/RecordingSTTTest';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  duration?: number;
}

export default function TestPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [ttsText, setTtsText] = useState('你好，这是一个测试。');
  const [analysisText, setAnalysisText] = useState('');
  const [sttResult, setSttResult] = useState('');
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);

  // 测试SDK导入和配置
  const testSDK = async () => {
    setLoading(prev => ({ ...prev, sdk: true }));
    const startTime = Date.now();
    
    try {
      const res = await fetch('/api/test-sdk');
      const data = await res.json();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        success: data.success,
        message: data.success ? 'SDK导入成功' : 'SDK导入失败',
        data,
        duration
      };
      
      setResults(prev => ({ ...prev, sdk: result }));
      
      if (data.success) {
        message.success('SDK测试通过！');
      } else {
        message.error('SDK测试失败！');
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      setResults(prev => ({ 
        ...prev, 
        sdk: { 
          success: false, 
          message: e.message, 
          duration 
        } 
      }));
      message.error('SDK测试异常！');
    } finally {
      setLoading(prev => ({ ...prev, sdk: false }));
    }
  };

  // 测试文本转语音
  const testTTS = async () => {
    setLoading(prev => ({ ...prev, tts: true }));
    setTtsAudioUrl(null);
    const startTime = Date.now();
    
    try {
      const res = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText }),
      });
      
      const duration = Date.now() - startTime;
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'TTS失败');
      }
      
      const blob = await res.blob();
      setTtsAudioUrl(URL.createObjectURL(blob));
      
      const result: TestResult = {
        success: true,
        message: `TTS成功，音频大小: ${blob.size} bytes`,
        data: { blobSize: blob.size },
        duration
      };
      
      setResults(prev => ({ ...prev, tts: result }));
      message.success('TTS测试成功！');
    } catch (e: any) {
      const duration = Date.now() - startTime;
      setResults(prev => ({ 
        ...prev, 
        tts: { 
          success: false, 
          message: e.message, 
          duration 
        } 
      }));
      message.error('TTS测试失败！');
    } finally {
      setLoading(prev => ({ ...prev, tts: false }));
    }
  };

  // 测试语音转文本
  const testSTT = async (file: File) => {
    setLoading(prev => ({ ...prev, stt: true }));
    setSttResult('');
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    });
    
    const startTime = Date.now();
    
    try {
      console.log('开始STT测试:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });
      
      const duration = Date.now() - startTime;
      
      if (!res.ok) {
        const error = await res.json();
        console.error('STT API错误:', error);
        throw new Error(error.error || `STT失败 (${res.status})`);
      }
      
      const data = await res.json();
      setSttResult(data.text);
      
      console.log('STT测试成功:', data);
      
      const result: TestResult = {
        success: true,
        message: `STT成功，识别文本: ${data.text}`,
        data: { 
          text: data.text,
          duration: data.duration,
          fileInfo: data.fileInfo
        },
        duration
      };
      
      setResults(prev => ({ ...prev, stt: result }));
      message.success('STT测试成功！');
    } catch (e: any) {
      const duration = Date.now() - startTime;
      console.error('STT测试失败:', e);
      
      setResults(prev => ({ 
        ...prev, 
        stt: { 
          success: false, 
          message: e.message, 
          duration 
        } 
      }));
      message.error(`STT测试失败: ${e.message}`);
    } finally {
      setLoading(prev => ({ ...prev, stt: false }));
    }
  };

  // 测试AI分析
  const testAnalysis = async () => {
    if (!analysisText.trim()) {
      message.warning('请输入要分析的文本内容');
      return;
    }

    setLoading(prev => ({ ...prev, analysis: true }));
    const startTime = Date.now();
    
    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: analysisText }),
      });
      
      const duration = Date.now() - startTime;
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'AI分析失败');
      }
      
      const data = await res.json();
      
      const result: TestResult = {
        success: true,
        message: 'AI分析成功',
        data,
        duration
      };
      
      setResults(prev => ({ ...prev, analysis: result }));
      message.success('AI分析测试成功！');
    } catch (e: any) {
      const duration = Date.now() - startTime;
      setResults(prev => ({ 
        ...prev, 
        analysis: { 
          success: false, 
          message: e.message, 
          duration 
        } 
      }));
      message.error('AI分析测试失败！');
    } finally {
      setLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  // 调试语音服务
  const debugSpeechService = async () => {
    setLoading(prev => ({ ...prev, debug: true }));
    const startTime = Date.now();
    
    try {
      const res = await fetch('/api/debug/speech');
      const data = await res.json();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        success: true,
        message: '调试信息获取成功',
        data,
        duration
      };
      
      setResults(prev => ({ ...prev, debug: result }));
      
      // 检查关键配置
      if (!data.azureConfig.isConfigured) {
        message.error('Azure配置不完整！请检查环境变量');
      } else if (!data.speechConfigTest.success) {
        message.error('语音配置测试失败！');
      } else {
        message.success('语音服务配置正常！');
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      setResults(prev => ({ 
        ...prev, 
        debug: { 
          success: false, 
          message: e.message, 
          duration 
        } 
      }));
      message.error('调试失败！');
    } finally {
      setLoading(prev => ({ ...prev, debug: false }));
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    await testSDK();
    await testTTS();
    await testAnalysis();
    // 注意：录音测试需要用户手动操作，不能自动运行
    message.info('录音测试需要手动操作，请点击"开始录音"按钮');
  };

  const renderResult = (key: string, result: TestResult) => {
    if (!result) return null;
    
    return (
      <Alert
        message={
          <Space>
            {result.success ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            {result.message}
            {result.duration && <Tag color="blue">{result.duration}ms</Tag>}
          </Space>
        }
        description={
          result.data && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">详细信息：</Text>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )
        }
        type={result.success ? 'success' : 'error'}
        showIcon={false}
        style={{ marginTop: 16 }}
      />
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}>🔧 Azure 语音服务 API 测试</Title>
      <Text type="secondary">测试所有API功能是否正常工作</Text>
      
      <Divider />
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 一键测试 */}
        <Card title="🚀 一键测试所有功能">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Button 
                type="primary" 
                onClick={runAllTests}
                loading={Object.values(loading).some(Boolean)}
              >
                运行所有测试
              </Button>
              <Text type="secondary">点击按钮测试所有API功能</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              注意：录音测试需要手动操作，一键测试会提示您手动开始录音
            </Text>
          </Space>
        </Card>

        {/* SDK测试 */}
        <Card title="📦 SDK导入测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>测试Azure Speech SDK是否正确导入和配置</Text>
            <Button 
              onClick={testSDK}
              loading={loading.sdk}
              icon={<CheckCircleOutlined />}
            >
              测试SDK
            </Button>
            {renderResult('sdk', results.sdk)}
          </Space>
        </Card>

        {/* TTS测试 */}
        <Card title="🔊 文本转语音测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>输入要转换的文本：</Text>
            <TextArea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={3}
              placeholder="输入要转换为语音的文本..."
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={testTTS}
              loading={loading.tts}
            >
              测试TTS
            </Button>
            {ttsAudioUrl && (
              <div>
                <Text strong>TTS结果：</Text>
                <audio src={ttsAudioUrl} controls style={{ width: '100%', marginTop: 8 }} />
              </div>
            )}
            {renderResult('tts', results.tts)}
          </Space>
        </Card>

        {/* STT测试 */}
        <Card title="🎤 语音转文本测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>上传音频文件进行语音识别测试：</Text>
            <Upload
              accept="audio/*"
              showUploadList={false}
              beforeUpload={(file) => {
                testSTT(file);
                return false; // 阻止自动上传
              }}
            >
              <Button 
                icon={<UploadOutlined />}
                loading={loading.stt}
              >
                选择音频文件
              </Button>
            </Upload>
            
            {/* 文件信息显示 */}
            {fileInfo && (
              <Card size="small" title="📁 文件信息" style={{ marginTop: 16 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="文件名">{fileInfo.name}</Descriptions.Item>
                  <Descriptions.Item label="文件大小">{(fileInfo.size / 1024).toFixed(2)} KB</Descriptions.Item>
                  <Descriptions.Item label="MIME类型">{fileInfo.type}</Descriptions.Item>
                  <Descriptions.Item label="修改时间">{fileInfo.lastModified}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}
            
            {sttResult && (
              <div>
                <Text strong>识别结果：</Text>
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

            {/* 实时状态显示 */}
            {loading.recordingStt && (
              <Alert
                message="正在处理录音..."
                description={
                  <div>
                    <div>🔄 正在上传音频文件</div>
                    <div>🎤 正在识别语音内容</div>
                    <div>📝 实时显示识别结果</div>
                  </div>
                }
                type="info"
                showIcon
                icon={<Spin size="small" />}
                style={{ marginTop: 16 }}
              />
            )}

            {/* 处理状态指示器 */}
            {loading.recordingStt && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <Spin size="small" style={{ marginRight: 8 }} />
                  <Text>正在处理中，请稍候...</Text>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: 4, 
                  background: '#f0f0f0', 
                  borderRadius: 2,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #1890ff 0%, #40a9ff 50%, #1890ff 100%)',
                    animation: 'loading 2s ease-in-out infinite',
                    backgroundSize: '200% 100%'
                  }} />
                </div>
              </div>
            )}

            {renderResult('stt', results.stt)}
          </Space>
        </Card>

        {/* 录音STT测试 */}
        <RecordingSTTTest 
          onResult={(result) => {
            if (result.success) {
              setResults(prev => ({ 
                ...prev, 
                recordingStt: {
                  success: true,
                  message: `录音STT成功，识别文本: ${result.text}`,
                  data: result,
                  duration: result.duration
                }
              }));
              message.success('录音STT测试成功！');
            } else {
              setResults(prev => ({ 
                ...prev, 
                recordingStt: {
                  success: false,
                  message: result.error,
                  duration: result.duration
                }
              }));
              message.error(`录音STT测试失败: ${result.error}`);
            }
          }}
        />
        
        {/* 录音STT测试结果 */}
        {renderResult('recordingStt', results.recordingStt)}

        {/* AI分析测试 */}
        <Card title="🤖 AI分析测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>输入要分析的文本内容：</Text>
            <TextArea
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              rows={6}
              placeholder="请输入要分析的文本内容，AI将为您提取关键词、分析情感倾向并生成摘要..."
            />
            <Space>
              <Button
                type="primary"
                onClick={testAnalysis}
                loading={loading.analysis}
                icon={<SendOutlined />}
              >
                开始AI分析
              </Button>
              <Button
                onClick={() => setAnalysisText('')}
                disabled={loading.analysis}
              >
                清空文本
              </Button>
            </Space>
            
            {/* AI分析结果展示 */}
            {results.analysis?.success && results.analysis.data && (
              <Card size="small" title="📊 AI分析结果" style={{ marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>关键词：</Text>
                    <Space wrap style={{ marginTop: 8 }}>
                      {results.analysis.data.keywords?.map((keyword: string, index: number) => (
                        <Tag key={index} color="blue">{keyword}</Tag>
                      ))}
                    </Space>
                  </div>
                  <div>
                    <Text strong>情感倾向：</Text>
                    <Tag 
                      color={
                        results.analysis.data.sentiment === 'positive' ? 'green' : 
                        results.analysis.data.sentiment === 'negative' ? 'red' : 'orange'
                      }
                      style={{ marginLeft: 8 }}
                    >
                      {results.analysis.data.sentiment}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>内容摘要：</Text>
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: 8, 
                      borderRadius: 4, 
                      marginTop: 4,
                      border: '1px solid #e9ecef'
                    }}>
                      {results.analysis.data.summary}
                    </div>
                  </div>
                  {results.analysis.data.confidence && (
                    <div>
                      <Text strong>置信度：</Text>
                      <Text>{(results.analysis.data.confidence * 100).toFixed(1)}%</Text>
                    </div>
                  )}
                </Space>
              </Card>
            )}
            
            {renderResult('analysis', results.analysis)}
          </Space>
        </Card>

        {/* 调试语音服务 */}
        <Card title="🔍 调试语音服务">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>检查Azure配置和语音服务状态</Text>
            <Button
              onClick={debugSpeechService}
              loading={loading.debug}
              icon={<CheckCircleOutlined />}
            >
              调试语音服务
            </Button>
            {renderResult('debug', results.debug)}
          </Space>
        </Card>

        {/* 测试结果汇总 */}
        {Object.keys(results).length > 0 && (
          <Card title="📊 测试结果汇总">
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(results).map(([key, result]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ textTransform: 'uppercase' }}>{key}</Text>
                  <Space>
                    <Tag color={result.success ? 'green' : 'red'}>
                      {result.success ? '通过' : '失败'}
                    </Tag>
                    {result.duration && <Tag color="blue">{result.duration}ms</Tag>}
                  </Space>
                </div>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
} 