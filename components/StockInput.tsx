
import React, { useState, useEffect } from 'react';
import { StockData, StockQuote, ManualSuggestion } from '../types';
import { getStockQuote } from '../services/geminiService';
import { getManualSuggestions } from '../services/adminDataService';
import { getLogs } from '../services/trackingService';
import { 
  Search, IndianRupee, PieChart, ArrowRight, Zap, TrendingUp, 
  Loader2, Target, ArrowDownCircle, ArrowUpCircle, Lightbulb,
  Clock, Heart, ExternalLink
} from 'lucide-react';

interface StockInputProps {
  onSubmit: (data: StockData) => void;
  isLoading: boolean;
  userEmail: string;
}

const StockInput: React.FC<StockInputProps> = ({ onSubmit, isLoading, userEmail }) => {
  const [symbol, setSymbol] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [strategy, setStrategy] = useState<'intraday' | 'long-term'>('intraday');
  
  const [quoteData, setQuoteData] = useState<StockQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [proSuggestions, setProSuggestions] = useState<ManualSuggestion[]>([]);

  useEffect(() => {
    const allSugs = getManualSuggestions();
    const userLogs = getLogs().filter(l => l.email === userEmail && l.action === 'SEARCH_STOCK');
    const userInterests = new Set(userLogs.map(l => l.details.replace('Searched ', '')));

    // Sort: 1. Targeted to specific user, 2. Public but matching user interests, 3. General public
    const prioritizedSugs = allSugs.sort((a, b) => {
      const aTargeted = a.targetUserEmail === userEmail;
      const bTargeted = b.targetUserEmail === userEmail;
      if (aTargeted && !bTargeted) return -1;
      if (!aTargeted && bTargeted) return 1;

      const aInterest = userInterests.has(a.symbol);
      const bInterest = userInterests.has(b.symbol);
      if (aInterest && !bInterest) return -1;
      if (!aInterest && bInterest) return 1;

      return b.timestamp - a.timestamp;
    });

    setProSuggestions(prioritizedSugs.slice(0, 4));
  }, [userEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol && buyPrice && quantity) {
      onSubmit({
        symbol: symbol.toUpperCase(),
        buyPrice: parseFloat(buyPrice),
        quantity: parseFloat(quantity),
        strategy,
      });
    }
  };

  const handleCheckPrice = async () => {
    if (!symbol) return;
    setIsFetchingQuote(true);
    setQuoteError(null);
    setQuoteData(null);
    try {
      const data = await getStockQuote(symbol);
      setQuoteData(data);
    } catch (e) {
      setQuoteError("Could not fetch price. Try again.");
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const applyBuyPrice = () => {
    if (quoteData && quoteData.suggestedBuy) {
      setBuyPrice(quoteData.suggestedBuy.toString());
    }
  };

  const applySuggestion = (sug: ManualSuggestion) => {
    setSymbol(sug.symbol);
    setBuyPrice(sug.target.toString());
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
      <div className="w-full max-w-md mx-auto lg:mx-0 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Market Scanner
          </h2>
          <p className="text-slate-500 text-sm mt-1">Configure your entry for AI evaluation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setStrategy('intraday')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                strategy === 'intraday'
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Intraday
            </button>
            <button
              type="button"
              onClick={() => setStrategy('long-term')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                strategy === 'long-term'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Long Term
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Stock Ticker</label>
            <div className="relative group flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g., RELIANCE"
                  className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-800 focus:border-blue-500 outline-none font-bold"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleCheckPrice}
                disabled={isFetchingQuote || !symbol}
                className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 px-4 rounded-2xl transition-all"
              >
                {isFetchingQuote ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              </button>
            </div>
            
            {quoteData && (
              <div className="space-y-2 mt-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold tracking-tighter uppercase">Market</p>
                    <p className="text-white font-bold text-sm">₹{quoteData.currentPrice.toFixed(1)}</p>
                  </div>
                  <div 
                    className="text-center cursor-pointer bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl py-1"
                    onClick={applyBuyPrice}
                  >
                    <p className="text-[9px] text-slate-500 font-bold tracking-tighter uppercase">Use Buy</p>
                    <p className="text-emerald-400 font-bold text-sm">₹{quoteData.suggestedBuy.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold tracking-tighter uppercase">Target</p>
                    <p className="text-rose-400 font-bold text-sm">₹{quoteData.suggestedSell.toFixed(1)}</p>
                  </div>
                </div>
                {/* Always extract the URLs from groundingChunks and list them on the web app when Google Search is used */}
                {quoteData.sources && quoteData.sources.length > 0 && (
                  <div className="px-2 flex flex-wrap gap-2 items-center">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tight">Sources:</span>
                    {quoteData.sources.slice(0, 2).map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[8px] text-blue-500/70 hover:text-blue-400 hover:underline truncate max-w-[100px] flex items-center gap-0.5"
                      >
                        {source.title} <ExternalLink className="h-2 w-2" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Buy Price (₹)</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-emerald-400" />
                <input
                  type="number"
                  step="0.01"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-800 outline-none font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Quantity</label>
              <div className="relative group">
                <PieChart className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-purple-400" />
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-800 outline-none font-bold"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-5 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isLoading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Start AI Intelligence <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>
      </div>

      <div className="flex-1 w-full space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Personalized Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proSuggestions.length === 0 ? (
            <div className="col-span-full p-8 border border-dashed border-slate-800 rounded-3xl text-center text-slate-600 italic text-sm">
              Analyzing your habits for custom tips...
            </div>
          ) : proSuggestions.map(sug => (
            <div 
              key={sug.id} 
              onClick={() => applySuggestion(sug)}
              className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl hover:border-emerald-500/40 transition-all cursor-pointer group relative overflow-hidden"
            >
              {sug.targetUserEmail === userEmail && (
                <div className="absolute top-0 right-0 bg-blue-600 text-[8px] font-black text-white px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-lg">
                  <Heart className="h-2 w-2 fill-white" /> EXCLUSIVE FOR YOU
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-xl font-bold text-white group-hover:text-emerald-400">{sug.symbol}</h4>
                  <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">{new Date(sug.timestamp).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black tracking-tighter ${
                  sug.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {sug.action}
                </span>
              </div>
              <p className="text-xs text-slate-400 italic mb-4 line-clamp-2">"{sug.reason}"</p>
              <div className="flex gap-4 pt-3 border-t border-slate-800/50">
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Target</p>
                  <p className="text-sm font-bold text-emerald-400">₹{sug.target}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Stop Loss</p>
                  <p className="text-sm font-bold text-rose-500">₹{sug.stopLoss}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockInput;
