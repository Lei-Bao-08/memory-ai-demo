'use client';

import { useState, useEffect } from 'react';
import { Card, Typography, Space, Alert, Button, Descriptions, Tag, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface StatusInfo {
  timestamp: string;
  environment: string;
  azureConfig: {
    hasKey: boolean;
    keyLength: number;
    hasRegion: boolean;
    region: string;
    isConfigured: boolean;
  };
  sdkStatus: {
    sdkImported: boolean;
    hasAudioInputStream: boolean;
    hasSpeechConfig: boolean;
    hasAudioConfig: boolean;
    hasSpeechRecognizer: boolean;
    hasResultReason: boolean;
    hasCancellationReason: boolean;
  };
  audioConverter: {
    hasFFmpeg: boolean;
    tempDir: string;
    error?: string;
  };
  speechConfigTest: {
    success: boolean;
    speechRecognitionLanguage?: string;
    speechSynthesisLanguage?: string;
    error?: string;
  };
  nodeEnv: {
    version: string;
    platform: string;
    arch: string;
    memoryUsage: any;
    uptime: number;
  };
}

export default function StatusPage() {
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/debug/speech');
      if (!res.ok) {
        throw new Error(`状态检查失败: ${res.status}`);
      }
      const data = await res.json();
      setStatusInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusColor = (condition: boolean) => condition ? 'green' : 'red';
  const getStatusIcon = (condition: boolean) => condition ? <CheckCircleOutlined /> : <CloseCircleOutlined />;

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在检查语音服务状态...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="状态检查失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchStatus}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (!statusInfo) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="无法获取状态信息" type="warning" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2}>🔍 语音服务状态检查</Title>
      <Text type="secondary">检查Azure语音服务的配置和状态</Text>
      
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchStatus}
          loading={loading}
        >
          刷新状态
        </Button>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 总体状态 */}
        <Card title="📊 总体状态">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Azure配置: </Text>
              <Tag color={getStatusColor(statusInfo.azureConfig.isConfigured)} icon={getStatusIcon(statusInfo.azureConfig.isConfigured)}>
                {statusInfo.azureConfig.isConfigured ? '正常' : '配置不完整'}
              </Tag>
            </div>
            <div>
              <Text strong>SDK状态: </Text>
              <Tag color={getStatusColor(statusInfo.sdkStatus.sdkImported)} icon={getStatusIcon(statusInfo.sdkStatus.sdkImported)}>
                {statusInfo.sdkStatus.sdkImported ? '已导入' : '导入失败'}
              </Tag>
            </div>
            <div>
              <Text strong>语音配置测试: </Text>
              <Tag color={getStatusColor(statusInfo.speechConfigTest.success)} icon={getStatusIcon(statusInfo.speechConfigTest.success)}>
                {statusInfo.speechConfigTest.success ? '通过' : '失败'}
              </Tag>
            </div>
            <div>
              <Text strong>音频转换器: </Text>
              <Tag color={getStatusColor(statusInfo.audioConverter.hasFFmpeg)} icon={getStatusIcon(statusInfo.audioConverter.hasFFmpeg)}>
                {statusInfo.audioConverter.hasFFmpeg ? 'FFmpeg可用' : 'FFmpeg不可用'}
              </Tag>
            </div>
          </Space>
        </Card>

        {/* Azure配置详情 */}
        <Card title="🔑 Azure配置">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="密钥配置">
              <Tag color={getStatusColor(statusInfo.azureConfig.hasKey)}>
                {statusInfo.azureConfig.hasKey ? `已配置 (${statusInfo.azureConfig.keyLength}字符)` : '未配置'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="区域配置">
              <Tag color={getStatusColor(statusInfo.azureConfig.hasRegion)}>
                {statusInfo.azureConfig.hasRegion ? statusInfo.azureConfig.region : '未配置'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="配置状态">
              <Tag color={getStatusColor(statusInfo.azureConfig.isConfigured)}>
                {statusInfo.azureConfig.isConfigured ? '完整' : '不完整'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* SDK状态详情 */}
        <Card title="📦 SDK组件状态">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="SDK导入">
              <Tag color={getStatusColor(statusInfo.sdkStatus.sdkImported)} icon={getStatusIcon(statusInfo.sdkStatus.sdkImported)}>
                {statusInfo.sdkStatus.sdkImported ? '成功' : '失败'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="AudioInputStream">
              <Tag color={getStatusColor(statusInfo.sdkStatus.hasAudioInputStream)} icon={getStatusIcon(statusInfo.sdkStatus.hasAudioInputStream)}>
                {statusInfo.sdkStatus.hasAudioInputStream ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="SpeechConfig">
              <Tag color={getStatusColor(statusInfo.sdkStatus.hasSpeechConfig)} icon={getStatusIcon(statusInfo.sdkStatus.hasSpeechConfig)}>
                {statusInfo.sdkStatus.hasSpeechConfig ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="AudioConfig">
              <Tag color={getStatusColor(statusInfo.sdkStatus.hasAudioConfig)} icon={getStatusIcon(statusInfo.sdkStatus.hasAudioConfig)}>
                {statusInfo.sdkStatus.hasAudioConfig ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="SpeechRecognizer">
              <Tag color={getStatusColor(statusInfo.sdkStatus.hasSpeechRecognizer)} icon={getStatusIcon(statusInfo.sdkStatus.hasSpeechRecognizer)}>
                {statusInfo.sdkStatus.hasSpeechRecognizer ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="ResultReason">
              <Tag color={getStatusColor(statusInfo.sdkStatus.hasResultReason)} icon={getStatusIcon(statusInfo.sdkStatus.hasResultReason)}>
                {statusInfo.sdkStatus.hasResultReason ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 语音配置测试 */}
        <Card title="🎤 语音配置测试">
          {statusInfo.speechConfigTest.success ? (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="测试结果">
                <Tag color="green" icon={<CheckCircleOutlined />}>通过</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="识别语言">
                {statusInfo.speechConfigTest.speechRecognitionLanguage || '未设置'}
              </Descriptions.Item>
              <Descriptions.Item label="合成语言">
                {statusInfo.speechConfigTest.speechSynthesisLanguage || '未设置'}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert
              message="语音配置测试失败"
              description={statusInfo.speechConfigTest.error}
              type="error"
              showIcon
            />
          )}
        </Card>

        {/* 音频转换器 */}
        <Card title="🔄 音频转换器">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="FFmpeg状态">
              <Tag color={getStatusColor(statusInfo.audioConverter.hasFFmpeg)} icon={getStatusIcon(statusInfo.audioConverter.hasFFmpeg)}>
                {statusInfo.audioConverter.hasFFmpeg ? '可用' : '不可用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="临时目录">
              {statusInfo.audioConverter.tempDir}
            </Descriptions.Item>
            {statusInfo.audioConverter.error && (
              <Descriptions.Item label="错误信息">
                <Text type="danger">{statusInfo.audioConverter.error}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* 环境信息 */}
        <Card title="💻 环境信息">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Node.js版本">
              {statusInfo.nodeEnv.version}
            </Descriptions.Item>
            <Descriptions.Item label="平台">
              {statusInfo.nodeEnv.platform}
            </Descriptions.Item>
            <Descriptions.Item label="架构">
              {statusInfo.nodeEnv.arch}
            </Descriptions.Item>
            <Descriptions.Item label="运行时间">
              {Math.round(statusInfo.nodeEnv.uptime)}秒
            </Descriptions.Item>
            <Descriptions.Item label="环境">
              {statusInfo.environment}
            </Descriptions.Item>
            <Descriptions.Item label="检查时间">
              {new Date(statusInfo.timestamp).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 故障排除建议 */}
        <Card title="🔧 故障排除建议">
          <Space direction="vertical" style={{ width: '100%' }}>
            {!statusInfo.azureConfig.isConfigured && (
              <Alert
                message="Azure配置不完整"
                description="请在.env.local文件中设置AZURE_SPEECH_KEY和AZURE_SPEECH_REGION"
                type="warning"
                showIcon
              />
            )}
            
            {!statusInfo.sdkStatus.sdkImported && (
              <Alert
                message="SDK导入失败"
                description="请检查microsoft-cognitiveservices-speech-sdk是否正确安装"
                type="warning"
                showIcon
              />
            )}
            
            {!statusInfo.speechConfigTest.success && statusInfo.azureConfig.isConfigured && (
              <Alert
                message="语音配置测试失败"
                description="请检查Azure密钥和区域是否正确"
                type="warning"
                showIcon
              />
            )}
            
            {!statusInfo.audioConverter.hasFFmpeg && (
              <Alert
                message="FFmpeg不可用"
                description="建议安装FFmpeg以支持更多音频格式转换"
                type="info"
                showIcon
              />
            )}
            
            {statusInfo.azureConfig.isConfigured && statusInfo.sdkStatus.sdkImported && statusInfo.speechConfigTest.success && (
              <Alert
                message="配置正常"
                description="所有配置检查通过，语音服务应该可以正常工作"
                type="success"
                showIcon
              />
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
} 