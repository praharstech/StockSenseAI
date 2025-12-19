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
  const currentPrice = data.currentPriceEstimate || buyPrice; 
  
  const totalInvestment = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const profitLoss = currentValue - totalInvestment;
  const profitLossPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

  const isProfitable = profitLoss >= 0;

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
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <AdBanner variant="horizontal" />

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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" /> 
            AI Projected Movement
          </h3>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={350} aspect={1.8}>
              <LineChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#64748b"
                  tick={{fill: '#64748b', fontSize: 10}}
                  tickFormatter={(value) => `₹${value}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={buyPrice} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1e293b', stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <AdBanner variant="sidebar" />
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col h-full">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-purple-400" /> Market Context
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {data.news?.map((item, idx) => (
                <div key={idx} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-200 leading-tight">{item.headline}</h4>
                  <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <span className="text-xl">✨</span> Gemini Market Analysis
        </h3>
        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-blue-200 prose-a:text-blue-400">
          <ReactMarkdown>{data.analysisText}</ReactMarkdown>
        </div>
        {getRecommendationUI()}
        {data.sources.length > 0 && (
          <div className="mt-8 pt-4 border-t border-slate-800/50">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sources</p>
            <div className="flex flex-wrap gap-2">
              {data.sources.slice(0, 3).map((source, idx) => (
                <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-blue-400">
                  {source.title.substring(0, 20)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

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