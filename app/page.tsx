'use client';

import { useState, useEffect } from 'react';
import { Typography, Button, Card, Space, Alert, Spin, Tag, List, Avatar, Input, Empty } from 'antd';
import { 
  AudioOutlined, 
  StopOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  SettingOutlined,
  SearchOutlined,
  CameraOutlined
} from '@ant-design/icons';
import { useRecording } from './hooks/useRecording';
import { Recording } from './types/recording';
import RecordingModal from './components/RecordingModal';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;

interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  dueDate?: Date;
}

interface AISuggestion {
  id: string;
  title: string;
  content: string;
  type: 'reminder' | 'task' | 'insight';
  createdAt: Date;
}

interface UpcomingItem {
  id: string;
  title: string;
  time: Date;
  type: 'meeting' | 'task' | 'event';
}

export default function HomePage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isAnalyzingSuggestions, setIsAnalyzingSuggestions] = useState(false);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // UI控制变量 - 隐藏不需要的功能
  const showQuickActions = false; // API测试和流式识别按钮
  const showUpcomingSection = false; // Up coming卡片
  const showCameraButton = false; // 拍照按钮

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

  // 搜索功能
  useEffect(() => {
    if (searchKeyword.trim()) {
      const filtered = recordings.filter(recording => 
        recording.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        recording.content.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setFilteredRecordings(filtered);
    } else {
      setFilteredRecordings(recordings);
    }
  }, [searchKeyword, recordings]);

  // 模拟AI建议生成
  useEffect(() => {
    if (recordings.length > 0) {
      setIsAnalyzingSuggestions(true);
      // 模拟AI分析延迟
      setTimeout(() => {
        const suggestions: AISuggestion[] = [
          {
            id: '1',
            title: '今日工作总结',
            content: '根据您的录音记录，建议整理今天的工作重点和明天的计划',
            type: 'task',
            createdAt: new Date()
          },
          {
            id: '2', 
            title: '定期回顾提醒',
            content: '您已经积累了多条记录，建议定期回顾和整理',
            type: 'reminder',
            createdAt: new Date()
          }
        ];
        setAiSuggestions(suggestions);
        setIsAnalyzingSuggestions(false);
      }, 2000);
    }
  }, [recordings.length]);

  // 模拟即将到来的事项
  useEffect(() => {
    const upcoming: UpcomingItem[] = [
      {
        id: '1',
        title: '周例会',
        time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
        type: 'meeting'
      },
      {
        id: '2',
        title: '项目提交截止',
        time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        type: 'task'
      }
    ];
    setUpcomingItems(upcoming);
  }, []);

  const handleRecordingComplete = (newRecording: Recording) => {
    setRecordings(prev => [newRecording, ...prev]);
    setShowRecordingModal(false);
  };

  const handleStartRecording = () => {
    setShowRecordingModal(true);
  };

  const handleAudioControl = (recording: Recording) => {
    if (playingRecordingId === recording.id && currentAudio) {
      // 停止当前播放
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setPlayingRecordingId(null);
      setCurrentAudio(null);
    } else {
      // 停止之前的音频（如果有）
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // 开始播放新音频
      const audio = new Audio(recording.audioUrl);
      audio.onended = () => {
        setPlayingRecordingId(null);
        setCurrentAudio(null);
      };
      audio.onpause = () => {
        setPlayingRecordingId(null);
        setCurrentAudio(null);
      };
      
      audio.play().then(() => {
        setPlayingRecordingId(recording.id);
        setCurrentAudio(audio);
      }).catch((error) => {
        console.error('音频播放失败:', error);
      });
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'reminder': return '⏰';
      case 'task': return '📋';
      case 'insight': return '💡';
      default: return '🤖';
    }
  };

  const getUpcomingIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '🤝';
      case 'task': return '📝';
      case 'event': return '📅';
      default: return '📌';
    }
  };

  const getTimeUntil = (time: Date) => {
    const now = new Date();
    const diff = time.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟后`;
    } else if (minutes > 0) {
      return `${minutes}分钟后`;
    } else {
      return '即将开始';
    }
  };

  return (
    <div className="app-container" style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      paddingBottom: 100 // 为浮动按钮留出空间
    }}>
      {/* 头部区域 */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px 20px',
        borderRadius: '0 0 20px 20px',
        marginBottom: 20
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={1} style={{ 
            color: 'white', 
            marginBottom: 16, 
            textAlign: 'center',
            fontSize: 28
          }}>
            🧠 Life Memory
          </Title>
          
          {/* 搜索框 */}
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Input
              placeholder="搜索记录..."
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                borderRadius: 25,
              }}
            />
          </div>

          {/* 快捷操作 */}
          {showQuickActions && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Space>
              <Link href="/test">
                <Button 
                  ghost 
                  icon={<SettingOutlined />}
                  style={{ borderRadius: 20 }}
                >
                  API测试
                </Button>
              </Link>
              <Link href="/streaming">
                <Button 
                  ghost 
                  icon={<AudioOutlined />}
                  style={{ borderRadius: 20 }}
                >
                  流式识别
                </Button>
              </Link>
            </Space>
          </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        {/* AI建议区块 */}
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span>Copilot suggestion</span>
            </div>
          }
          style={{ 
            marginBottom: 20, 
            borderRadius: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          styles={{ body: { padding: 16 } }}
        >
          {isAnalyzingSuggestions ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="small" />
              <Text style={{ marginLeft: 8 }}>分析您的记录中...</Text>
            </div>
          ) : aiSuggestions.length > 0 ? (
            <List
              size="small"
              dataSource={aiSuggestions}
              renderItem={(suggestion) => (
                <List.Item className="ai-suggestion-item">
                  <List.Item.Meta
                    avatar={<span style={{ fontSize: 18 }}>{getSuggestionIcon(suggestion.type)}</span>}
                    title={<Text strong>{suggestion.title}</Text>}
                    description={suggestion.content}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Text type="secondary">开始录制记录，AI将为您提供智能建议</Text>
            </div>
          )}
        </Card>

        {/* 即将到来区块 */}
        {showUpcomingSection && (
        <Card 
          title="📅 Up coming"
          style={{ 
            marginBottom: 20, 
            borderRadius: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          styles={{ body: { padding: 16 } }}
        >
          {upcomingItems.length > 0 ? (
            <List
              size="small"
              dataSource={upcomingItems}
              renderItem={(item) => (
                <List.Item style={{ border: 'none', padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={<span style={{ fontSize: 18 }}>{getUpcomingIcon(item.type)}</span>}
                    title={<Text strong>{item.title}</Text>}
                    description={
                      <Text type="secondary">
                        {getTimeUntil(item.time)} • {item.time.toLocaleString()}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              image={<span style={{ fontSize: 32 }}>📅</span>}
              description="暂无即将到来的事项"
              style={{ padding: 20 }}
            />
          )}
        </Card>
        )}

        {/* 记录列表 */}
        <Card 
          title="📝 记录列表"
          style={{ 
            borderRadius: 15,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          styles={{ body: { padding: 16 } }}
        >
          {filteredRecordings.length > 0 ? (
            <List
              dataSource={filteredRecordings}
              renderItem={(recording) => (
                <List.Item
                  className="record-item"
                  style={{ padding: 16 }}
                  actions={[
                    <Button 
                      type="text" 
                      size="small" 
                      icon={playingRecordingId === recording.id ? <StopOutlined /> : <PlayCircleOutlined />}
                      onClick={() => handleAudioControl(recording)}
                      style={{
                        color: playingRecordingId === recording.id ? '#ff4d4f' : '#1890ff'
                      }}
                    >
                      {playingRecordingId === recording.id ? '停止' : '播放'}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<FileTextOutlined />} 
                        style={{ backgroundColor: '#1890ff' }}
                      />
                    }
                    title={
                      <div>
                        <Text strong>{recording.title}</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {formatDuration(recording.duration)}
                        </Tag>
                        {recording.analysis && (
                          <Tag color="green" style={{ marginLeft: 4 }}>
                            已分析
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <div>
                        {/* AI摘要（如果有） */}
                        {recording.analysis?.summary && (
                          <div style={{ 
                            marginBottom: 10, 
                            padding: 10, 
                            background: '#f0f9ff', 
                            borderRadius: 6,
                            border: '1px solid #e0f2fe'
                          }}>
                            <Text style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
                              📝 AI摘要：
                            </Text>
                            <Text style={{ fontSize: 13, color: '#1890ff', lineHeight: 1.5 }}>
                              {recording.analysis.summary}
                            </Text>
                          </div>
                        )}
                        
                        {/* 关键词标签 */}
                        {recording.analysis?.keywords && recording.analysis.keywords.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'block' }}>
                              🔖 关键词：
                            </Text>
                            <Space wrap size={[4, 4]}>
                              {recording.analysis.keywords.map((keyword: string, index: number) => (
                                <Tag key={index} color="geekblue" style={{ fontSize: 11 }}>
                                  {keyword}
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        )}

                        {/* TODO列表（如果有） */}
                        {recording.analysis?.todos && recording.analysis.todos.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, color: '#666', marginBottom: 6, display: 'block' }}>
                              📋 TODO列表：
                            </Text>
                            <div style={{ marginLeft: 16 }}>
                              {recording.analysis.todos.map((todo: any, index: number) => (
                                <div key={index} style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  marginBottom: 4,
                                  fontSize: 12,
                                  lineHeight: '1.4'
                                }}>
                                  <span style={{
                                    minWidth: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    backgroundColor: '#52c41a',
                                    color: 'white',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 8,
                                    marginTop: 1
                                  }}>
                                    {index + 1}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <Tag 
                                      color={
                                        todo.priority === 'high' ? 'red' : 
                                        todo.priority === 'medium' ? 'orange' : 'green'
                                      }
                                      style={{ 
                                        fontSize: 10, 
                                        marginRight: 6,
                                        padding: '0 4px',
                                        height: 18,
                                        lineHeight: '18px'
                                      }}
                                    >
                                      {todo.priority === 'high' ? '高' : 
                                       todo.priority === 'medium' ? '中' : '低'}
                                    </Tag>
                                    <Text style={{ fontSize: 12, color: '#333' }}>
                                      {todo.content}
                                    </Text>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Paragraph 
                          ellipsis={{ rows: 2, expandable: true }}
                          style={{ 
                            margin: '8px 0',
                            backgroundColor: playingRecordingId === recording.id ? '#e6f7ff' : 'transparent',
                            padding: playingRecordingId === recording.id ? '8px' : '0',
                            borderRadius: playingRecordingId === recording.id ? '4px' : '0',
                            border: playingRecordingId === recording.id ? '1px solid #1890ff' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {recording.content}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(recording.createdAt).toLocaleString()}
                          {playingRecordingId === recording.id && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                              正在播放
                            </Tag>
                          )}
                          {recording.analysis?.sentiment && (
                            <Tag 
                              color={
                                recording.analysis.sentiment === 'positive' ? 'green' :
                                recording.analysis.sentiment === 'negative' ? 'red' : 'blue'
                              }
                                                             style={{ marginLeft: 8, fontSize: 11 }}
                            >
                              {recording.analysis.sentiment === 'positive' ? '😊 积极' :
                               recording.analysis.sentiment === 'negative' ? '😔 消极' : '😐 中性'}
                            </Tag>
                          )}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty 
              image={<span style={{ fontSize: 48 }}>📝</span>}
              description={
                <div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                    开始您的第一条记录
                  </Text>
                  <Text type="secondary">
                    点击右下角的按钮创建录音记录
                  </Text>
                </div>
              }
              style={{ padding: 40 }}
            />
          )}
        </Card>
      </div>

      {/* 浮动操作按钮 */}
      <div style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 1000
      }}>
        {/* 拍照按钮 */}
        {showCameraButton && (
        <Button
          type="default"
          shape="circle"
          size="large"
          icon={<CameraOutlined />}
          style={{
            width: 56,
            height: 56,
            backgroundColor: '#52c41a',
            borderColor: '#52c41a',
            color: 'white',
            boxShadow: '0 4px 12px rgba(82, 196, 26, 0.4)',
          }}
          title="图片记录"
        />
        )}
        
        {/* 录音按钮（主要） */}
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<AudioOutlined />}
          onClick={handleStartRecording}
          style={{
            width: 64,
            height: 64,
            fontSize: 24,
            backgroundColor: '#1890ff',
            borderColor: '#1890ff',
            boxShadow: '0 4px 16px rgba(24, 144, 255, 0.4)',
          }}
          title="录音记录"
        />
      </div>

      {/* 录音模态框 */}
      <RecordingModal
        isOpen={showRecordingModal}
        onClose={() => setShowRecordingModal(false)}
        onSave={handleRecordingComplete}
      />
    </div>
  );
} 