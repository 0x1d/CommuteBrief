
export interface Article {
  id: string;
  url?: string;
  title?: string;
  content: string;
  sources?: { uri: string; title: string }[];
}

export interface SummaryState {
  text: string;
  audioBlob?: Blob;
  isLoading: boolean;
  error?: string;
}

export enum BriefVoice {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export enum BriefLength {
  Short = 'short', // ~1 min
  Medium = 'medium', // ~3 mins
  Long = 'long' // ~5 mins
}
