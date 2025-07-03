export interface AzureSpeechConfig {
  subscriptionKey: string;
  region: string;
  language: string;
}

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  language: string;
}

export interface TextAnalysisResult {
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  confidence: number;
} 