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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
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