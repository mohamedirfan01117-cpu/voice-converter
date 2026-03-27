/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, 
  MicOff, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkles, 
  MessageSquare, 
  Languages, 
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for Web Speech API (not in standard TS types yet)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const CONVERSION_MODES = [
  { id: 'formal', name: 'Formal', icon: MessageSquare, prompt: 'Rewrite this message to be professional and formal.' },
  { id: 'casual', name: 'Casual', icon: Sparkles, prompt: 'Rewrite this message to be friendly and casual.' },
  { id: 'summarize', name: 'Summarize', icon: FileText, prompt: 'Summarize this message into a concise version.' },
  { id: 'translate-es', name: 'Spanish', icon: Languages, prompt: 'Translate this message into Spanish.' },
  { id: 'translate-fr', name: 'French', icon: Languages, prompt: 'Translate this message into French.' },
];

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [convertedText, setConvertedText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [selectedMode, setSelectedMode] = useState(CONVERSION_MODES[0].id);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError('Speech recognition is not supported in this browser.');
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setTranscript('');
      setConvertedText('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleConvert = async () => {
    if (!transcript) return;
    
    setIsConverting(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const mode = CONVERSION_MODES.find(m => m.id === selectedMode);
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${mode?.prompt}\n\nMessage: "${transcript}"`,
        config: {
          systemInstruction: "You are a helpful message converter. Provide only the converted text without any additional commentary or quotes.",
        }
      });

      setConvertedText(response.text || 'Failed to convert message.');
    } catch (err) {
      console.error('Conversion error:', err);
      setError('Failed to convert message. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setTranscript('');
    setConvertedText('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-12 flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white">
            <Mic size={20} />
          </div>
          <h1 className="text-3xl font-serif italic font-medium tracking-tight">Voice Message Converter</h1>
        </motion.div>
        <p className="text-[#5A5A40] max-w-md">Record your thoughts and let AI polish them into perfect messages for any occasion.</p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recording Section */}
        <section className="flex flex-col gap-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 flex flex-col items-center gap-8 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <button 
                onClick={clearAll}
                className="p-2 text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Clear all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="relative">
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0.2 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 bg-[#5A5A40] rounded-full"
                  />
                )}
              </AnimatePresence>
              
              <button
                onClick={toggleRecording}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording ? 'bg-red-500 text-white' : 'bg-[#5A5A40] text-white hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            </div>

            <div className="w-full">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40] opacity-60">Transcript</span>
                {transcript && (
                  <button 
                    onClick={() => copyToClipboard(transcript)}
                    className="text-xs flex items-center gap-1 text-[#5A5A40] hover:underline underline-offset-4"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="min-h-[120px] p-4 bg-[#F5F5F0] rounded-2xl text-sm leading-relaxed italic text-[#1A1A1A]/80">
                {transcript || (isRecording ? "Listening..." : "Tap the mic to start recording your message...")}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs bg-red-50 p-3 rounded-xl w-full text-center">
                {error}
              </div>
            )}

            <button
              disabled={!transcript || isConverting || isRecording}
              onClick={handleConvert}
              className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4A4A30] transition-colors"
            >
              {isConverting ? (
                <RotateCcw className="animate-spin" size={20} />
              ) : (
                <Sparkles size={20} />
              )}
              {isConverting ? 'Converting...' : 'Convert Message'}
            </button>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A5A40] opacity-60 block mb-4">Conversion Style</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONVERSION_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm transition-all ${
                    selectedMode === mode.id 
                    ? 'bg-[#5A5A40] text-white' 
                    : 'bg-[#F5F5F0] text-[#1A1A1A] hover:bg-[#E5E5E0]'
                  }`}
                >
                  <mode.icon size={16} />
                  {mode.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Output Section */}
        <section className="flex flex-col">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif italic font-medium">Polished Result</h2>
              {convertedText && (
                <button 
                  onClick={() => copyToClipboard(convertedText)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F5F5F0] rounded-full text-sm font-medium hover:bg-[#E5E5E0] transition-colors"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy Result'}
                </button>
              )}
            </div>

            <div className="flex-grow bg-[#F5F5F0] rounded-3xl p-6 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {isConverting ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
                    <p className="text-sm text-[#5A5A40] font-medium">AI is crafting your message...</p>
                  </motion.div>
                ) : convertedText ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg leading-relaxed whitespace-pre-wrap"
                  >
                    {convertedText}
                  </motion.div>
                ) : (
                  <div key="empty" className="h-full flex items-center justify-center text-[#5A5A40] opacity-40 text-center px-8 italic">
                    Your converted message will appear here after you record and click "Convert Message".
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-6 pt-6 border-t border-black/5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#5A5A40]">
                <Sparkles size={18} />
              </div>
              <p className="text-xs text-[#5A5A40] leading-tight">
                Powered by Gemini AI. The output is generated based on your selected style and original transcript.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 text-[#5A5A40] text-xs opacity-60">
        &copy; 2026 Voice Message Converter • Built with Google AI Studio
      </footer>
    </div>
  );
}
