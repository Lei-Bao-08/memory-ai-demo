'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Form, Spin, Alert, Space, Typography, Divider, Tag } from 'antd';
import { AudioOutlined, StopOutlined, SaveOutlined, SyncOutlined, EditOutlined } from '@ant-design/icons';
import { useRecording } from '@/app/hooks/useRecording';
import { Recording, AnalysisResult } from '@/app/types/recording';

const { TextArea } = Input;
const { Text } = Typography;

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recording: Recording) => void;
}

type RecordingStep = 'recording' | 'completed' | 'transcribing' | 'editing' | 'analyzing';

// 使用从types/recording.ts导入的AnalysisResult接口

export default function RecordingModal({ isOpen, onClose, onSave }: RecordingModalProps) {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<RecordingStep>('recording');
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [todoExpanded, setTodoExpanded] = useState(true);
  
  const {
    isRecording,
    isProcessing,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
    formatDuration,
  } = useRecording();

  // 重置状态当模态框打开时
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('recording');
      setTranscriptionResult('');
      setIsTranscribing(false);
      setIsAnalyzing(false);
      setAnalysisResult(null);
      setIsPlaying(false);
      setTodoExpanded(true);
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      form.resetFields();
    }
  }, [isOpen, form, currentAudio]);

  // 监听录音完成 - 自动开始转文字和分析流程
  useEffect(() => {
    if (audioBlob && !isRecording && currentStep === 'recording') {
      setCurrentStep('completed');
      // 自动开始转文字流程
      setTimeout(() => {
        handleAutoTranscribeAndAnalyze();
      }, 500);
    }
  }, [audioBlob, isRecording, currentStep]);

  // 自动进行语音转文字和AI分析的完整流程
  const handleAutoTranscribeAndAnalyze = async () => {
    if (!audioBlob) return;

    try {
      // 第一步：语音转文字
      setIsTranscribing(true);
      setCurrentStep('transcribing');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech/recording', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '语音转文本失败');
      }

      const result = await response.json();
      
      if (!result.text || result.text.trim() === '') {
        throw new Error('语音识别结果为空，请重试');
      }
      
      setTranscriptionResult(result.text);
      setIsTranscribing(false);

      // 第二步：AI分析
      setIsAnalyzing(true);
      setCurrentStep('analyzing');

      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: result.text }),
      });

      let analysis = null;
      if (analysisResponse.ok) {
        analysis = await analysisResponse.json();
        setAnalysisResult(analysis);
      } else {
        console.warn('AI分析失败，但继续保存记录');
      }

      // 第三步：自动保存记录
      const autoTitle = analysis?.title || 
                       result.text.substring(0, 30) + (result.text.length > 30 ? '...' : '');

      const recording: Recording = {
        id: Date.now().toString(),
        title: autoTitle,
        content: result.text,
        audioUrl: URL.createObjectURL(audioBlob),
        duration,
        createdAt: new Date(),
        updatedAt: new Date(),
        analysis,
      };

      // 保存并关闭
      onSave(recording);
      handleClose();

    } catch (error: any) {
      console.error('自动处理失败:', error);
      
      // 如果自动处理失败，回退到手动编辑模式
      setIsTranscribing(false);
      setIsAnalyzing(false);
      
      const errorContent = error.message?.includes('语音识别') ? 
                          `语音转文本失败: ${error.message}` : 
                          transcriptionResult || `处理失败: ${error.message}`;
      
      form.setFieldsValue({ 
        title: `录音 ${new Date().toLocaleString()}`,
        content: errorContent
      });
      setCurrentStep('editing');
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setCurrentStep('transcribing');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/speech/recording', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '语音转文本失败');
      }

      const result = await response.json();
      
      if (!result.text || result.text.trim() === '') {
        throw new Error('语音识别结果为空，请重试');
      }
      
      setTranscriptionResult(result.text);
      
      // 自动生成标题
      const autoTitle = result.text.substring(0, 30) + (result.text.length > 30 ? '...' : '');
      form.setFieldsValue({ 
        title: autoTitle,
        content: result.text 
      });

      setCurrentStep('editing');

      // 自动进行预览分析
      setTimeout(() => {
        handlePreviewAnalysis(result.text);
      }, 1000);

    } catch (error: any) {
      console.error('语音转文本失败:', error);
      setTranscriptionResult(`语音转文本失败: ${error.message || '请重试'}`);
      form.setFieldsValue({ 
        title: `录音 ${new Date().toLocaleString()}`,
        content: `语音转文本失败: ${error.message || '请重试'}`
      });
      setCurrentStep('editing');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePreviewAnalysis = async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setAnalysisResult(analysis);
        console.log('预览分析结果:', analysis);
        
        // 自动填充AI生成的标题
        if (analysis.title) {
          form.setFieldsValue({
            title: analysis.title
          });
        }
      } else {
        console.warn('预览分析失败');
      }
    } catch (error) {
      console.warn('预览分析错误:', error);
    }
  };

  const handleAudioControl = () => {
    if (!audioBlob) return;

    if (isPlaying && currentAudio) {
      // 停止播放
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setCurrentAudio(null);
    } else {
      // 开始播放
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
      audio.onpause = () => {
        setIsPlaying(false);
      };
      audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);
    }
  };

  const handleAnalyzeAndSave = async () => {
    try {
      const values = await form.validateFields();
      const content = values.content;
      
      if (!content.trim()) {
        return;
      }

      setIsAnalyzing(true);
      setCurrentStep('analyzing');

      try {
        // AI分析
        const analysisResponse = await fetch('/api/analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: content }),
        });

        let analysis = null;
        if (analysisResponse.ok) {
          analysis = await analysisResponse.json();
        } else {
          console.warn('AI分析失败，但继续保存记录');
        }

        // 保存记录
        const recording: Recording = {
          id: Date.now().toString(),
          title: values.title || content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          content,
          audioUrl: URL.createObjectURL(audioBlob!),
          duration,
          createdAt: new Date(),
          updatedAt: new Date(),
          analysis,
        };

        onSave(recording);
        handleClose();

      } catch (error) {
        console.error('处理失败:', error);
        // 即使AI分析失败，也要保存基本记录
        const recording: Recording = {
          id: Date.now().toString(),
          title: values.title || content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          content,
          audioUrl: URL.createObjectURL(audioBlob!),
          duration,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        onSave(recording);
        handleClose();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveWithoutAnalysis = async () => {
    try {
      const values = await form.validateFields();
      const content = values.content;
      
      if (!content.trim()) {
        return;
      }

      const recording: Recording = {
        id: Date.now().toString(),
        title: values.title || content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        content,
        audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : '',
        duration,
        createdAt: new Date(),
        updatedAt: new Date(),
        analysis: analysisResult || undefined,
      };

      onSave(recording);
      handleClose();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      cancelRecording();
    }
    resetRecording();
    form.resetFields();
    setCurrentStep('recording');
    setTranscriptionResult('');
    setIsTranscribing(false);
    setIsAnalyzing(false);
    onClose();
  };

  const getModalTitle = () => {
    switch (currentStep) {
      case 'recording':
        return isRecording ? `录音中... ${formatDuration(duration)}` : '录音';
      case 'completed':
        return '录音完成 - 自动处理中';
      case 'transcribing':
        return '🎯 语音转文字中...';
      case 'editing':
        return '编辑录音内容';
      case 'analyzing':
        return '🤖 AI智能分析中...';
      default:
        return '录音';
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'recording':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            {isRecording ? (
              <Space direction="vertical" size="large">
                <div style={{ fontSize: 64, color: '#ff4d4f' }}>
                  <AudioOutlined style={{ animation: 'pulse 1.5s infinite' }} />
                </div>
                <Text strong style={{ color: '#ff4d4f', fontSize: 18 }}>
                  录音中... {formatDuration(duration)}
                </Text>
                <Button
                  danger
                  size="large"
                  icon={<StopOutlined />}
                  onClick={stopRecording}
                  style={{ height: 50, width: 120, fontSize: 16 }}
                >
                  停止录音
                </Button>
              </Space>
            ) : (
              <Space direction="vertical" size="large">
                <div style={{ fontSize: 64, color: '#1890ff' }}>
                  🎤
                </div>
                <Text style={{ fontSize: 16 }}>
                  点击开始录音
                </Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<AudioOutlined />}
                  onClick={startRecording}
                  style={{ height: 50, width: 120, fontSize: 16 }}
                >
                  开始录音
                </Button>
              </Space>
            )}
          </div>
        );

      case 'completed':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Space direction="vertical" size="large">
              <div style={{ fontSize: 64 }}>✅</div>
              <Text style={{ fontSize: 16 }}>录音完成！正在自动处理...</Text>
              <div>
                <Text type="secondary">
                  📁 文件大小: {(audioBlob?.size || 0 / 1024).toFixed(2)} KB | 
                  ⏱️ 时长: {formatDuration(duration)}
                </Text>
              </div>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 14 }}>
                正在自动转换语音并进行AI分析，请稍候...
              </Text>
            </Space>
          </div>
        );

      case 'transcribing':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Space direction="vertical" size="large">
              <Spin size="large" />
              <Text style={{ fontSize: 16 }}>🎯 正在转换语音为文字...</Text>
              <Text type="secondary">请稍候，这可能需要几秒钟</Text>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  📝 步骤 1/2: 语音识别中
                </Text>
              </div>
            </Space>
          </div>
        );

      case 'analyzing':
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Space direction="vertical" size="large">
              <Spin size="large" />
              <Text style={{ fontSize: 16 }}>🤖 正在进行AI智能分析...</Text>
              <Text type="secondary">分析内容摘要、关键词和TODO任务</Text>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  🧠 步骤 2/2: AI分析中
                </Text>
              </div>
            </Space>
          </div>
        );

      case 'editing':
        return (
          <Form form={form} layout="vertical">
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入标题' }]}
            >
              <Input 
                placeholder="输入标题..." 
                prefix={<EditOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="content"
              label="内容"
              rules={[{ required: true, message: '请输入内容' }]}
            >
              <TextArea
                rows={8}
                placeholder="编辑录音内容..."
                showCount
                maxLength={1000}
              />
            </Form.Item>

            {audioBlob && (
              <>
                <Divider />
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 4, 
                  marginBottom: 16 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">
                      📁 录音文件: {(audioBlob.size / 1024).toFixed(2)} KB | 
                      ⏱️ 时长: {formatDuration(duration)} | 
                      🎤 格式: {audioBlob.type}
                    </Text>
                    <Button 
                      type={isPlaying ? "default" : "primary"}
                      size="small"
                      icon={isPlaying ? <StopOutlined /> : <AudioOutlined />}
                      onClick={handleAudioControl}
                    >
                      {isPlaying ? '停止播放' : '播放录音'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* AI分析预览 */}
            {analysisResult && (
              <>
                <Divider orientation="left">AI分析预览</Divider>
                <div style={{ marginBottom: 16 }}>
                  {/* 内容摘要 */}
                  {analysisResult.summary && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>📝 内容摘要：</Text>
                      <div style={{ 
                        marginTop: 4, 
                        padding: 8, 
                        background: '#f0f9ff', 
                        borderRadius: 4,
                        border: '1px solid #e0f2fe'
                      }}>
                        <Text>{analysisResult.summary}</Text>
                      </div>
                    </div>
                  )}

                  {/* 关键词 */}
                  {analysisResult.keywords && analysisResult.keywords.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>🔖 关键词：</Text>
                      <div style={{ marginTop: 6 }}>
                        <Space wrap size={[6, 6]}>
                          {analysisResult.keywords.map((keyword: string, index: number) => (
                            <Tag key={index} color="blue">{keyword}</Tag>
                          ))}
                        </Space>
                      </div>
                    </div>
                  )}

                  {/* 任务规划 */}
                  {analysisResult.todos && analysisResult.todos.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>📋 TODO列表（{analysisResult.todos.length}个任务）：</Text>
                        <Button 
                          type="link" 
                          size="small"
                          onClick={() => setTodoExpanded(!todoExpanded)}
                          style={{ padding: 0, height: 'auto' }}
                        >
                          {todoExpanded ? '收起' : '展开'}
                        </Button>
                      </div>
                      {todoExpanded && (
                        <div style={{ marginTop: 8 }}>
                          {analysisResult.todos.map((todo: any, index: number) => (
                            <div key={index} style={{
                              padding: 12,
                              margin: '6px 0',
                              background: '#f6ffed',
                              border: '1px solid #d9f7be',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10
                            }}>
                              <div style={{ 
                                minWidth: 20, 
                                height: 20, 
                                borderRadius: '50%', 
                                background: '#52c41a', 
                                color: 'white', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: 12,
                                fontWeight: 'bold',
                                marginTop: 2
                              }}>
                                {index + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <Tag color={
                                    todo.priority === 'high' ? 'red' : 
                                    todo.priority === 'medium' ? 'orange' : 'green'
                                  }>
                                    {todo.priority === 'high' ? '🔴 高' : 
                                     todo.priority === 'medium' ? '🟡 中' : '🟢 低'}优先级
                                  </Tag>
                                </div>
                                <Text style={{ lineHeight: 1.5 }}>{todo.content}</Text>
                              </div>
                            </div>
                          ))}
                          <div style={{ 
                            marginTop: 8, 
                            padding: 8, 
                            background: '#e6f7ff', 
                            borderRadius: 4, 
                            fontSize: 12 
                          }}>
                            <Text type="secondary">
                              💡 提示：这些任务将在保存后自动添加到您的记录中
                            </Text>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 情感分析 */}
                  {analysisResult.sentiment && (
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>😊 情感倾向：</Text>
                      <Tag 
                        color={
                          analysisResult.sentiment === 'positive' ? 'green' :
                          analysisResult.sentiment === 'negative' ? 'red' : 'blue'
                        }
                        style={{ marginLeft: 8 }}
                      >
                        {analysisResult.sentiment === 'positive' ? '积极' :
                         analysisResult.sentiment === 'negative' ? '消极' : '中性'}
                      </Tag>
                      {analysisResult.confidence && (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          置信度: {(analysisResult.confidence * 100).toFixed(1)}%
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={{ textAlign: 'right', marginTop: 24 }}>
              <Space>
                <Button onClick={handleClose}>
                  取消
                </Button>
                <Button onClick={handleSaveWithoutAnalysis}>
                  直接保存
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleAnalyzeAndSave}
                  loading={isAnalyzing}
                >
                  智能分析并保存
                </Button>
              </Space>
            </div>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={getModalTitle()}
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={650}
      centered
      destroyOnClose={false}
    >
      {error && (
        <Alert
          message="录音错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {renderContent()}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Modal>
  );
} 