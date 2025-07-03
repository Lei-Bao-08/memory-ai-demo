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
      
      // 检查和选择最佳音频格式 - 兼容iOS Safari
      let mimeType = '';
      let audioType = 'audio/wav';
      
      console.log('🎵 检测浏览器支持的音频格式...');
      
      // 检测是否为iOS Safari
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
      
      if (isIOSSafari) {
        console.log('📱 检测到iOS Safari浏览器');
        // iOS Safari优先尝试支持的格式
        const iosFormats = [
          { mime: 'audio/wav', type: 'audio/wav', name: 'WAV' },
          { mime: 'audio/mp4', type: 'audio/mp4', name: 'MP4' },
          { mime: 'audio/m4a', type: 'audio/m4a', name: 'M4A' },
          { mime: 'audio/aac', type: 'audio/aac', name: 'AAC' }
        ];
        
        for (const format of iosFormats) {
          if (MediaRecorder.isTypeSupported(format.mime)) {
            mimeType = format.mime;
            audioType = format.type;
            console.log(`✅ iOS Safari选择格式: ${format.name} (${format.mime})`);
            break;
          }
        }
        
        if (!mimeType) {
          console.log('🔄 iOS Safari使用默认格式');
          mimeType = '';
          audioType = 'audio/mp4'; // iOS默认格式
        }
      } else {
        // 非iOS Safari浏览器，优先选择WAV格式
        if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
          audioType = 'audio/wav';
          console.log('✅ 选择音频格式: WAV (最佳兼容性)');
        } else {
          console.error('❌ 浏览器不支持WAV格式录音');
          setState((prev: RecordingState) => ({ 
            ...prev, 
            isRecording: false, 
            error: '当前浏览器不支持WAV格式录音，请使用Chrome或Edge浏览器' 
          }));
          
          // 停止媒体流
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            streamRef.current = null;
          }
          return;
        }
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