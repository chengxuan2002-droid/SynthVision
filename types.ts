export enum ModelType {
  GEMINI = 'GEMINI',
  OPENAI_COMPATIBLE = 'OPENAI_COMPATIBLE'
}

export interface ModelConfig {
  id: string;
  name: string;
  type: ModelType;
  endpoint?: string; // For OpenAI compatible
  apiKey?: string; // For OpenAI compatible (user provided)
  modelId: string; // The actual model string ID sent to API
}

export interface GeneratedImage {
  id: string;
  url: string; // Base64 or remote URL
  prompt: string;
  timestamp: number;
  tags: string[]; // Added tags for filtering
}

export interface Session {
  id: string;
  name: string;
  basePrompt: string;
  referenceImages: string[]; // Base64 strings
  generatedImages: GeneratedImage[];
  generatedPrompts: string[];
  createdAt: number;
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'stopped';
  totalTarget: number;
  progress: number;
  logs: string[];
}

export interface GenerationSettings {
  count: number;
  modelId: string;
  expandPrompts: boolean;
}