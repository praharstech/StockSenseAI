export interface StockData {
  symbol: string;
  buyPrice: number;
  quantity: number;
  strategy: 'intraday' | 'long-term';
}

export interface ChartDataPoint {
  label: string;
  price: number;
  type: 'historical' | 'forecast';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface StockQuote {
  currentPrice: number;
  suggestedBuy: number;
  suggestedSell: number;
  // Added sources for search grounding compliance
  sources?: GroundingSource[];
}

export interface AnalysisResult {
  analysisText: string;
  sources: GroundingSource[];
  chartData: ChartDataPoint[];
  currentPriceEstimate?: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  news: NewsItem[];
  recommendation?: {
    signal: 'STRONG_BUY' | 'STRONG_SELL' | 'NEUTRAL' | 'WAIT';
    price: number;
    reason: string;
  };
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  mobile: string;
  city: string;
  profession: string;
  joinedAt: number;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  email: string;
  action: 'LOGIN' | 'SEARCH_STOCK';
  details: string;
  location: UserLocation | null;
}

export interface ManualAd {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  link: string;
}

export interface ManualSuggestion {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  target: number;
  stopLoss: number;
  reason: string;
  timestamp: number;
  targetUserEmail?: string; // Optional: target a specific user
}