import React, { useState, useRef, ChangeEvent } from 'react';
import { Camera, Upload, X, Loader2, ScanLine, Lightbulb } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface ScannerProps {
  language: Language;
  onScan: (base64: string) => void;
  onCancel: () => void;
  isAnalyzing: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ language, onScan, onCancel, isAnalyzing }) => {
  const t = TRANSLATIONS[language];
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanClick = () => {
    if (preview) {
      // Pass the full Data URL (e.g., "data:image/png;base64,...")
      // The service layer will handle parsing the mime type and data.
      onScan(preview);
    }
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Notify parent to cancel any ongoing analysis
    onCancel();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-600">
             <ScanLine size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{t.uploadTitle}</h2>
          <p className="text-sm text-slate-500 mt-2">{t.uploadDesc}</p>
        </div>

        {!preview ? (
          <div className="space-y-3">
             <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors cursor-pointer group"
            >
              <Upload className="text-slate-400 group-hover:text-teal-600" />
              <span className="font-medium text-slate-600 group-hover:text-teal-700">{t.uploadBtn}</span>
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {/* Mobile native camera trigger */}
            <label className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors cursor-pointer shadow-md shadow-teal-200">
              <Camera size={20} />
              <span className="font-medium">{t.cameraBtn}</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-2.5 items-start text-left">
               <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>{t.proTip}</strong> {t.proTipDesc}
               </p>
            </div>
          </div>
        ) : (
          <div className="relative">
             <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/4] md:aspect-video">
                <img src={preview} alt="Prescription Preview" className="w-full h-full object-contain" />
                <button 
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm transition-transform hover:scale-110"
                >
                  <X size={16} />
                </button>
             </div>
             
             <button
              onClick={handleScanClick}
              disabled={isAnalyzing}
              className={`mt-4 w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-all ${
                isAnalyzing 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-teal-200'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <ScanLine size={20} />
                  {t.scan}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;