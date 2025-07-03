'use client';

import { useState, useRef, useCallback } from 'react';
import { RecordingState } from '@/app/types/recording';

export const useRecording = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    audioBlob: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setState((prev: RecordingState) => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      
      // 检查和选择最佳音频格式
      let mimeType = '';
      let audioType = 'audio/wav';
      
      console.log('🎵 检测浏览器支持的音频格式...');
      
      // 优先尝试支持的格式列表
      const formatOptions = [
        { mime: 'audio/wav', type: 'audio/wav', name: 'WAV' },
        { mime: 'audio/mp4', type: 'audio/mp4', name: 'MP4' },
        { mime: 'audio/webm;codecs=pcm', type: 'audio/webm', name: 'WebM PCM' },
        { mime: 'audio/webm', type: 'audio/webm', name: 'WebM' },
        { mime: 'audio/ogg;codecs=opus', type: 'audio/ogg', name: 'OGG Opus' }
      ];
      
      let selectedFormat = null;
      for (const format of formatOptions) {
        if (MediaRecorder.isTypeSupported(format.mime)) {
          selectedFormat = format;
          mimeType = format.mime;
          audioType = format.type;
          console.log(`✅ 选择音频格式: ${format.name} (${format.mime})`);
          break;
        } else {
          console.log(`❌ 不支持格式: ${format.name} (${format.mime})`);
        }
      }
      
      if (!selectedFormat) {
        console.log('⚠️ 所有预设格式都不支持，使用默认格式');
        mimeType = '';
        audioType = 'audio/webm'; // 大多数现代浏览器的默认格式
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: audioType });
        setState((prev: RecordingState) => ({ 
          ...prev, 
          isRecording: false, 
          audioBlob,
          isProcessing: true 
        }));
        
        // 停止所有轨道
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      setState((prev: RecordingState) => ({ 
        ...prev, 
        isRecording: true, 
        duration: 0,
        audioBlob: null 
      }));
      
      // 开始计时
      const startTime = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setState((prev: RecordingState) => ({ ...prev, duration }));
      }, 1000);
      
    } catch (error) {
      console.error('录音启动失败:', error);
      setState((prev: RecordingState) => ({ 
        ...prev, 
        error: '无法访问麦克风，请检查权限设置' 
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // 清除计时器
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state.isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // 清除计时器
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      // 停止所有轨道
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
      }
      
      setState({
        isRecording: false,
        isProcessing: false,
        duration: 0,
        audioBlob: null,
        error: null,
      });
    }
  }, [state.isRecording]);

  const resetRecording = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      duration: 0,
      audioBlob: null,
      error: null,
    });
  }, []);

  // 格式化时间显示
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
    formatDuration,
  };
}; 