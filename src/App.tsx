import React, { useState, useEffect, useRef } from 'react';
import { Play, Globe, FileText, Download, Loader2, Youtube, Languages, Sparkles, CheckCircle } from 'lucide-react';


interface TranscriptionSegment {
  timestamp: string;
  text: string;
}

interface ProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

function App() {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'transcription' | 'summary' | 'translation'>('transcription');
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentStep: '',
    progress: 0
  });

  const [results, setResults] = useState<{
    transcription: TranscriptionSegment[];
    summary: string;
    translation: string;
    videoTitle: string;
    videoDuration: string;
  } | null>(null);

  const isValidYouTubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  };


  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  const simulateProcessing = async () => {
  if (!isValidYouTubeUrl(url)) {
    alert('Please enter a valid YouTube URL');
    return;
  }

  setProcessingState({
    isProcessing: true,
    currentStep: 'Sending video URL to server...',
    progress: 10
  });

  try {
    // Step 1: Transcribe the video
    const formData = new FormData();
    formData.append('url', url);

    const transcriptRes = await fetch(
  `https://transcriptor-backend-3-dc5w.onrender.com/transcribe_test?url=${encodeURIComponent(url)}`,
  {
    method: 'GET'
  }
);

    if (!transcriptRes.ok) {
      throw new Error('Failed to fetch transcript');
    }

    const transcriptData = await transcriptRes.json();

    setProcessingState({
      isProcessing: true,
      currentStep: 'Formatting transcript...',
      progress: 40
    });

    const transcriptText = transcriptData.transcript || "";
    const transcriptArray: TranscriptionSegment[] = transcriptText
      .split('. ')
      .filter((s: string) => s.trim().length > 0)
      .map((sentence: string, index: number) => ({
        timestamp: `00:${(index * 15).toString().padStart(2, '0')}`,
        text: sentence.endsWith('.') ? sentence : sentence + '.'
      }));

    // Step 2: Send transcript for summarization
    setProcessingState({
      isProcessing: true,
      currentStep: 'Generating summary...',
      progress: 70
    });

    const summaryForm = new FormData();
    summaryForm.append('text', transcriptText);
    summaryForm.append('manual', 'true'); // or 'false' for only abstractive
    summaryForm.append('model_choice', '1'); // 0 = BART, 1 = T5

    const summaryRes = await fetch('https://transcriptor-backend-3-dc5w.onrender.com/summarize/', {
      method: 'POST',
      body: summaryForm
    });

    if (!summaryRes.ok) {
      throw new Error('Failed to summarize transcript');
    }

    const summaryData = await summaryRes.json();
    const summaryText = summaryData.summary || 'No summary generated.';

    setProcessingState({
      isProcessing: true,
      currentStep: 'Finishing up...',
      progress: 90
    });

    // Final result - with translation initialized to the original transcript
    setResults({
      videoTitle: transcriptData.title || "Transcribed Video",
      videoDuration: transcriptData.duration ? formatDuration(transcriptData.duration) : "Unknown",
      transcription: transcriptArray,
      summary: summaryText,
      translation: transcriptText, // Initially show the original transcription
    });

    setProcessingState({
      isProcessing: false,
      currentStep: '',
      progress: 100
    });

  } catch (error) {
    alert('Error: ' + (error as Error).message);
    setProcessingState({
      isProcessing: false,
      currentStep: '',
      progress: 0
    });
  }
};


  const fetchTranslation = async (destLanguage: string) => {
    if (!results) return;

    const formData = new FormData();
    formData.append('text', results.transcription.map(t => t.text).join(' '));
    formData.append('dest', destLanguage);

    try {
      const response = await fetch('https://transcriptor-backend-3-dc5w.onrender.com/translate/', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      setResults(prev => prev ? { ...prev, translation: data.translation } : null);
    } catch (error) {
      alert("Translation failed: " + (error as Error).message);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    fetchTranslation(newLang);
  };


  const downloadContent = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatTranscriptionForDownload = (segments: TranscriptionSegment[]) => {
    return segments.map(segment => `[${segment.timestamp}] ${segment.text}`).join('\n\n');
  };





  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-teal-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-full">
                  <Youtube className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
              YouTube{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Transcriptor
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform any YouTube video into accurate transcripts, intelligent summaries, and multilingual translations with AI-powered precision.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 mb-12">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>99% Accuracy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>20+ Languages</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Instant Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Free Download</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Enter YouTube URL to Get Started
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={processingState.isProcessing}
              />
            </div>
            <button
              onClick={simulateProcessing}
              disabled={processingState.isProcessing || !url}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
            >
              {processingState.isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Transcribe
                </>
              )}
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {processingState.isProcessing && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Processing Your Video</h3>
              <p className="text-gray-300 mb-4">{processingState.currentStep}</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">{Math.round(processingState.progress)}% Complete</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && !processingState.isProcessing && (
          <div className="space-y-8">
            {/* Video Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                  <Youtube className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{results.videoTitle}</h3>
                  <p className="text-gray-300">Duration: {results.videoDuration}</p>
                </div>
              </div>
            </div>








            {/* Tab Navigation */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20">
              <div className="flex border-b border-white/20">
                <button
                  onClick={() => setActiveTab('transcription')}
                  className={`flex-1 px-6 py-4 text-sm font-medium rounded-t-2xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'transcription'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b-2 border-blue-400'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Transcription
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'summary'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b-2 border-blue-400'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('translation')}
                  className={`flex-1 px-6 py-4 text-sm font-medium rounded-t-2xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === 'translation'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b-2 border-blue-400'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  Translation
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'transcription' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-white">Full Transcription</h4>
                      <button
                        onClick={() => downloadContent(formatTranscriptionForDownload(results.transcription), 'transcription.txt')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {results.transcription.map((segment, index) => (
                        <div key={index} className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                          <span className="text-blue-400 font-mono text-sm shrink-0">{segment.timestamp}</span>
                          <p className="text-gray-200 leading-relaxed">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-white">Summary</h4>
                      <button
                        onClick={() => downloadContent(results.summary, 'summary.txt')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-gray-200 leading-relaxed text-lg">{results.summary}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'translation' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Translation</h4>
                      <div className="flex items-center gap-3">
                        <select
                          value={selectedLanguage}
                          onChange={handleLanguageChange}
                          className="px-4 py-2 bg-white/20 border border-white/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                              {lang.flag} {lang.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => downloadContent(results.translation, 'translation.txt')}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-gray-200 leading-relaxed text-lg">{results.translation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}










        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Accurate Transcription</h3>
            <p className="text-gray-300">Speech recognition with 99% accuracy and timestamp precision.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Smart Summaries</h3>
            <p className="text-gray-300">Get key insights and main points extracted automatically.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Language Support</h3>
            <p className="text-gray-300">Translate content into 20+ languages with professional-grade accuracy.</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
<div className="grid md:grid-cols-3 gap-6 mt-16">
  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center hover:scale-105 transition-transform duration-300">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
      <FileText className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Accurate Transcription</h3>
    <p className="text-gray-300">Speech recognition with 99% accuracy and timestamp precision.</p>
  </div>

  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center hover:scale-105 transition-transform duration-300">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
      <Sparkles className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Smart Summaries</h3>
    <p className="text-gray-300">Get key insights and main points extracted automatically.</p>
  </div>

  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center hover:scale-105 transition-transform duration-300">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-fit mx-auto mb-4">
      <Globe className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Multi-Language Support</h3>
    <p className="text-gray-300">Translate content into 20+ languages with professional-grade accuracy.</p>
  </div>
</div>

  {/* Footer */}
  <footer className="relative mt-24 py-12 border-t border-white/10">
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
        </div>
        <p className="text-gray-400 text-sm font-medium tracking-wide">
          Made with ✨ by{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent font-semibold">
            Tapu Sena
          </span>
        </p>
        <div className="mt-4 flex justify-center">
          <div className="w-16 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full opacity-50"></div>
        </div>
      </div>
    </div>
  </footer>

    </div>
  );
}

export default App;