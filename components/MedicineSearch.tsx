import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle, Pill, Activity, User, Users, UserPlus, ThumbsUp, AlertTriangle, ArrowRight, X, ChevronLeft, Info, CloudOff } from 'lucide-react';
import { Language, MedicineDetails } from '../types';
import { TRANSLATIONS, COMMON_DISEASES } from '../constants';
import { searchMedicineDetails, suggestMedicines, getMedicinesForDisease } from '../services/geminiService';

interface MedicineSearchProps {
  language: Language;
}

const MedicineSearch: React.FC<MedicineSearchProps> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedicineDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Suggestion States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipSuggestionRef = useRef(false); // Ref to skip suggestion fetch on selection

  // Disease Browse States
  const [selectedDisease, setSelectedDisease] = useState<{id: string, name: string} | null>(null);
  const [diseaseMedicines, setDiseaseMedicines] = useState<{name: string, indication: string}[]>([]);
  const [loadingDiseaseMeds, setLoadingDiseaseMeds] = useState(false);

  useEffect(() => {
    // Clear suggestions if query is empty or too short
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check if we should skip this query update (e.g. user clicked a result)
    if (skipSuggestionRef.current) {
      skipSuggestionRef.current = false;
      return;
    }

    // Debounce API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Only search if we aren't already matching a suggestion or if the user is actively typing
    debounceRef.current = setTimeout(async () => {
       setIsSuggesting(true);
       try {
         const sugs = await suggestMedicines(query);
         setSuggestions(sugs);
         // Only show if we have suggestions and user is still focused/typing
         if (sugs.length > 0) setShowSuggestions(true);
       } catch (e) {
         console.error(e);
       } finally {
         setIsSuggesting(false);
       }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = searchQuery || query;
    if (!targetQuery.trim()) return;

    // Clear any pending suggestion fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    setShowSuggestions(false);
    setLoading(true);
    setResult(null); 
    setError(null);
    
    try {
      const data = await searchMedicineDetails(targetQuery, language);
      setResult(data);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'QUOTA_EXCEEDED') {
        setError(t.errorQuota);
      } else {
        setError(t.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    skipSuggestionRef.current = true;
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(undefined, suggestion);
  };

  const clearSearch = () => {
    setQuery('');
    setResult(null);
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleDiseaseClick = async (id: string, label: string) => {
    setSelectedDisease({ id, name: label });
    setDiseaseMedicines([]);
    setLoadingDiseaseMeds(true);
    setResult(null); // Clear any specific search result
    setError(null);

    try {
      // Pass language to ensure the indication is returned in Bengali
      const meds = await getMedicinesForDisease(label, language);
      setDiseaseMedicines(meds);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'QUOTA_EXCEEDED') {
         setError(t.errorQuota);
      }
    } finally {
      setLoadingDiseaseMeds(false);
    }
  };

  const handleBackToCategories = () => {
    setSelectedDisease(null);
    setDiseaseMedicines([]);
    setError(null);
  };

  const handleBackToDiseaseList = () => {
    setResult(null); // This reveals the disease list again
    setQuery('');
    setError(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative z-20">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
           <Search className="text-indigo-600" />
           {t.searchTitle}
        </h2>
        
        <form onSubmit={(e) => handleSearch(e)} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
               setQuery(e.target.value);
               if (!e.target.value) { setResult(null); setError(null); }
            }}
            onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => {
               setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full pl-12 pr-28 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-lg"
            autoComplete="off"
          />
          <Search className="absolute left-4 text-slate-400" size={24} />
          
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-24 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" /> : t.searchBtn}
          </button>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30 animate-fade-in-up">
               {isSuggesting && (
                 <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-50 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> {t.searching}
                 </div>
               )}
               <ul>
                 {suggestions.map((sug, idx) => (
                   <li key={idx}>
                     <button
                       type="button"
                       onClick={() => handleSuggestionClick(sug)}
                       className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-slate-700 font-medium flex items-center justify-between group transition-colors"
                     >
                       {sug}
                       <ArrowRight size={16} className="text-indigo-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading && (
         <div className="space-y-6 animate-pulse">
            <div className="bg-white h-48 rounded-2xl border border-slate-100 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="h-40 bg-white border border-slate-100 rounded-2xl"></div>
                <div className="h-40 bg-white border border-slate-100 rounded-2xl"></div>
            </div>
         </div>
      )}

      {/* Error Message */}
      {error && (
         <div className="bg-red-50 rounded-2xl p-6 border border-red-100 text-center animate-fade-in-up">
            <CloudOff className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-800 font-semibold">{error}</p>
         </div>
      )}

      {/* VIEW: Search Result (Top Priority) */}
      {!loading && !error && result && (
        <div className="animate-fade-in-up">
          {/* Back Button if came from Disease List */}
          {selectedDisease && (
            <button 
              onClick={handleBackToDiseaseList}
              className="mb-4 flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              <ChevronLeft size={20} />
              {t.popularMedicinesFor} {selectedDisease.name}
            </button>
          )}

          {result.found && result.name && result.name.toLowerCase() !== query.toLowerCase() && (
             <div className="mb-4 px-4 py-2 bg-indigo-50 text-indigo-800 rounded-lg text-sm inline-flex items-center gap-2">
                <Search size={14} />
                <span>{t.showingResultsFor} <strong>{result.name}</strong></span>
             </div>
          )}

          {!result.found ? (
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 text-center">
               <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-amber-800">{t.notFound}</h3>
               {result.suggestions && result.suggestions.length > 0 && (
                 <div className="mt-4">
                   <p className="text-amber-700 text-sm mb-2">{t.didYouMean}</p>
                   <div className="flex flex-wrap gap-2 justify-center">
                     {result.suggestions.map((sug, idx) => (
                       <button
                         key={idx}
                         onClick={() => { 
                           skipSuggestionRef.current = true;
                           setQuery(sug); 
                           setTimeout(() => handleSearch(undefined, sug), 0); 
                         }}
                         className="px-3 py-1 bg-white border border-amber-200 rounded-full text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
                       >
                         {sug}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 opacity-50 blur-2xl"></div>
                <div className="relative">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-1">{result.name}</h3>
                  {result.genericName && (
                    <span className="text-sm font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                      {t.generic}: {result.genericName}
                    </span>
                  )}
                  {result.uses && (
                     <div className="mt-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                           <Activity size={16} /> {t.uses}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                           {result.uses.map((use, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                                {use}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}
                </div>
              </div>

              {/* Dosage Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                  <Pill className="text-teal-600" /> {t.dosageByAge}
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                     <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold"><User size={18} /> {t.child}</div>
                     <p className="text-sm text-blue-900 leading-relaxed">{result.dosageByAge?.child || t.consultDoctor}</p>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                     <div className="flex items-center gap-2 mb-2 text-teal-800 font-bold"><Users size={18} /> {t.adult}</div>
                     <p className="text-sm text-teal-900 leading-relaxed">{result.dosageByAge?.adult || t.standardDosage}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                     <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold"><UserPlus size={18} /> {t.elderly}</div>
                     <p className="text-sm text-purple-900 leading-relaxed">{result.dosageByAge?.elderly || t.useWithCaution}</p>
                  </div>
                </div>
              </div>

              {/* Side Effects & Advantages */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                   <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                      <AlertTriangle className="text-rose-500" /> {t.sideEffects}
                   </h4>
                   <ul className="space-y-2">
                      {result.sideEffects?.map((effect, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-slate-700"><span className="text-rose-400">•</span> {effect}</li>
                      ))}
                   </ul>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                   <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
                      <ThumbsUp className="text-cyan-600" /> {t.advantages}
                   </h4>
                   <ul className="space-y-2">
                      {result.advantages?.map((adv, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-slate-700"><span className="text-cyan-400">•</span> {adv}</li>
                      ))}
                   </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Disease Medicine List (Second Priority) */}
      {!loading && !error && !result && selectedDisease && (
        <div className="animate-fade-in-up">
           <button 
             onClick={handleBackToCategories}
             className="mb-6 flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors"
           >
             <ChevronLeft size={20} />
             {t.backToCategories}
           </button>

           <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <Pill className="text-teal-600" />
                 {t.popularMedicinesFor} <span className="text-teal-600">{selectedDisease.name}</span>
              </h3>

              {loadingDiseaseMeds ? (
                 <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="animate-spin text-teal-600" size={32} />
                    <p className="text-sm font-medium">{t.searching}</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {diseaseMedicines.length > 0 ? (
                      diseaseMedicines.map((med, idx) => (
                         <button
                           key={idx}
                           onClick={() => { 
                             skipSuggestionRef.current = true;
                             setQuery(med.name); 
                             handleSearch(undefined, med.name); 
                           }}
                           className="flex flex-col items-start p-4 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-xl transition-all group text-left w-full h-full"
                         >
                           <div className="flex items-center justify-between w-full mb-1.5">
                              <span className="font-bold text-slate-700 group-hover:text-teal-800 text-lg">{med.name}</span>
                              <ArrowRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                           </div>
                           <div className="flex gap-2 items-start text-sm text-slate-500 group-hover:text-teal-600 leading-snug">
                              <Info size={14} className="shrink-0 mt-0.5 opacity-50" />
                              <span>{med.indication}</span>
                           </div>
                         </button>
                      ))
                    ) : (
                      <div className="col-span-2 py-8 text-center text-slate-400 italic">
                        No medicines found.
                      </div>
                    )}
                 </div>
              )}
           </div>
        </div>
      )}

      {/* VIEW: Disease Categories Grid (Default) */}
      {!loading && !error && !result && !selectedDisease && (
        <div className="animate-fade-in-up">
           <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">{t.browseConditions}</h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {COMMON_DISEASES.map((disease) => {
                const label = language === 'bn' ? disease.label.bn : disease.label.en;
                const Icon = disease.icon;
                return (
                  <button
                    key={disease.id}
                    onClick={() => handleDiseaseClick(disease.id, label)}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-teal-200 transition-all group aspect-square"
                  >
                    <div className={`p-3 rounded-full ${disease.bg} ${disease.color} group-hover:scale-110 transition-transform`}>
                       <Icon size={24} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 text-center leading-tight group-hover:text-teal-700">
                      {label}
                    </span>
                  </button>
                );
              })}
           </div>
        </div>
      )}
    </div>
  );
};

export default MedicineSearch;