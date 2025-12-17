import React, { useState } from 'react';
import { StockData, StockQuote } from '../types';
import { getStockQuote } from '../services/geminiService';
import { Search, IndianRupee, PieChart, ArrowRight, Zap, TrendingUp, Loader2, Target, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface StockInputProps {
  onSubmit: (data: StockData) => void;
  isLoading: boolean;
}

const StockInput: React.FC<StockInputProps> = ({ onSubmit, isLoading }) => {
  const [symbol, setSymbol] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [strategy, setStrategy] = useState<'intraday' | 'long-term'>('intraday');
  
  // Quote State
  const [quoteData, setQuoteData] = useState<StockQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          New Analysis
        </h2>
        <p className="text-slate-400 text-sm mt-2">Enter your position details below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Strategy Selection */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setStrategy('intraday')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              strategy === 'intraday'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" /> Intraday
          </button>
          <button
            type="button"
            onClick={() => setStrategy('long-term')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              strategy === 'long-term'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Long Term
          </button>
        </div>

        {/* Stock Symbol with Quick Quote */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Stock Name / Symbol</label>
          <div className="relative group flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. RELIANCE, TCS"
                className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleCheckPrice}
              disabled={isFetchingQuote || !symbol}
              className="bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Get Current Price"
            >
              {isFetchingQuote ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Quote Display Area */}
          {quoteError && <p className="text-rose-400 text-xs mt-1">{quoteError}</p>}
          
          {quoteData && (
            <div className="bg-slate-950/80 border border-slate-700 rounded-lg p-3 mt-2 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 fade-in">
              <div className="text-center border-r border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Current</p>
                <p className="text-white font-bold text-sm">
                  {quoteData.currentPrice ? `₹${quoteData.currentPrice.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div 
                className="text-center border-r border-slate-800 cursor-pointer hover:bg-emerald-500/10 rounded transition-colors group"
                onClick={applyBuyPrice}
                title="Click to use as Buy Price"
              >
                <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1 group-hover:text-emerald-400">
                  Buy <ArrowDownCircle className="h-3 w-3" />
                </p>
                <p className="text-emerald-400 font-bold text-sm">
                  {quoteData.suggestedBuy ? `₹${quoteData.suggestedBuy.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                  Sell <ArrowUpCircle className="h-3 w-3" />
                </p>
                <p className="text-rose-400 font-bold text-sm">
                  {quoteData.suggestedSell ? `₹${quoteData.suggestedSell.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Buy Price (₹)</label>
            <div className="relative group">
              <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="number"
                step="0.01"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="2500.00"
                className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Quantity</label>
            <div className="relative group">
              <PieChart className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="50"
                className="w-full bg-slate-950 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
            isLoading
              ? 'bg-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/20'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
              Analyzing...
            </>
          ) : (
            <>
              Start Analysis <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default StockInput;