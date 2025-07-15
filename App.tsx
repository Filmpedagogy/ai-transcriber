
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { transcribeAudio, summarizeTranscript } from './services/geminiService';
import type { TranscriptionOptions, Transcript, TranscriptSegment, SummaryOptions } from './types';

// --- ICONS (as functional components) ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path></svg>
);

const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>{`.spinner_V8m1{transform-origin:center;animation:spinner_zKoa 2s linear infinite}.spinner_zKoa{animation-duration:1s}@keyframes spinner_zKoa{100%{transform:rotate(360deg)}}`}</style><path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"></path><path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" className="spinner_V8m1"></path></svg>
);

// --- HELPER FUNCTIONS ---
const saveAs = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<TranscriptionOptions>({ diarization: true, timestamps: true });
  const [allOptions, setAllOptions] = useState(true);
  const [transcriptData, setTranscriptData] = useState<Transcript | null>(null);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    keyPoints: true,
    taskList: false,
    preserveLanguage: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueSpeakers = useMemo(() => {
    if (!transcriptData || !options.diarization) return [];
    const speakers = new Set<string>();
    transcriptData.forEach(segment => {
      if (segment.speaker) speakers.add(segment.speaker);
    });
    return Array.from(speakers);
  }, [transcriptData, options.diarization]);

  const formattedTranscript = useMemo(() => {
    if (!transcriptData) return '';
    return transcriptData.map(segment => {
        let line = '';
        if (options.timestamps && segment.timestamp) {
            line += `${segment.timestamp} `;
        }
        if (options.diarization && segment.speaker) {
            line += `${speakerNames[segment.speaker] || segment.speaker}: `;
        }
        line += segment.text;
        return line;
    }).join('\n');
  }, [transcriptData, options, speakerNames]);

  useEffect(() => {
    if (formattedTranscript) {
        setEditedTranscript(formattedTranscript);
    }
  }, [formattedTranscript]);
  
  useEffect(() => {
    if (allOptions) {
        setOptions({ diarization: true, timestamps: true });
    }
  }, [allOptions]);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setFile(files[0]);
      setTranscriptData(null);
      setEditedTranscript('');
      setError(null);
      setSpeakerNames({});
      setSummary(null);
      setSummaryError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files);
  };

  const handleTranscribe = useCallback(async () => {
    if (!file) {
        setError('Please select a file first.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setTranscriptData(null);
    try {
        const transcript = await transcribeAudio(file, options);
        setTranscriptData(transcript);
    } catch (err) {
        setError('Failed to transcribe the audio. Please try again.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [file, options]);
  
  const handleOptionChange = (option: keyof TranscriptionOptions) => {
    if (allOptions) return;
    setOptions(prev => ({...prev, [option]: !prev[option]}));
  };

  const handleAllOptionChange = () => {
    setAllOptions(prev => !prev);
  };

  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setSpeakerNames(prev => ({ ...prev, [speakerId]: name }));
  };

  const handleExportTxt = () => {
    const blob = new Blob([editedTranscript], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${file?.name.split('.')[0]}_transcript.txt`);
  };

  const handleExportDocx = () => {
    // Uses docx.js from CDN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Docx = (window as any).Docx;
    
    if (!Docx) {
        setError("DOCX library not found. It might be blocked by an ad-blocker or a network issue.");
        return;
    }

    const { Document, Packer, Paragraph } = Docx;

    const doc = new Document({
        sections: [{
            children: editedTranscript.split('\n').map(p => new Paragraph({ text: p })),
        }],
    });
    Packer.toBlob(doc).then((blob: Blob) => {
        saveAs(blob, `${file?.name.split('.')[0]}_transcript.docx`);
    }).catch((err: Error) => {
        setError("Failed to create DOCX file.");
        console.error(err);
    });
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editedTranscript)
        .then(() => alert('Copied to clipboard! You can now paste it into Google Docs.'))
        .catch(() => alert('Failed to copy to clipboard.'));
  };
  
  const handleSummaryOptionChange = (option: keyof SummaryOptions) => {
    setSummaryOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };
  
  const handleSummarize = useCallback(async () => {
    if (!editedTranscript) {
        setSummaryError('The transcript is empty.');
        return;
    }
    if (!summaryOptions.keyPoints && !summaryOptions.taskList) {
        setSummaryError('Please select at least "Summarize key points" or "Make a task list".');
        return;
    }

    setIsSummarizing(true);
    setSummary(null);
    setSummaryError(null);

    try {
        const result = await summarizeTranscript(editedTranscript, summaryOptions);
        setSummary(result);
    } catch (err) {
        setSummaryError('Failed to generate summary. Please try again.');
        console.error(err);
    } finally {
        setIsSummarizing(false);
    }
  }, [editedTranscript, summaryOptions]);
  
  const handleExportSummaryTxt = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${file?.name.split('.')[0]}_summary.txt`);
  };

  const handleExportSummaryDocx = () => {
    if (!summary) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Docx = (window as any).Docx;
    
    if (!Docx) {
        setSummaryError("DOCX library not found. It might be blocked by an ad-blocker or a network issue.");
        return;
    }

    const { Document, Packer, Paragraph } = Docx;

    const doc = new Document({
        sections: [{
            children: summary.split('\n').map(p => new Paragraph({ text: p })),
        }],
    });
    Packer.toBlob(doc).then((blob: Blob) => {
        saveAs(blob, `${file?.name.split('.')[0]}_summary.docx`);
    }).catch((err: Error) => {
        setSummaryError("Failed to create DOCX file.");
        console.error(err);
    });
  };

  const handleCopySummaryToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary)
        .then(() => alert('Summary copied to clipboard! You can now paste it into Google Docs.'))
        .catch(() => alert('Failed to copy summary to clipboard.'));
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-brand-text sm:text-5xl">
            AI Audio/Video Transcriber
          </h1>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Upload your media, select transcription options, and get your text in minutes.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-8">
            {/* 1. File Upload */}
            <div className="bg-brand-surface rounded-lg p-6 border border-brand-border">
              <h2 className="text-xl font-semibold mb-4">1. Upload File</h2>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-brand-border rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
                aria-label="File upload area"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                  accept="audio/*,video/*"
                />
                <UploadIcon className="h-12 w-12 text-brand-text-secondary" />
                <p className="mt-4 text-center text-brand-text-secondary">
                  Drag & drop your file here, or click to select
                </p>
              </div>
              {file && (
                <div className="mt-4 flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-6 w-6 text-brand-primary" />
                    <span className="font-mono text-sm truncate">{file.name}</span>
                  </div>
                  <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-300 font-bold" aria-label="Remove selected file">&times;</button>
                </div>
              )}
            </div>

            {/* 2. Options */}
            <div className="bg-brand-surface rounded-lg p-6 border border-brand-border">
                <h2 className="text-xl font-semibold mb-4">2. Set Options</h2>
                <div className="space-y-4">
                    {[
                        { id: 'all', label: 'All of the above' },
                        { id: 'diarization', label: 'Recognize speakers (Diarization)' },
                        { id: 'timestamps', label: 'Include timestamps' },
                    ].map(item => (
                        <label key={item.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={item.id === 'all' ? allOptions : options[item.id as keyof TranscriptionOptions]}
                                onChange={() => item.id === 'all' ? handleAllOptionChange() : handleOptionChange(item.id as keyof TranscriptionOptions)}
                                disabled={item.id !== 'all' && allOptions}
                                className="h-5 w-5 rounded bg-brand-border border-gray-500 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>{item.label}</span>
                        </label>
                    ))}
                </div>
            </div>
            
            {/* Transcribe Button */}
            <button
              onClick={handleTranscribe}
              disabled={!file || isLoading}
              className="w-full flex items-center justify-center text-lg font-bold bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? (
                  <>
                      <Spinner className="h-6 w-6 mr-3 spinner_V8m1" />
                      Transcribing...
                  </>
              ) : 'Transcribe File'}
            </button>

             {error && <div role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}

          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-8">
            {/* Transcript Card */}
            <div className="bg-brand-surface rounded-lg p-6 border border-brand-border min-h-[600px] flex flex-col">
              <h2 className="text-xl font-semibold mb-4">3. Review & Export Transcript</h2>
              
              {uniqueSpeakers.length > 0 && (
                <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold mb-2">Assign Speaker Names</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {uniqueSpeakers.map(speakerId => (
                      <div key={speakerId} className="flex items-center gap-2">
                        <label htmlFor={speakerId} className="font-mono text-sm text-brand-text-secondary">{speakerId}:</label>
                        <input
                          type="text"
                          id={speakerId}
                          placeholder="Enter name..."
                          value={speakerNames[speakerId] || ''}
                          onChange={(e) => handleSpeakerNameChange(speakerId, e.target.value)}
                          className="w-full bg-brand-border px-2 py-1 rounded-md focus:ring-2 focus:ring-brand-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                placeholder={
                    isLoading ? "Your transcript is being generated..." :
                    !transcriptData ? "Your transcript will appear here..." : ""
                }
                readOnly={!transcriptData && !isLoading}
                className="flex-grow w-full bg-gray-900 rounded-md p-4 font-mono text-sm leading-6 border border-brand-border focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none"
                aria-label="Transcript editor"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={handleExportTxt} disabled={!editedTranscript} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Export .txt</button>
                  <button onClick={handleExportDocx} disabled={!editedTranscript} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Export .docx</button>
                  <button onClick={handleCopyToClipboard} disabled={!editedTranscript} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Copy for Google Docs</button>
              </div>
            </div>

            {/* Summary Card */}
            {transcriptData && !isLoading && (
              <div className="bg-brand-surface rounded-lg p-6 border border-brand-border">
                <h2 className="text-xl font-semibold mb-4">4. Create a Summary</h2>
                <p className="text-brand-text-secondary mb-4">
                    Generate a summary from your edited transcript above. Choose your desired options and click generate.
                </p>

                <div className="space-y-3 mb-6">
                    <h3 className="font-semibold text-brand-text-secondary">Summary Options</h3>
                    {[
                        { id: 'keyPoints', label: 'Summarize key points' },
                        { id: 'taskList', label: 'Make a task list' },
                        { id: 'preserveLanguage', label: 'Preserve the language of the transcript' },
                    ].map(item => (
                        <label key={item.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={summaryOptions[item.id as keyof SummaryOptions]}
                                onChange={() => handleSummaryOptionChange(item.id as keyof SummaryOptions)}
                                className="h-5 w-5 rounded bg-brand-border border-gray-500 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>{item.label}</span>
                        </label>
                    ))}
                </div>

                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing || !editedTranscript}
                  className="w-full flex items-center justify-center text-lg font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg transition-colors"
                >
                  {isSummarizing ? (
                      <>
                          <Spinner className="h-6 w-6 mr-3 spinner_V8m1" />
                          Generating Summary...
                      </>
                  ) : 'Generate Summary'}
                </button>

                {summaryError && <div role="alert" className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{summaryError}</div>}
                
                {summary && (
                    <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-brand-border">
                        <h3 className="text-lg font-semibold mb-3 text-brand-text">Summary Result</h3>
                        <div className="whitespace-pre-wrap text-brand-text-secondary text-sm font-mono leading-relaxed">
                            {summary}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button onClick={handleExportSummaryTxt} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Export .txt</button>
                            <button onClick={handleExportSummaryDocx} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Export .docx</button>
                            <button onClick={handleCopySummaryToClipboard} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Copy for Google Docs</button>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
