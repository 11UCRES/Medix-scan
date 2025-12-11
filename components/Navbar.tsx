import React from 'react';
import { Activity, MessageCircle, ScanLine, Search } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface NavbarProps {
  currentTab: 'scan' | 'search' | 'chat';
  onTabChange: (tab: 'scan' | 'search' | 'chat') => void;
  language: Language;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, language }) => {
  const t = TRANSLATIONS[language];

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" 
          onClick={() => onTabChange('scan')}
        >
          <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/30 transition-all duration-300 transform group-hover:scale-105 shrink-0">
            <Activity className="text-white" size={20} strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-700 via-cyan-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              {t.appTitle}
            </h1>
            <span className="text-[9px] sm:text-[10px] md:text-xs text-slate-500 font-medium tracking-wide leading-none">
              {t.appSubtitle}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200">
           <button
             onClick={() => onTabChange('scan')}
             className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
               currentTab === 'scan' 
                 ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200' 
                 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
             }`}
             aria-label={t.scan}
           >
             <ScanLine size={18} className={currentTab === 'scan' ? 'text-teal-600' : ''} />
             <span className="hidden sm:inline">{t.scan}</span>
           </button>
           
           <button
             onClick={() => onTabChange('search')}
             className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
               currentTab === 'search' 
                 ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' 
                 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
             }`}
             aria-label={t.search}
           >
             <Search size={18} className={currentTab === 'search' ? 'text-indigo-600' : ''} />
             <span className="hidden sm:inline">{t.search}</span>
           </button>

           <button
             onClick={() => onTabChange('chat')}
             className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
               currentTab === 'chat' 
                 ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200' 
                 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
             }`}
             aria-label={t.chat}
           >
             <MessageCircle size={18} className={currentTab === 'chat' ? 'text-blue-600' : ''} />
             <span className="hidden sm:inline">{t.chat}</span>
           </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;