export interface Recording {
  id: string;
  title: string;
  content: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
  analysis?: AnalysisResult;
}

export interface AnalysisResult {
  title?: string;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  confidence: number;
  todos?: TodoItem[];
}

export interface TodoItem {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
} 