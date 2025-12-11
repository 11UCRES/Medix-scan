import React, { useState, useRef } from 'react';
import Navbar from './components/Navbar';
import Scanner from './components/Scanner';
import AnalysisResults from './components/MedicineList';
import ChatAssistant from './components/ChatAssistant';
import MedicineSearch from './components/MedicineSearch';
import { Language, ExtractionResult } from './types';
import { analyzePrescription } from './services/geminiService';
import { TRANSLATIONS } from './constants';
import { Sparkles, Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'scan' | 'search' | 'chat'>('scan');
  // Default language set to Bangla ('bn') as requested
  const [language, setLanguage] = useState<Language>('bn');
  
  // isAnalyzing: Initial full-screen load
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // isTranslating: Background load while showing previous results
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [lastScannedImage, setLastScannedImage] = useState<string | null>(null);
  
  const analysisRequestId = useRef(0);
  
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'bn' : 'en';
    setLanguage(newLang);

    // If we have a result and the original image, re-analyze in the new language
    // We use isTranslating to keep the UI interactive and the old result visible
    if (extractionResult && lastScannedImage) {
      setIsTranslating(true);
      
      const currentId = analysisRequestId.current + 1;
      analysisRequestId.current = currentId;

      try {
        const result = await analyzePrescription(lastScannedImage, newLang);
        if (analysisRequestId.current === currentId) {
           setExtractionResult(result);
        }
      } catch (error) {
        if (analysisRequestId.current === currentId) {
           console.error("Failed to translate result:", error);
        }
      } finally {
        if (analysisRequestId.current === currentId) {
           setIsTranslating(false);
        }
      }
    }
  };

  const handleScan = async (base64: string) => {
    setLastScannedImage(base64); 
    setIsAnalyzing(true);
    setExtractionResult(null);

    const currentId = analysisRequestId.current + 1;
    analysisRequestId.current = currentId;

    try {
      const result = await analyzePrescription(base64, language);
      
      if (analysisRequestId.current === currentId) {
         setExtractionResult(result);
      }
    } catch (error: any) {
      if (analysisRequestId.current === currentId) {
         // Check for specific error code thrown by service
         const message = error.message === 'QUOTA_EXCEEDED' 
            ? TRANSLATIONS[language].errorQuota 
            : "Failed to analyze image. Please try again.";
         alert(message);
      }
    } finally {
      if (analysisRequestId.current === currentId) {
         setIsAnalyzing(false);
      }
    }
  };

  const handleCancelScan = () => {
    analysisRequestId.current += 1;
    setIsAnalyzing(false);
    setIsTranslating(false);
    setExtractionResult(null);
    setLastScannedImage(null);
  };

  const handleResetApp = () => {
    // Clears all scan data and resets the app state
    handleCancelScan();
    setChatInitialMessage(undefined);
  };

  const handleAskAbout = (topic: string) => {
    const prompt = language === 'bn' 
      ? `${topic} সম্পর্কে আমাকে বিস্তারিত বলুন।`
      : `Tell me more about: ${topic}`;
    
    setChatInitialMessage(prompt);
    setCurrentTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <Navbar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab}
        language={language}
      />

      <main className="max-w-6xl mx-auto px-4 pt-4 md:pt-6">
        
        {/* Render SCAN Tab */}
        <div className={currentTab === 'scan' ? 'block' : 'hidden'}>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <div>
               <Scanner 
                 language={language} 
                 onScan={handleScan} 
                 onCancel={handleCancelScan}
                 isAnalyzing={isAnalyzing || isTranslating} 
               />
               
               {/* Quick Tips / Disclaimer */}
               <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-100 text-teal-800 text-sm">
                  <p className="flex gap-2">
                    <Sparkles className="shrink-0 w-4 h-4 mt-1 text-teal-600" />
                    {TRANSLATIONS[language].disclaimer}
                  </p>
               </div>
            </div>

            <div className="w-full min-w-0">
              {/* Initial Analysis Loading State */}
              {isAnalyzing && (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-8">
                    {/* Anatomical Heart Animation */}
                    <div className="anatomical-heart-container">
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <defs>
                           {/* Right Side Flow Path (Deoxygenated - Blue) */}
                           <path id="rightFlow" d="M 30,0 Q 30,25 35,35 Q 40,45 35,65 Q 30,80 20,50 Q 15,35 5,30" fill="none" />
                           {/* Left Side Flow Path (Oxygenated - Red) */}
                           <path id="leftFlow" d="M 90,30 Q 75,35 65,40 Q 55,50 60,75 Q 65,90 70,50 Q 72,20 50,15 Q 35,15 45,0" fill="none" />
                        </defs>
                        
                        {/* Background Silhouette/Pericardium */}
                        <path d="M 50,95 C 20,85 15,55 25,30 C 30,15 45,15 50,25 C 55,15 70,15 75,30 C 85,55 80,85 50,95 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />

                        {/* --- Right Heart (Blue/Deoxygenated) --- */}
                        <g className="atria-group">
                           <path d="M 28,15 C 28,15 42,20 42,40 C 42,50 30,50 28,40 Z" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="1.5" />
                           <text x="22" y="35" fontSize="4" fill="#0369a1" className="font-bold opacity-60">RA</text>
                        </g>

                        <g className="ventricle-group">
                           <path d="M 30,52 C 42,52 45,75 40,85 C 25,80 25,60 30,52 Z" fill="#7dd3fc" stroke="#0ea5e9" strokeWidth="1.5" />
                           <text x="32" y="70" fontSize="4" fill="#0369a1" className="font-bold opacity-60">RV</text>
                           <path d="M 28,50 Q 20,40 10,35" fill="none" stroke="#bae6fd" strokeWidth="4" strokeLinecap="round" />
                        </g>
                        
                        <path d="M 32,15 L 32,5" fill="none" stroke="#bae6fd" strokeWidth="5" />

                        {/* --- Left Heart (Red/Oxygenated) --- */}
                        <g className="atria-group">
                           <path d="M 58,25 C 58,25 72,20 75,40 C 75,50 60,50 58,40 Z" fill="#fecaca" stroke="#ef4444" strokeWidth="1.5" />
                           <text x="76" y="35" fontSize="4" fill="#b91c1c" className="font-bold opacity-60">LA</text>
                        </g>

                        <g className="ventricle-group">
                           <path d="M 55,52 C 70,52 75,80 50,90 C 40,80 45,60 55,52 Z" fill="#f87171" stroke="#ef4444" strokeWidth="1.5" />
                           <text x="60" y="70" fontSize="4" fill="#7f1d1d" className="font-bold opacity-60">LV</text>
                           <path d="M 55,50 Q 58,30 50,15" fill="none" stroke="#fecaca" strokeWidth="4" strokeLinecap="round"/>
                        </g>

                        <path d="M 50,15 Q 40,5 60,5" fill="none" stroke="#fca5a5" strokeWidth="5" strokeLinecap="round" />

                        {/* --- Particles (Blood Cells) --- */}
                        <circle r="1.5" fill="#0369a1" className="flow-particle"><animateMotion repeatCount="indefinite" dur="1.5s" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#rightFlow"/></animateMotion></circle>
                        <circle r="1.5" fill="#0369a1" className="flow-particle"><animateMotion repeatCount="indefinite" dur="1.5s" begin="0.5s" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#rightFlow"/></animateMotion></circle>
                        <circle r="1.5" fill="#b91c1c" className="flow-particle"><animateMotion repeatCount="indefinite" dur="1.5s" begin="0.2s" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#leftFlow"/></animateMotion></circle>
                        <circle r="1.5" fill="#b91c1c" className="flow-particle"><animateMotion repeatCount="indefinite" dur="1.5s" begin="0.7s" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#leftFlow"/></animateMotion></circle>

                        <path d="M 45,45 L 48,80" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.5" strokeDasharray="2,2"/>
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500 font-medium animate-pulse">{TRANSLATIONS[language].analyzing}</p>
                 </div>
              )}
              
              {/* Results View (visible during Translation) */}
              {!isAnalyzing && extractionResult && (
                <div className={`animate-fade-in-up relative transition-opacity duration-300 ${isTranslating ? 'opacity-60' : 'opacity-100'}`}>
                  {/* Overlay Spinner for Translation */}
                  {isTranslating && (
                    <div className="absolute inset-0 z-10 flex items-start justify-center pt-20">
                      <div className="bg-black/75 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-xl backdrop-blur-sm">
                        <Loader2 className="animate-spin" size={16} />
                        <span className="text-sm font-medium">{TRANSLATIONS[language].translating}</span>
                      </div>
                    </div>
                  )}
                  
                  <AnalysisResults 
                    result={extractionResult} 
                    language={language}
                    onAskAbout={handleAskAbout}
                    onToggleLanguage={toggleLanguage}
                  />
                </div>
              )}
              
              {!isAnalyzing && !extractionResult && (
                <div className="hidden lg:flex flex-col items-center justify-center h-full text-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-2xl min-h-[300px]">
                   <p>{TRANSLATIONS[language].uploadDesc}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render SEARCH Tab */}
        <div className={currentTab === 'search' ? 'block' : 'hidden'}>
          <MedicineSearch language={language} />
        </div>

        {/* Render CHAT Tab */}
        <div className={currentTab === 'chat' ? 'block' : 'hidden'}>
          <ChatAssistant 
            language={language}
            initialMessage={chatInitialMessage}
            onClearInitial={() => setChatInitialMessage(undefined)}
            onReset={handleResetApp}
          />
        </div>

      </main>
    </div>
  );
}