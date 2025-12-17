import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

interface AdBannerProps {
  variant?: 'horizontal' | 'sidebar';
}

const AdBanner: React.FC<AdBannerProps> = ({ variant = 'horizontal' }) => {
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
       {/* Background Decoration */}
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