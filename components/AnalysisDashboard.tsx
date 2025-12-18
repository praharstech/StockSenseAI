import React from 'react';
import { AnalysisResult, StockData } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw, AlertCircle, Zap, Clock, Newspaper, ArrowUpRight, ArrowDownRight, Minus, ShieldCheck, ShieldAlert, Timer } from 'lucide-react';
import AdBanner from './AdBanner';

interface AnalysisDashboardProps {
  data: AnalysisResult;
  input: StockData;
  onReset: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ data, input, onReset }) => {
  const { buyPrice, quantity, strategy } = input;
  const currentPrice = data.currentPriceEstimate || buyPrice; // Fallback to buy price if detection fails
  
  const totalInvestment = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const profitLoss = currentValue - totalInvestment;
  const profitLossPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

  const isProfitable = profitLoss >= 0;

  // Custom Tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 font-medium mb-1">{label}</p>
          <p className="text-white font-bold text-lg">
            ₹{payload[0].value.toFixed(2)}
          </p>
          <p className="text-xs text-blue-400 mt-1">Projected</p>
        </div>
      );
    }
    return null;
  };

  const getRecommendationUI = () => {
    if (!data.recommendation) return null;
    const { signal, price, reason } = data.recommendation;
    
    const config = {
      STRONG_BUY: {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        icon: <ShieldCheck className="h-8 w-8 text-emerald-400" />,
        label: 'Strong Buy'
      },
      STRONG_SELL: {
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/40',
        text: 'text-rose-400',
        icon: <ShieldAlert className="h-8 w-8 text-rose-400" />,
        label: 'Strong Sell'
      },
      NEUTRAL: {
        bg: 'bg-slate-800/40',
        border: 'border-slate-700',
        text: 'text-slate-300',
        icon: <Minus className="h-8 w-8 text-slate-400" />,
        label: 'Neutral / Hold'
      },
      WAIT: {
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        icon: <Timer className="h-8 w-8 text-amber-400" />,
        label: 'Wait / Watch'
      }
    };

    const style = config[signal] || config.NEUTRAL;

    return (
      <div className={`mt-8 p-6 rounded-3xl border ${style.bg} ${style.border} backdrop-blur-xl animate-in zoom-in-95 duration-700`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl`}>
            {style.icon}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
              <span className={`text-2xl font-black uppercase tracking-tighter ${style.text}`}>
                {style.label}
              </span>
              <span className="text-slate-500 text-sm font-bold uppercase">at suggested price</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-slate-400 text-sm italic max-w-md">
              "{reason}"
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10">
              AI Verification Successful
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Advertisement */}
      <AdBanner variant="horizontal" />

      {/* Strategy Badge */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
          strategy === 'intraday' 
            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {strategy === 'intraday' ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {strategy === 'intraday' ? 'Intraday Strategy' : 'Long-Term Investment'}
        </span>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Invested</span>
            <span className="text-slate-500 text-xs">{input.symbol}</span>
          </div>
          <div className="text-2xl font-bold text-white">
            ₹{totalInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {quantity} shares @ ₹{buyPrice}
          </div>
        </div>

        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Est. Value</span>
            {!data.currentPriceEstimate && <AlertCircle className="h-4 w-4 text-amber-500" />}
          </div>
          <div className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            <span className={isProfitable ? 'text-emerald-500' : 'text-rose-500'}>
              {isProfitable ? '+' : ''}{profitLossPercent.toFixed(2)}%
            </span>
            <span className="text-slate-500">
             (Est. Price: ₹{currentPrice.toFixed(2)})
            </span>
          </div>
        </div>

        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total P/L</span>
             {isProfitable ? <TrendingUp className="h-4 w-4 text-emerald-500"/> : <TrendingDown className="h-4 w-4 text-rose-500"/>}
          </div>
          <div className={`text-2xl font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
             {isProfitable ? '+' : '-'}₹{Math.abs(profitLoss).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Break-even: ₹{buyPrice.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" /> 
            AI Projected Movement {strategy === 'intraday' ? '(Next Session)' : '(7 Days)'}
          </h3>
          <div className="h-64 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(value) => `₹${value}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={buyPrice} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right',  value: 'Break Even', fill: '#94a3b8', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center italic">
            * Projection generated by AI based on technical patterns. Not financial advice.
          </p>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          <AdBanner variant="sidebar" />
          
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col h-full">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-purple-400" /> 
              Latest Market News
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {data.news && data.news.length > 0 ? (
                data.news.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-200 leading-tight">
                        {item.headline}
                      </h4>
                      {item.sentiment === 'positive' && <ArrowUpRight className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                      {item.sentiment === 'negative' && <ArrowDownRight className="h-4 w-4 text-rose-500 flex-shrink-0" />}
                      {item.sentiment === 'neutral' && <Minus className="h-4 w-4 text-slate-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.summary}</p>
                  </div>
                ))
              ) : (
                 <div className="text-center text-slate-500 py-8">
                   <p className="text-xs">No specific news headlines found.</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Text & Recommendation */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">✨</span> Gemini Market Analysis
          </h3>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-blue-200 prose-a:text-blue-400 border-b border-slate-800 pb-8 mb-4">
          <ReactMarkdown>{data.analysisText}</ReactMarkdown>
        </div>

        {/* The requested strong buy/sell recommendation at the bottom of the report */}
        {getRecommendationUI()}

        {data.sources.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-800/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Grounding Sources</p>
            <div className="flex flex-wrap gap-3">
              {data.sources.slice(0, 4).map((source, idx) => (
                <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-slate-950/50 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-blue-400 transition-all">
                  {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <button 
        onClick={onReset}
        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors border border-slate-700 flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" /> Analyze Another Stock
      </button>

    </div>
  );
};

export default AnalysisDashboard;