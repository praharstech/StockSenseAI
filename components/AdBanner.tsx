import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, Megaphone } from 'lucide-react';
import { getManualAds } from '../services/adminDataService';
import { ManualAd } from '../types';

interface AdBannerProps {
  variant?: 'horizontal' | 'sidebar';
}

const AdBanner: React.FC<AdBannerProps> = ({ variant = 'horizontal' }) => {
  const [manualAd, setManualAd] = useState<ManualAd | null>(null);

  useEffect(() => {
    const ads = getManualAds();
    if (ads.length > 0) {
      // Pick a random manual ad
      setManualAd(ads[Math.floor(Math.random() * ads.length)]);
    }
  }, []);

  if (manualAd) {
    if (variant === 'sidebar') {
      return (
        <div className="bg-gradient-to-br from-blue-900/60 to-indigo-900/60 border border-blue-500/30 rounded-2xl p-5 flex flex-col items-center text-center space-y-4 shadow-xl ring-1 ring-white/5 animate-in fade-in slide-in-from-right-2">
          <div className="bg-blue-500/20 p-2.5 rounded-full shadow-inner">
            <Megaphone className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1.5 opacity-80">Manual Pick</h4>
            <p className="text-base font-bold text-white leading-tight">{manualAd.title}</p>
            <p className="text-xs text-slate-300 mt-2 font-medium">{manualAd.description}</p>
          </div>
          <a 
            href={manualAd.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl w-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-95"
          >
            {manualAd.ctaText} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      );
    }

    return (
      <div className="w-full bg-slate-900 border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 my-6 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-xl">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all"></div>
         <div className="flex items-center gap-4 z-10">
            <div className="bg-blue-500/10 p-3 rounded-xl ring-1 ring-blue-500/30">
               <Megaphone className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-blue-400 border border-blue-400/30 px-1.5 py-0.5 rounded tracking-tighter">FEATURED</span>
                <h4 className="text-base font-bold text-white">{manualAd.title}</h4>
              </div>
              <p className="text-sm text-slate-400 max-w-lg">{manualAd.description}</p>
            </div>
         </div>
         <a 
           href={manualAd.link} 
           target="_blank" 
           rel="noopener noreferrer"
           className="z-10 text-sm font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 rounded-xl transition-all whitespace-nowrap shadow-lg active:scale-95 flex items-center gap-2"
         >
           {manualAd.ctaText} <ExternalLink className="h-4 w-4" />
         </a>
      </div>
    );
  }

  // Fallback to default ads if no manual ones
  if (variant === 'sidebar') {
    return (
      <div className="bg-gradient-to-b from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
        <div className="bg-indigo-500/20 p-2 rounded-full">
          <Sparkles className="h-5 w-5 text-indigo-300" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Sponsored</h4>
          <p className="text-sm font-semibold text-white">Premium Trading Tools</p>
          <p className="text-xs text-slate-400 mt-1">Get 0% brokerage on your first 100 trades.</p>
        </div>
        <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg w-full transition-colors flex items-center justify-center gap-1">
          Learn More <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 my-4 relative overflow-hidden">
       <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
       <div className="flex items-center gap-3 z-10">
          <div className="bg-blue-500/20 p-2 rounded-lg">
             <span className="text-blue-400 font-bold text-xs border border-blue-500/30 px-1 rounded">AD</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Unlock Pro Analytics</h4>
            <p className="text-xs text-slate-400">Real-time options chain and advanced charting.</p>
          </div>
       </div>
       <button className="z-10 text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
         View Offer
       </button>
    </div>
  );
};

export default AdBanner;