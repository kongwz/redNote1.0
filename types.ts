export interface RedNoteOption {
  id: string;
  title: string;
  content: string;
  tags: string[];
  reasoning: string; // Why this works for CTR/Traffic
}

export type GenerationMode = 'custom' | 'imitate';
export type ImitateSource = 'text' | 'link';

export interface GenerationSettings {
  mode: GenerationMode;
  imitateSource: ImitateSource;
  tone: 'authentic' | 'emotional' | 'informative' | 'humorous' | 'news';
  audience: 'general' | 'students' | 'office_workers' | 'parents' | 'couples' | 'photographers' | 'young_women';
  referenceContent?: string; // Content to mimic (text)
  referenceUrl?: string; // URL to mimic
}

export type ModelProvider = 'gemini' | 'deepseek';

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EXTRACTING = 'EXTRACTING', // New state for scraping
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface UploadedImage {
  file: File;
  previewUrl: string;
  base64: string;
}

export interface AppConfig {
  serverUrl: string; // Backend server URL
}