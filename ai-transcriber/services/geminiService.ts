import type { TranscriptionOptions, Transcript, SummaryOptions } from '../types';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// This function calls our secure Netlify function for transcription.
export const transcribeAudio = async (
  file: File,
  options: TranscriptionOptions
): Promise<Transcript> => {
  const fileData = await fileToBase64(file);
  const mimeType = file.type;

  const response = await fetch('/.netlify/functions/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileData, mimeType, options }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'The transcription request failed.');
  }

  const transcript = await response.json();
  return transcript as Transcript;
};

// This function calls our secure Netlify function to summarize a transcript.
export const summarizeTranscript = async (
  transcript: string,
  options: SummaryOptions
): Promise<string> => {
  const response = await fetch('/.netlify/functions/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, options }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'The summary request failed.');
  }

  const result = await response.json();
  return result.summary;
};
