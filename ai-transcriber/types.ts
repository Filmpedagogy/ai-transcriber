export interface TranscriptionOptions {
  diarization: boolean;
  timestamps: boolean;
}

export interface TranscriptSegment {
  speaker: string | null;
  timestamp: string | null;
  text: string;
}

export type Transcript = TranscriptSegment[];

export interface SummaryOptions {
  keyPoints: boolean;
  taskList: boolean;
  preserveLanguage: boolean;
}
