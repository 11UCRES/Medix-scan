import React from 'react';
import { ExtractionResult, Medicine, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Pill, Clock, AlertTriangle, Info, MessageCircle, FileText, Activity, Utensils, ThumbsUp, ThumbsDown, HeartPulse, Languages, ShieldAlert } from 'lucide-react';

interface AnalysisResultsProps {
  result: ExtractionResult;
  language: Language;
  onAskAbout: (topic: string) => void;
  onToggleLanguage: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, language, onAskAbout, onToggleLanguage }) => {
  const t = TRANSLATIONS[language];

  // Helper to translate doc type (Case Insensitive)
  const getDocTypeLabel = (type: string) => {
    const upperType = type.toUpperCase();
    if (upperType.includes('PRESCRIPTION')) return t.docTypes.PRESCRIPTION;
    if (upperType.includes('REPORT')) return t.docTypes.REPORT;
    return t.docTypes.OTHER;
  };

  return (
    <div className="space-y-6 mt-6 pb-8 w-full">
      {/* Header Summary */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
            <div className="flex items-center gap-2">
                <FileText className="text-teal-600 shrink-0" size={20} />
                <h3 className="font-bold text-slate-800 break-words">{t.reportType}: {getDocTypeLabel(result.type)}</h3>
            </div>
            
            <button 
                onClick={onToggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 shrink-0 ml-auto"
            >
                <Languages size={14} />
                {language === 'en' ? 'বাংলায় দেখুন' : 'View in English'}
            </button>
        </div>
        {result.summary && <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{result.summary}</p>}
      </div>

      {/* Report Findings */}
      {result.reportFindings && result.reportFindings.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 px-1 mb-3 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" />
            {t.findings}
          </h3>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
             <div className="grid grid-cols-12 bg-slate-50 p-3 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 gap-1">
                <div className="col-span-5 sm:col-span-5">{t.parameter}</div>
                <div className="col-span-4 sm:col-span-4">{t.value}</div>
                <div className="col-span-3 sm:col-span-3 text-right">{t.status}</div>
             </div>
             <div className="divide-y divide-slate-50">
               {result.reportFindings.map((finding, idx) => (
                 <div key={idx} className="grid grid-cols-12 p-3 text-sm items-center hover:bg-slate-50 transition-colors gap-1">
                    <div className="col-span-5 font-medium text-slate-800 break-words pr-1">{finding.parameter}</div>
                    <div className="col-span-4 text-slate-600 font-mono break-all pr-1">{finding.value}</div>
                    <div className="col-span-3 text-right">
                       <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                         finding.status === 'Normal' ? 'bg-green-100 text-green-700' :
                         finding.status === 'Critical' ? 'bg-red-100 text-red-700' :
                         'bg-amber-100 text-amber-700'
                       }`}>
                         {finding.status}
                       </span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* Medicines */}
      {result.medicines && result.medicines.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 px-1 mb-3 flex items-center gap-2">
            <Pill size={20} className="text-teal-600" />
            {t.resultsTitle}
          </h3>
          <div className="grid gap-4 grid-cols-1">
            {result.medicines.map((med, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm border hover:shadow-md transition-shadow ${
                  med.confidence === 'LOW' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
                }`}
              >
                {/* Uncertainty Warning */}
                {med.confidence === 'LOW' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3">
                    <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-amber-800 text-sm font-bold flex items-center gap-2">
                        {t.uncertainName}
                      </h4>
                      <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                        {med.note || t.verifyWithDoctor}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-teal-700 flex items-center gap-2 break-words">
                      {med.name}
                      {med.confidence === 'LOW' && (
                         <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                           {t.lowConfidence}
                         </span>
                      )}
                    </h4>
                    <span className="text-xs font-semibold bg-teal-50 text-teal-600 px-2 py-1 rounded-full mt-1 inline-block">
                      {med.dosage}
                    </span>
                  </div>
                  <button
                    onClick={() => onAskAbout(med.name)}
                    className="text-indigo-600 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
                    title={t.askAbout}
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-slate-500 text-xs uppercase font-bold">{t.frequency}</p>
                      <p className="text-slate-700 break-words">{med.frequency}</p>
                    </div>
                  </div>
                  
                  {med.purpose && (
                    <div className="flex items-start gap-2">
                       <Info size={16} className="text-slate-400 mt-0.5 shrink-0" />
                       <div className="min-w-0">
                         <p className="text-slate-500 text-xs uppercase font-bold">{t.purpose}</p>
                         <p className="text-slate-700 break-words">{med.purpose}</p>
                       </div>
                    </div>
                  )}

                  {med.warnings && (
                    <div className="col-span-1 sm:col-span-2 flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <p className="font-medium break-words">{med.warnings}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patient Advice */}
      {result.patientAdvice && (
        <div className="grid md:grid-cols-2 gap-4">
           {/* Diet */}
           <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Utensils size={18} className="text-orange-500" />
                 {language === 'bn' ? 'খাবার তালিকা' : 'Dietary Advice'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-2">
                    <ThumbsUp size={16} /> {t.dietAllowed}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.patientAdvice.dietaryAllowed.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 text-green-800 text-xs rounded-md border border-green-100 break-words">{item}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
                    <ThumbsDown size={16} /> {t.dietAvoid}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.patientAdvice.dietaryAvoid.map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-red-50 text-red-800 text-xs rounded-md border border-red-100 break-words">{item}</span>
                    ))}
                  </div>
                </div>
              </div>
           </div>

           {/* Lifestyle */}
           <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <HeartPulse size={18} className="text-rose-500" />
                 {t.lifestyle}
              </h3>
              <ul className="space-y-2">
                {result.patientAdvice.lifestyleTips.map((tip, i) => (
                   <li key={i} className="flex gap-2 text-sm text-slate-700">
                     <span className="text-rose-400 mt-1 shrink-0">•</span>
                     <span className="break-words">{tip}</span>
                   </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                 <button 
                   onClick={() => onAskAbout(language === 'bn' ? "এই রিপোর্টের ভিত্তিতে আমার জীবনযাত্রা কেমন হওয়া উচিত?" : "How should I maintain my daily life based on this report?")}
                   className="text-indigo-600 text-sm font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                 >
                   <MessageCircle size={14} />
                   {language === 'bn' ? 'এআই-এর কাছে রুটিন চান' : 'Ask AI for a Daily Plan'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;